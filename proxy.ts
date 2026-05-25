// proxy.ts — Next.js edge middleware (all routing logic lives here)
//
// Fix 2 & 4: Role is now derived ONLY from the verified "session" cookie payload
// (a Firebase session cookie whose role claim is set at login time by the server).
// The plain-text "user-role" cookie is gone — it was trivially forgeable.
//
// How it works:
//   1. We decode — but do NOT cryptographically verify — the session cookie JWT in
//      the edge runtime (full verification needs firebase-admin which can't run at
//      the edge).  Decoding is safe for ROUTING because:
//      a) Every admin API route independently calls isAdmin() → getTenantContext()
//         which DOES call adminAuth.verifySessionCookie() with checkRevoked=true.
//      b) The admin layout server component also re-verifies and hard-redirects.
//      c) A tampered session cookie can at most see the admin UI shell — every
//         data fetch returns 403 from the real server-side checks.
//   2. If the session cookie is absent the user is unauthenticated → /sign-in.
//   3. Route guards use the decoded role claim from the session JWT payload.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROUTE_GUARDS, type PlatformRole } from "@/lib/rbac";

// ── Constants ──────────────────────────────────────────────────────────

const PUBLIC_PATHS = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/maintenance",
]);

const SKIP_PREFIXES = [
  "/_next",
  "/api/auth",
  "/api/webhooks",
  "/api/config",
  "/favicon",
];

// ── Helpers ────────────────────────────────────────────────────────────

function isPublicPath(pathname: string): boolean {
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (/\.[a-z0-9]+$/i.test(pathname)) return true;
  return false;
}

/**
 * Fix 2 & 4: Decode the Firebase session cookie JWT to extract the role claim
 * WITHOUT a cryptographic signature check (that can't run in the edge runtime).
 *
 * This is acceptable because:
 *   - A session cookie is a Google-signed JWT. Decoding only reads the payload;
 *     it does NOT validate the signature.
 *   - Any route that actually matters (admin API, admin layout) re-verifies the
 *     full signature server-side via adminAuth.verifySessionCookie().
 *   - An attacker who crafts a JWT with role:"admin" and no valid signature will
 *     pass the middleware redirect check but hit a hard 403 on every real request.
 *
 * This is strictly better than the old "user-role" plain-text cookie which required
 * zero JWT knowledge to forge.
 */
function decodeSessionRole(req: NextRequest): PlatformRole | null {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    // JWT is three base64url parts separated by dots
    const parts = sessionCookie.split(".");
    if (parts.length !== 3) return null;

    // Pad and decode the payload (middle part)
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload);
    const claims = JSON.parse(json);

    const role = claims?.role;
    if (role === "admin" || role === "support" || role === "user") {
      return role as PlatformRole;
    }
    return null;
  } catch {
    return null;
  }
}

const PLATFORM_HIERARCHY: Record<PlatformRole, number> = {
  admin: 3,
  support: 2,
  user: 1,
};

// ── Middleware ─────────────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("session")?.value;

  // 1. Redirect authenticated users away from auth / landing pages
  if (
    session &&
    (pathname === "/" ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 2. Unauthenticated users → sign-in (skip public paths)
  if (!isPublicPath(pathname) && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 3. Role-based route guards
  // Fix 2 & 4: decode role from the session JWT payload (not the plain-text cookie)
  const userRole = decodeSessionRole(req);

  for (const guard of ROUTE_GUARDS) {
    if (guard.pattern.test(pathname)) {
      const hasRequiredRole =
        userRole !== null &&
        PLATFORM_HIERARCHY[userRole] >= PLATFORM_HIERARCHY[guard.requiredRole];

      if (!hasRequiredRole) {
        if (guard.isApi || pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      break; // first matching guard wins
    }
  }

  // 4. Maintenance mode — only for authenticated app routes, 2 s hard timeout
  if (
    session &&
    !isPublicPath(pathname) &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/admin")
  ) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const configRes = await fetch(`${req.nextUrl.origin}/api/config`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (configRes.ok) {
        const config = await configRes.json();
        if (config?.maintenanceMode) {
          return NextResponse.rewrite(new URL("/maintenance", req.url));
        }
      }
    } catch {
      // Fail open — never block users because of a slow config fetch
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};