// app/api/admin/tenants/[id]/route.ts
// PATCH  — update a tenant's plan, status, or limits
// DELETE — permanently remove a tenant and log the action

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isAdmin, getTenantContext, logAdminAction } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Allowlist of fields an admin can update directly.
  const allowed = ["plan", "minutesLimit", "name", "email", "isActive"];
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    await adminDb.collection("tenants").doc(tenantId).update(update);

    const ctx = await getTenantContext();
    await logAdminAction(ctx?.userId ?? "unknown", "plan_change", tenantId, {
      changes: update,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH tenant]", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
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