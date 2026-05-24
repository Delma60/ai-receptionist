import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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
    case "checkout.session.completed": {
      const tenantId = session.metadata.tenantId;
      await adminDb.collection("tenants").doc(tenantId).update({
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        plan: session.metadata.plan || "growth", // Fallback to growth if not specified
        updatedAt: FieldValue.serverTimestamp(),
      });
      break;
    }

    case "invoice.paid": {
      const tenantId = session.metadata?.tenantId;
      if (tenantId) {
        // Create the invoice record (Gap #7)
        await adminDb.collection("tenants").doc(tenantId).collection("invoices").add({
          amount: session.amount_paid / 100,
          status: "paid",
          invoiceNumber: session.number,
          stripeInvoiceId: session.id,
          createdAt: FieldValue.serverTimestamp(),
        });
        
        // Update Platform Metrics MRR (Gap #6)
        await adminDb.collection("platform").doc("metrics").update({
          mrr: FieldValue.increment(session.amount_paid / 100),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = await stripe.subscriptions.retrieve(session.id);
      const tenantId = subscription.metadata.tenantId;
      await adminDb.collection("tenants").doc(tenantId).update({
        plan: "starter",
        stripeSubscriptionId: null,
      });
      break;
    }
    
    case "invoice.payment_failed": {
       const tenantId = session.metadata?.tenantId;
       if (tenantId) {
         await adminDb.collection("tenants").doc(tenantId).collection("invoices").add({
           amount: session.amount_due / 100,
           status: "failed",
           createdAt: FieldValue.serverTimestamp(),
         });
       }
       break;
    }
  }

  return Response.json({ received: true });
}
