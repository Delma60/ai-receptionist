// app/api/admin/tenants/[id]/route.ts
// PATCH  — update a tenant's plan, status, or limits
// DELETE — permanently remove a tenant and log the action

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isAdmin, getTenantContext, logAdminAction } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";

// ── PATCH /api/admin/tenants/[id] ────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = params.id;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only allow plan changes through this endpoint
  if (!body.plan || !body.priceId) {
    return NextResponse.json({ error: "Missing plan or priceId" }, { status: 400 });
  }

  // Fetch tenant to get Stripe IDs
  const tenantSnap = await adminDb.collection("tenants").doc(tenantId).get();
  if (!tenantSnap.exists) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const tenant = tenantSnap.data();
  if (!tenant.stripeCustomerId || !tenant.stripeSubscriptionId) {
    return NextResponse.json({ error: "Tenant missing Stripe info" }, { status: 400 });
  }

  // Update Stripe subscription
  try {
    const updatedSub = await stripe.subscriptions.update(
      tenant.stripeSubscriptionId,
      {
        items: [{ id: (await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId)).items.data[0].id, price: body.priceId }],
        proration_behavior: "create_prorations",
        metadata: { tenantId, plan: body.plan },
      }
    );

    // Update Firestore to mirror Stripe
    await adminDb.collection("tenants").doc(tenantId).update({
      plan: body.plan,
      stripeSubscriptionId: updatedSub.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const ctx = await getTenantContext();
    await logAdminAction(ctx?.userId ?? "unknown", "plan_change", tenantId, {
      changes: { plan: body.plan, priceId: body.priceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH tenant plan]", error);
    return NextResponse.json({ error: "Failed to update Stripe subscription" }, { status: 500 });
  }
}

// ── DELETE /api/admin/tenants/[id] ───────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = params.id;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  try {
    // Delete top-level tenant document.
    await adminDb.collection("tenants").doc(tenantId).delete();

    const ctx = await getTenantContext();
    await logAdminAction(ctx?.userId ?? "unknown", "tenant_delete", tenantId, {
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE tenant]", error);
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}