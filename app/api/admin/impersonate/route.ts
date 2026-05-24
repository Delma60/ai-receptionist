// app/api/admin/impersonate/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAdmin, getTenantContext, logAdminAction } from "@/app/server/auth-helpers";

export async function POST(req: Request) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await getTenantContext();
  const { tenantId } = await req.json();

  if (!tenantId || typeof tenantId !== "string") {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("impersonated_tenant_id", tenantId, {
    path: "/",
    maxAge: 60 * 60, // 1 hour
    httpOnly: false,  // client reads this to switch Firestore listeners
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  await logAdminAction(ctx!.userId, "impersonate", tenantId, {
    initiatedBy: ctx!.userId,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete("impersonated_tenant_id");

  return NextResponse.json({ success: true });
}