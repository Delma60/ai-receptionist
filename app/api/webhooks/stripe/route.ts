// app/api/webhooks/stripe/route.ts
//
// All mutating paths use Firestore transactions or set(..., {merge:true}) with
// an idempotency key so replayed or duplicate Stripe events never create
// duplicate invoices or overwrite billing state with stale data.

import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Single source of truth — mirrors PLAN_LIMITS in types/index.ts
const PLAN_LIMITS: Record<string, { minutesLimit: number; price: number }> = {
  starter: { minutesLimit: 100,  price: 49  },
  growth:  { minutesLimit: 500,  price: 149 },
  pro:     { minutesLimit: 2000, price: 349 },
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  // Every processed Stripe event ID is recorded in /processedEvents/{eventId}.
  // If it already exists we return 200 immediately (Stripe will stop retrying).
  const eventRef = adminDb.collection("processedEvents").doc(event.id);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef);
      if (snap.exists) {
        // Signal to the outer catch that this is a known-duplicate, not an error
        throw new Error("DUPLICATE_EVENT");
      }
      // Reserve the slot immediately so concurrent retries lose the race
      tx.set(eventRef, {
        type: event.type,
        processedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err: any) {
    if (err.message === "DUPLICATE_EVENT") {
      // Already processed — tell Stripe we received it
      return Response.json({ received: true, duplicate: true });
    }
    // Real Firestore error — let Stripe retry
    console.error("[stripe webhook] idempotency check failed:", err);
    return new Response("Internal error", { status: 500 });
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  const session = event.data.object as any;

  try {
    switch (event.type) {
      // ── New subscription / plan upgrade ──────────────────────────────────
      case "checkout.session.completed": {
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) break;

        const plan = (session.metadata?.plan as string) || "growth";
        const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.growth;

        await adminDb.collection("tenants").doc(tenantId).update({
          stripeCustomerId:     session.customer,
          stripeSubscriptionId: session.subscription,
          plan,
          minutesLimit:         limits.minutesLimit,
          updatedAt:            FieldValue.serverTimestamp(),
        });
        break;
      }

      // ── Successful recurring charge → log invoice ─────────────────────────
      case "invoice.paid": {
        const tenantId = session.metadata?.tenantId;
        if (!tenantId || !session.id) break;

        // Use the Stripe invoice ID as the Firestore document ID so a second
        // delivery of the same event is a no-op (set with merge writes the
        // same data again harmlessly).
        const invoiceDocId = `stripe_${session.id}`;

        await adminDb
          .collection("tenants")
          .doc(tenantId)
          .collection("invoices")
          .doc(invoiceDocId)
          .set(
            {
              amount:          session.amount_paid / 100,
              status:          "paid",
              invoiceNumber:   session.number ?? invoiceDocId,
              stripeInvoiceId: session.id,
              provider:        "stripe",
              createdAt:       FieldValue.serverTimestamp(),
            },
            { merge: true }  // safe to replay — same data every time
          );

        // Platform MRR is an increment, which is idempotent relative to our
        // processedEvents guard at the top of this handler.
        await adminDb
          .collection("platform")
          .doc("metrics")
          .set(
            {
              mrr:       FieldValue.increment(session.amount_paid / 100),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        break;
      }

      // ── Subscription cancelled → downgrade to starter ─────────────────────
      case "customer.subscription.deleted": {
        const subscription = await stripe.subscriptions.retrieve(session.id);
        const tenantId = subscription.metadata?.tenantId;
        if (!tenantId) break;

        const starterLimits = PLAN_LIMITS.starter;
        await adminDb.collection("tenants").doc(tenantId).update({
          plan:                 "starter",
          minutesLimit:         starterLimits.minutesLimit,
          stripeSubscriptionId: null,
          updatedAt:            FieldValue.serverTimestamp(),
        });
        break;
      }

      // ── Failed payment → log failed invoice ───────────────────────────────
      case "invoice.payment_failed": {
        const tenantId = session.metadata?.tenantId;
        if (!tenantId || !session.id) break;

        const invoiceDocId = `stripe_failed_${session.id}`;
        await adminDb
          .collection("tenants")
          .doc(tenantId)
          .collection("invoices")
          .doc(invoiceDocId)
          .set(
            {
              amount:          session.amount_due / 100,
              status:          "failed",
              stripeInvoiceId: session.id,
              provider:        "stripe",
              createdAt:       FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        break;
      }
    }
  } catch (handlerErr) {
    // If the business logic fails after we've already reserved the event ID,
    // delete the reservation so Stripe can retry successfully.
    console.error("[stripe webhook] handler error:", handlerErr);
    await eventRef.delete().catch(() => {});
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}