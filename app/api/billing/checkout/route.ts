// app/api/billing/checkout/route.ts
// POST — Create a checkout session for plan upgrades.
//         Reads the active payment provider from platform config and routes
//         to either Stripe Checkout or a Flutterwave payment link.
//
// Body: { plan: "starter" | "growth" | "pro" }
// Returns: { url: string }  (redirect the user to this URL)

import { NextResponse } from "next/server";
import { getTenantContext } from "@/app/server/auth-helpers";
import { adminDb } from "@/lib/firebase-admin";
import { getAppConfig } from "@/lib/app-config";
import { stripe } from "@/lib/stripe";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";

// ── Plan catalogue ────────────────────────────────────────────────────────────
// Map plan slugs → Stripe Price IDs (set in .env.local) and Flutterwave amounts.

const PLAN_CATALOGUE = {
  starter: {
    label: "Starter",
    amount: 49,
    currency: "USD",
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  growth: {
    label: "Growth",
    amount: 149,
    currency: "USD",
    stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID,
  },
  pro: {
    label: "Pro",
    amount: 349,
    currency: "USD",
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
} as const;

type PlanKey = keyof typeof PLAN_CATALOGUE;

// ── POST /api/billing/checkout ────────────────────────────────────────────────

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = body.plan as PlanKey | undefined;
  if (!plan || !(plan in PLAN_CATALOGUE)) {
    return NextResponse.json(
      { error: "Invalid plan. Must be one of: starter, growth, pro." },
      { status: 422 }
    );
  }

  // Fetch tenant details needed for checkout metadata.
  const tenantSnap = await adminDb.collection("tenants").doc(ctx.tenantId).get();
  if (!tenantSnap.exists) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  const tenant = tenantSnap.data()!;
  const planMeta = PLAN_CATALOGUE[plan];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Read the active payment provider from the platform config doc.
  const appConfig = await getAppConfig();

  // ── Branch: Stripe ────────────────────────────────────────────────────────
  if (appConfig.paymentProvider === "stripe") {
    if (!planMeta.stripePriceId) {
      return NextResponse.json(
        {
          error: `Stripe price ID for "${plan}" is not configured. Set STRIPE_${plan.toUpperCase()}_PRICE_ID in .env.local.`,
        },
        { status: 503 }
      );
    }

    // Reuse an existing Stripe customer when the tenant already has one.
    const customerId: string | undefined = tenant.stripeCustomerId || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : tenant.email,
      payment_method_types: ["card"],
      line_items: [{ price: planMeta.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/settings?checkout=success&plan=${plan}`,
      cancel_url: `${appUrl}/settings?checkout=cancelled`,
      metadata: {
        tenantId: ctx.tenantId,
        plan,
      },
      subscription_data: {
        metadata: { tenantId: ctx.tenantId, plan },
      },
      // Pre-fill billing email.
      ...(tenant.email && !customerId ? { customer_email: tenant.email } : {}),
    });

    return NextResponse.json({ url: session.url });
  }

  // ── Branch: Flutterwave ───────────────────────────────────────────────────
  if (appConfig.paymentProvider === "flutterwave") {
    // Generate a unique transaction reference.
    const txRef = `rcptly-${ctx.tenantId.slice(0, 8)}-${plan}-${Date.now()}`;

    const flwResponse = await createFlutterwavePaymentLink({
      tx_ref: txRef,
      amount: planMeta.amount,
      currency: planMeta.currency,
      redirect_url: `${appUrl}/api/billing/flutterwave-callback`,
      customer: {
        email: tenant.email,
        name: tenant.name,
      },
      meta: {
        tenantId: ctx.tenantId,
        plan,
      },
    });

    if (!flwResponse?.data?.link) {
      console.error("[billing/checkout] Flutterwave response:", flwResponse);
      return NextResponse.json(
        { error: "Flutterwave did not return a payment link." },
        { status: 502 }
      );
    }

    // Store the tx_ref so the callback can verify payment.
    await adminDb.collection("tenants").doc(ctx.tenantId).set(
      {
        pendingFlwTxRef: txRef,
        pendingFlwPlan: plan,
      },
      { merge: true }
    );

    return NextResponse.json({ url: flwResponse.data.link });
  }

  return NextResponse.json(
    { error: "No payment provider configured." },
    { status: 503 }
  );
}