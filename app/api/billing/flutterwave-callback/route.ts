// app/api/billing/flutterwave-callback/route.ts
// Flutterwave redirects the user's browser here after checkout completes.
// We verify the payment server-side, activate the plan, then redirect to /settings.
//
// URL params Flutterwave appends:
//   ?status=successful&tx_ref=rcptly-xxx&transaction_id=12345

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const PLAN_LIMITS: Record<string, { minutesLimit: number; price: number }> = {
  starter: { minutesLimit: 100,  price: 49  },
  growth:  { minutesLimit: 500,  price: 149 },
  pro:     { minutesLimit: 2000, price: 349 },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status        = searchParams.get("status");
  const txRef         = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");
  const appUrl        = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (status !== "successful" || !txRef || !transactionId) {
    return NextResponse.redirect(
      `${appUrl}/settings?checkout=cancelled`
    );
  }

  // Find the tenant by the pending tx_ref we stored during checkout creation.
  const tenantsSnap = await adminDb
    .collection("tenants")
    .where("pendingFlwTxRef", "==", txRef)
    .limit(1)
    .get();

  if (tenantsSnap.empty) {
    // Could be a duplicate redirect or an already-processed tx.
    return NextResponse.redirect(`${appUrl}/settings?checkout=already_processed`);
  }

  const tenantDoc  = tenantsSnap.docs[0];
  const tenantData = tenantDoc.data();
  const plan       = tenantData.pendingFlwPlan as string;

  if (!plan || !(plan in PLAN_LIMITS)) {
    return NextResponse.redirect(`${appUrl}/settings?checkout=error`);
  }

  // Verify with Flutterwave before activating.
  try {
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
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
      return NextResponse.redirect(`${appUrl}/settings?checkout=failed`);
    }
  } catch {
    // If the verify call fails (network error), fail safe and tell the user.
    return NextResponse.redirect(`${appUrl}/settings?checkout=verify_error`);
  }

  const limits = PLAN_LIMITS[plan];

  // Activate the plan. The webhook (if it fires) will be a no-op because
  // pendingFlwTxRef will already be cleared.
  await adminDb.collection("tenants").doc(tenantDoc.id).set(
    {
      plan,
      minutesLimit: limits.minutesLimit,
      pendingFlwTxRef: FieldValue.delete(),
      pendingFlwPlan: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Create invoice record (idempotent — webhook may also create one).
  const existingInvoice = await adminDb
    .collection("tenants")
    .doc(tenantDoc.id)
    .collection("invoices")
    .where("invoiceNumber", "==", txRef)
    .limit(1)
    .get();

  if (existingInvoice.empty) {
    await adminDb
      .collection("tenants")
      .doc(tenantDoc.id)
      .collection("invoices")
      .add({
        amount: limits.price,
        status: "paid",
        invoiceNumber: txRef,
        flwTransactionId: transactionId,
        provider: "flutterwave",
        plan,
        createdAt: FieldValue.serverTimestamp(),
      });
  }

  return NextResponse.redirect(
    `${appUrl}/settings?checkout=success&plan=${plan}`
  );
}