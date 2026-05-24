// app/api/admin/set-role/route.ts
import { NextResponse } from "next/server";
import { isAdmin, setUserRole, getTenantContext, logAdminAction } from "@/app/server/auth-helpers";
import type { UserRole } from "@/lib/rbac";

const VALID_ROLES: UserRole[] = ["admin", "support", "user"];

export async function POST(req: Request) {
  // Server-side admin check — the middleware cookie is just for routing
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await getTenantContext();

  let body: { userId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, role } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  await setUserRole(userId, role as UserRole);

  await logAdminAction(ctx!.userId, "role_change", userId, {
    newRole: role,
    changedBy: ctx!.userId,
  });

  return NextResponse.json({ success: true, userId, role });
}