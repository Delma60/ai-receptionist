// proxy.ts  (Next.js middleware — Edge Runtime)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hasRole, ROUTE_GUARDS, type UserRole } from "@/lib/rbac";

// ── Helpers ────────────────────────────────────────────────────────────

const PUBLIC_PATHS   = new Set(["/", "/sign-in", "/sign-up", "/maintenance", "/api/admin/set-role"]);
const SKIP_PREFIXES  = ["/_next", "/api/auth", "/api/webhooks", "/api/config", "/favicon"];

function isPublicPath(pathname: string): boolean {
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (/\.[a-z0-9]+$/i.test(pathname)) return true;
  return false;
}

function getRole(req: NextRequest): UserRole | null {
  const role = req.cookies.get("user-role")?.value;
  // Only accept known roles — never trust arbitrary cookie values for routing decisions.
  // The real enforcement still happens server-side in each route/API handler.
  if (role === "admin" || role === "support" || role === "user") return role;
  return null;
}

// ── Middleware ─────────────────────────────────────────────────────────

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session  = req.cookies.get("session")?.value;
  const userRole = getRole(req);

  // 1. Redirect authenticated users away from auth / landing pages
  if (session && (pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
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

  // 3. Role-based route guards (defined centrally in lib/rbac.ts)
  for (const guard of ROUTE_GUARDS) {
    if (guard.pattern.test(pathname)) {
      if (!hasRole(userRole, guard.requiredRole)) {
        if (guard.isApi || pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        // Redirect to dashboard instead of exposing that /admin exists
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      break; // First matching guard wins
    }
  }

  // 4. Maintenance mode — only for authenticated app routes, 2s hard timeout
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