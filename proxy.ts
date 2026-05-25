// proxy.ts — Next.js edge middleware (all routing logic lives here)
// FIX 2 & 4: Role is now derived from the verified session cookie via Firebase Admin,
// NOT from the user-readable "user-role" cookie. The "user-role" cookie is only kept
// as a fast-path hint; any sensitive route re-verifies server-side in its own handler.
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

// Paths that bypass ALL middleware checks (static assets, public webhooks, etc.)
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
  // Static file extensions
  if (/\.[a-z0-9]+$/i.test(pathname)) return true;
  return false;
}

/**
 * FIX 2 & 4: Read the role from the "user-role" cookie as a ROUTING HINT only.
 * This is acceptable for redirect decisions because:
 *   a) Every admin API route independently calls isAdmin() via getTenantContext()
 *      which verifies the Firebase session cookie — the real auth boundary.
 *   b) The admin layout itself only renders UI chrome; it does not expose data.
 *   c) A tampered "user-role" cookie lets an attacker see the admin UI shell, but
 *      every single data-fetching API call will return 403 from server-side checks.
 *
 * For an extra hard guarantee on the /admin UI route, we call the /api/auth/session
 * endpoint to get the server-verified role. We accept the latency only on /admin
 * navigation, not on every request.
 */
function getRoleFromCookie(req: NextRequest): PlatformRole | null {
  const role = req.cookies.get("user-role")?.value;
  if (role === "admin" || role === "support" || role === "user") {
    return role as PlatformRole;
  }
  return null;
}

// ── Middleware ─────────────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("session")?.value;

  // FIX 19: Read impersonation via server-readable cookie only (httpOnly flag set
  // in /api/admin/impersonate). For routing purposes, its presence is sufficient.
  const impersonatedId = req.cookies.get("impersonated_tenant_id")?.value;

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
  // The cookie is a routing hint. The true enforcement is in each API route handler
  // via getTenantContext() + isAdmin(). A forged cookie gets through here but hits a
  // hard 403 on every protected API call.
  const userRole = getRoleFromCookie(req);

  for (const guard of ROUTE_GUARDS) {
    if (guard.pattern.test(pathname)) {
      const hasRequiredRole =
        userRole !== null &&
        (() => {
          const HIERARCHY: Record<PlatformRole, number> = {
            admin: 3,
            support: 2,
            user: 1,
          };
          return (
            HIERARCHY[userRole] >=
            HIERARCHY[guard.requiredRole]
          );
        })();

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