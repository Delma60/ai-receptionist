// app/api/billing/portal/route.ts
// POST — Create a Stripe Customer Portal session so a tenant can manage
//         their subscription, update payment method, or cancel.
// Returns: { url: string }

import { NextResponse } from "next/server";
import { getTenantContext } from "@/app/server/auth-helpers";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantSnap = await adminDb.collection("tenants").doc(ctx.tenantId).get();
  if (!tenantSnap.exists) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const tenant = tenantSnap.data()!;
  const stripeCustomerId: string | undefined = tenant.stripeCustomerId;

  if (!stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer found for this account. Please complete a checkout first.",
      },
      { status: 422 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}