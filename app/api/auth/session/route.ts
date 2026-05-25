// app/api/auth/session/route.ts
//
// Fix 2 & 4: The role claim is now stored in the Firebase custom claims BEFORE
// the session cookie is minted so that the session JWT payload itself carries
// the "role" field.  The edge middleware decodes (not verifies) this payload to
// make routing decisions — all actual data access is re-verified server-side.
//
// Fix: We also delete the legacy plain-text "user-role" cookie on DELETE so there
// are no leftover forgeable cookies in the browser.

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
    // 1. Verify the ID token and read the current role claim.
    const decoded = await adminAuth.verifyIdToken(idToken);
    const role: UserRole = (decoded.role as UserRole) || "user";

    // 2. Ensure the custom claim is set on the Firebase user so that the
    //    session cookie JWT payload will contain it.  setCustomUserClaims is
    //    idempotent — if the claim is already correct this is a no-op.
    const existingClaims = (await adminAuth.getUser(decoded.uid)).customClaims ?? {};
    if (existingClaims.role !== role) {
      await adminAuth.setCustomUserClaims(decoded.uid, {
        ...existingClaims,
        role,
      });
    }

    // 3. Mint the session cookie.  Google signs this JWT and includes custom
    //    claims (including "role") in the payload, which the edge middleware
    //    can safely decode for routing decisions.
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const cookieStore = await cookies();

    // Main session cookie — httpOnly, used by Firebase Admin for verification.
    cookieStore.set("session", sessionCookie, COOKIE_OPTS);

    // Fix 2 & 4: remove the legacy plain-text "user-role" cookie.
    // The middleware now reads the role from the session JWT payload instead.
    cookieStore.delete("user-role");

    return NextResponse.json({ status: "success", role });
  } catch (error) {
    console.error("[session POST]", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  // Fix 2 & 4: also clear the legacy cookie if it still exists in old sessions.
  cookieStore.delete("user-role");
  return NextResponse.json({ status: "success" });
}