// app/api/admin/impersonate/route.ts
// FIX 19: The impersonated_tenant_id cookie is now set as httpOnly=true.
// The client-side dashboard layout previously read this cookie directly via
// document.cookie to switch its Firestore listeners. That pattern is replaced:
// the layout now calls GET /api/admin/impersonate to learn the impersonated ID,
// and the server reads the httpOnly cookie securely.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  isAdmin,
  getTenantContext,
  logAdminAction,
} from "@/app/server/auth-helpers";

// ── GET — return the currently impersonated tenant ID (server-read of httpOnly cookie)
export async function GET() {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const tenantId = cookieStore.get("impersonated_tenant_id")?.value ?? null;
  return NextResponse.json({ tenantId });
}

// ── POST — start impersonating a tenant
export async function POST(req: Request) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await getTenantContext();
  const { tenantId } = await req.json();

  if (!tenantId || typeof tenantId !== "string") {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();

  // FIX 19: httpOnly=true prevents JavaScript from reading or forging this cookie.
  // The dashboard layout must call GET /api/admin/impersonate instead of reading
  // document.cookie to discover the active impersonation.
  cookieStore.set("impersonated_tenant_id", tenantId, {
    path: "/",
    maxAge: 60 * 60, // 1 hour
    httpOnly: true,   // FIX 19: was false — JS-readable is a security risk
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  await logAdminAction(ctx!.userId, "impersonate", tenantId, {
    initiatedBy: ctx!.userId,
  });

  return NextResponse.json({ success: true });
}

// ── DELETE — end impersonation session
export async function DELETE() {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete("impersonated_tenant_id");

  return NextResponse.json({ success: true });
}