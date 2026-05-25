// app/api/auth/session/route.ts
import { adminAuth } from "@/lib/firebase-admin";
import { getTenantContext } from "@/app/server/auth-helpers";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/rbac";

const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days in seconds
const COOKIE_OPTS = {
  maxAge: SESSION_MAX_AGE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
};
export async function GET() {
  const context = await getTenantContext();
  return NextResponse.json(context ?? { role: null, userId: null });
}

export async function POST(request: Request) {
  const { idToken } = await request.json();

  try {
    // Verify the token first so we can extract the role before creating the session cookie
    const decoded = await adminAuth.verifyIdToken(idToken);
    const role: UserRole = (decoded.role as UserRole) || "user";

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const cookieStore = await cookies();

    // 1. Main session cookie (used by Firebase Admin to verify identity)
    cookieStore.set("session", sessionCookie, COOKIE_OPTS);

    // 2. Role cookie — HttpOnly, read by middleware for route-level RBAC.
    //    This is NOT the security source of truth; server-side isAdmin() / hasPermission()
    //    always re-verifies the session cookie. This only drives redirects in middleware.
    cookieStore.set("user-role", role, COOKIE_OPTS);

    return NextResponse.json({ status: "success", role });
  } catch (error) {
    console.error("[session POST]", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  cookieStore.delete("user-role");
  return NextResponse.json({ status: "success" });
}