// app/api/admin/billing/overage/route.ts
//
// POST /api/admin/billing/overage
// Body: { tenantId: string }
//
// Calculates the overage cost for a tenant, creates a Stripe invoice item,
// generates + finalises the invoice, resets minutesUsed to the plan limit,
// and writes an audit log entry.
//
// Auth: Firebase session cookie — isAdmin() guard via auth-helpers.
// Previously used @clerk/nextjs/server which is not installed in this project.

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { isAdmin, getTenantContext, logAdminAction } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await getTenantContext();

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { tenantId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tenantId } = body;
  if (!tenantId || typeof tenantId !== "string") {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  // ── Fetch tenant ──────────────────────────────────────────────────────────
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();

  if (!tenantSnap.exists) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const tenant = tenantSnap.data()!;

  // ── Fetch dynamic overage rate from platform config ───────────────────────
  const configSnap = await adminDb.collection("platform").doc("config").get();
  const rate: number = configSnap.data()?.overageRate ?? 0.08;

  // ── Calculate overage ─────────────────────────────────────────────────────
  const minutesUsed: number = tenant.minutesUsed ?? 0;
  const minutesLimit: number = tenant.minutesLimit ?? 0;
  const overage = minutesUsed - minutesLimit;

  if (overage <= 0) {
    return NextResponse.json(
      { error: "No overage to bill for this tenant." },
      { status: 400 }
    );
  }

  // ── Stripe customer check ─────────────────────────────────────────────────
  if (!tenant.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "Tenant has no Stripe customer ID. They must complete a checkout first.",
      },
      { status: 422 }
    );
  }

  // ── Create Stripe invoice item ─────────────────────────────────────────────
  const amountInCents = Math.round(overage * rate * 100);

  await stripe.invoiceItems.create({
    customer: tenant.stripeCustomerId,
    amount: amountInCents,
    currency: "usd",
    description: `Usage overage: ${overage.toLocaleString()} min × $${rate.toFixed(2)}/min`,
  });

  // ── Create + finalise invoice ─────────────────────────────────────────────
  const invoice = await stripe.invoices.create({
    customer: tenant.stripeCustomerId,
    auto_advance: false, // We finalise manually below
    metadata: { tenantId, type: "overage", overageMinutes: String(overage) },
  });

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

  // ── Reset usage counter to the plan limit ─────────────────────────────────
  await tenantRef.update({
    minutesUsed: minutesLimit,
    lastOverageBilledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // ── Record invoice in Firestore ───────────────────────────────────────────
  await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("invoices")
    .add({
      amount: overage * rate,
      status: finalizedInvoice.status ?? "open",
      invoiceNumber: finalizedInvoice.number ?? finalizedInvoice.id,
      stripeInvoiceId: finalizedInvoice.id,
      provider: "stripe",
      type: "overage",
      overageMinutes: overage,
      createdAt: FieldValue.serverTimestamp(),
    });

  // ── Audit log ─────────────────────────────────────────────────────────────
  await logAdminAction(
    ctx?.userId ?? "unknown",
    "plan_change", // closest existing action type
    tenantId,
    {
      action: "overage_billed",
      invoiceId: finalizedInvoice.id,
      overageMinutes: overage,
      amountUsd: overage * rate,
      rate,
    }
  );

  return NextResponse.json({
    success: true,
    invoiceId: finalizedInvoice.id,
    overageMinutes: overage,
    amountUsd: overage * rate,
  });
}