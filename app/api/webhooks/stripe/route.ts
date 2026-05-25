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

  const session = event.data.object as any;

  switch (event.type) {
    // ── New subscription / plan upgrade ────────────────────────────────
    case "checkout.session.completed": {
      const tenantId = session.metadata?.tenantId;
      if (!tenantId) break;

      const plan = (session.metadata?.plan as string) || "growth";
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.growth;

      // FIX 11: Write minutesLimit accurately from the plan catalogue
      await adminDb.collection("tenants").doc(tenantId).update({
        stripeCustomerId:      session.customer,
        stripeSubscriptionId:  session.subscription,
        plan,
        minutesLimit:          limits.minutesLimit,
        updatedAt:             FieldValue.serverTimestamp(),
      });
      break;
    }

    // ── Successful recurring charge → log invoice ──────────────────────
    case "invoice.paid": {
      const tenantId = session.metadata?.tenantId;
      if (!tenantId) break;

      await adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("invoices")
        .add({
          amount:          session.amount_paid / 100,
          status:          "paid",
          invoiceNumber:   session.number,
          stripeInvoiceId: session.id,
          createdAt:       FieldValue.serverTimestamp(),
        });

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

    // ── Subscription cancelled → downgrade to starter ─────────────────
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

    // ── Failed payment → log failed invoice ───────────────────────────
    case "invoice.payment_failed": {
      const tenantId = session.metadata?.tenantId;
      if (!tenantId) break;

      await adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("invoices")
        .add({
          amount:    session.amount_due / 100,
          status:    "failed",
          createdAt: FieldValue.serverTimestamp(),
        });
      break;
    }
  }

  return Response.json({ received: true });
}