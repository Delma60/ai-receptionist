import { NextResponse } from "next/server";
import { isAdmin, logAdminAction, getTenantContext } from "@/app/server/auth-helpers";
import { adminDb } from "@/lib/firebase-admin";

// PATCH: Update a custom role
export async function PATCH(req: Request, { params }: { params: { roleId: string } }) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { name, description, permissions } = body;
  if (!name && !description && !permissions) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  const update: any = {};
  if (name) update.name = name;
  if (description) update.description = description;
  if (permissions) update.permissions = permissions;
  await adminDb.collection("platform").doc("roles").collection("custom").doc(params.roleId).update(update);
  await logAdminAction((await getTenantContext())?.userId || "", "role_update", "platform", { roleId: params.roleId });
  return NextResponse.json({ success: true });
}

// DELETE: Delete a custom role
export async function DELETE(req: Request, { params }: { params: { roleId: string } }) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await adminDb.collection("platform").doc("roles").collection("custom").doc(params.roleId).delete();
  await logAdminAction((await getTenantContext())?.userId || "", "role_delete", "platform", { roleId: params.roleId });
  return NextResponse.json({ success: true });
}
