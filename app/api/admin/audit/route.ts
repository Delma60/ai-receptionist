// app/api/admin/audit/route.ts
// POST  — write an immutable audit log entry (called by admin UI actions)
// DELETE is intentionally NOT on this route; tenant deletion lives at
//   /api/admin/tenants/[id]/route.ts  (to be created separately)

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isAdmin, getTenantContext } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  // All audit writes must come from an authenticated admin.
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    adminId?: string;
    action?: string;
    targetTenantId?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ctx = await getTenantContext();
  const { action, targetTenantId, metadata } = body;

  if (!action || !targetTenantId) {
    return NextResponse.json(
      { error: "action and targetTenantId are required" },
      { status: 400 }
    );
  }

  try {
    const ref = await adminDb.collection("auditLog").add({
      adminId: ctx?.userId ?? body.adminId ?? "unknown",
      action,
      targetTenantId,
      metadata: metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    console.error("[audit POST]", error);
    return NextResponse.json(
      { error: "Failed to write audit log" },
      { status: 500 }
    );
  }
}