// app/api/webhooks/flutterwave/route.ts
//
// Uses the same /processedEvents/{eventId} idempotency pattern as the Stripe
// webhook. The Flutterwave event ID is `data.id` (the transaction ID).
// A Firestore transaction reserves the slot before any state is written so
// concurrent retries of the same webhook never produce duplicate invoices.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// ── Plan → minute limit map ───────────────────────────────────────────────────
const PLAN_LIMITS: Record<string, { minutesLimit: number; price: number }> = {
  starter: { minutesLimit: 100,  price: 49  },
  growth:  { minutesLimit: 500,  price: 149 },
  pro:     { minutesLimit: 2000, price: 349 },
};

// ── Signature verification ────────────────────────────────────────────────────
function verifyFlutterwaveSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev when secret is not configured

  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    // Buffers differ in length — signature is invalid
    return false;
  }
}

// ── POST /api/webhooks/flutterwave ────────────────────────────────────────────
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash");

  if (!verifyFlutterwaveSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType: string = event.event || "";
  const data = event.data || {};

  // Only process successful charges
  if (
    eventType !== "charge.completed" ||
    data.status?.toLowerCase() !== "successful"
  ) {
    return NextResponse.json({ received: true });
  }

  const txId: string = String(data.id || "");
  const txRef: string = data.tx_ref || "";
  const plan: string  = data.meta?.plan || "";
  const tenantId: string = data.meta?.tenantId || "";

  if (!txId || !tenantId || !plan || !(plan in PLAN_LIMITS)) {
    console.warn("[flutterwave webhook] Missing or invalid metadata:", { tenantId, plan, txRef });
    return NextResponse.json({ received: true });
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  // Use the Flutterwave transaction ID as the idempotency key.
  const eventDocId = `flw_${txId}`;
  const eventRef = adminDb.collection("processedEvents").doc(eventDocId);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef);
      if (snap.exists) {
        throw new Error("DUPLICATE_EVENT");
      }
      tx.set(eventRef, {
        type:        eventType,
        txRef,
        tenantId,
        processedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err: any) {
    if (err.message === "DUPLICATE_EVENT") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[flutterwave webhook] idempotency check failed:", err);
    return new Response("Internal error", { status: 500 });
  }

  // ── Verify with Flutterwave before activating ────────────────────────────
  try {
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${txId}/verify`,
      {
        headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
      }
    );
    const verifyData = await verifyRes.json();

    if (
      verifyData.status !== "success" ||
      verifyData.data?.status !== "successful" ||
      verifyData.data?.tx_ref !== txRef
    ) {
      console.warn("[flutterwave webhook] Verification failed:", verifyData);
      // Delete the reservation so this can be retried if Flutterwave fixes it
      await eventRef.delete().catch(() => {});
      return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("[flutterwave webhook] Verify API error:", err);
    // Fail open for network errors — the reservation stays so we don't double-process
  }

  const limits = PLAN_LIMITS[plan];

  // ── Write plan activation and invoice atomically ─────────────────────────
  // Both writes happen in a batch so a partial failure leaves no orphaned state.
  try {
    const batch = adminDb.batch();

    // 1. Activate the plan on the tenant
    const tenantRef = adminDb.collection("tenants").doc(tenantId);
    batch.set(
      tenantRef,
      {
        plan,
        minutesLimit:    limits.minutesLimit,
        flwCustomerId:   data.customer?.id?.toString() || null,
        pendingFlwTxRef: FieldValue.delete(),
        pendingFlwPlan:  FieldValue.delete(),
        updatedAt:       FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Create the invoice — use txRef as doc ID for idempotency
    const invoiceRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("invoices")
      .doc(`flw_${txRef}`);

    batch.set(
      invoiceRef,
      {
        amount:           limits.price,
        status:           "paid",
        invoiceNumber:    txRef,
        flwTransactionId: txId,
        provider:         "flutterwave",
        plan,
        createdAt:        FieldValue.serverTimestamp(),
      },
      { merge: true }  // safe to replay
    );

    // 3. Platform MRR
    const metricsRef = adminDb.collection("platform").doc("metrics");
    batch.set(
      metricsRef,
      {
        mrr:       FieldValue.increment(limits.price),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
  } catch (handlerErr) {
    console.error("[flutterwave webhook] write error:", handlerErr);
    // Remove the idempotency reservation so Flutterwave can retry
    await eventRef.delete().catch(() => {});
    return new Response("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}