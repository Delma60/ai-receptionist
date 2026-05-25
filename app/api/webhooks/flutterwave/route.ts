// app/api/webhooks/flutterwave/route.ts
// Handles two kinds of Flutterwave traffic:
//
//   POST /api/webhooks/flutterwave
//     — Server-to-server webhook. Flutterwave pushes payment events here.
//       We verify the signature and update Firestore on successful charge.
//
// The redirect callback (GET /api/billing/flutterwave-callback) is in a
// sibling file because it is a browser redirect, not a webhook.

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

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
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

  // Flutterwave sends a flat object with an "event" key.
  const eventType: string = event.event || "";
  const data = event.data || {};

  // We only care about successful charges.
  if (
    eventType !== "charge.completed" ||
    data.status?.toLowerCase() !== "successful"
  ) {
    return NextResponse.json({ received: true });
  }

  const txRef: string = data.tx_ref || "";
  const plan: string = data.meta?.plan || "";
  const tenantId: string = data.meta?.tenantId || "";

  if (!tenantId || !plan || !(plan in PLAN_LIMITS)) {
    console.warn("[flutterwave webhook] Missing or invalid metadata:", {
      tenantId,
      plan,
      txRef,
    });
    return NextResponse.json({ received: true });
  }

  // Verify the transaction with Flutterwave's verify API to prevent replay attacks.
  try {
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${data.id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );
    const verifyData = await verifyRes.json();

    if (
      verifyData.status !== "success" ||
      verifyData.data?.status !== "successful" ||
      verifyData.data?.tx_ref !== txRef
    ) {
      console.warn("[flutterwave webhook] Verification failed:", verifyData);
      return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("[flutterwave webhook] Verify API error:", err);
    // Fail open — don't block the webhook, but log it.
  }

  const limits = PLAN_LIMITS[plan];

  // Update the tenant's plan and clear the pending tx_ref.
  await adminDb.collection("tenants").doc(tenantId).set(
    {
      plan,
      minutesLimit: limits.minutesLimit,
      flwCustomerId: data.customer?.id?.toString() || null,
      pendingFlwTxRef: FieldValue.delete(),
      pendingFlwPlan: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Create an invoice record for the billing history table.
  await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("invoices")
    .add({
      amount: limits.price,
      status: "paid",
      invoiceNumber: txRef,
      flwTransactionId: data.id?.toString(),
      provider: "flutterwave",
      plan,
      createdAt: FieldValue.serverTimestamp(),
    });

  // Update platform MRR metrics.
  await adminDb
    .collection("platform")
    .doc("metrics")
    .set(
      {
        mrr: FieldValue.increment(limits.price),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return NextResponse.json({ received: true });
}