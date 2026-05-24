import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const { pathname } = req.nextUrl;

  // 1. Maintenance Mode Check
  // Note: In a production environment, you would typically cache this in Redis 
  // to avoid a Firestore read on every single request.
  if (
    !pathname.startsWith("/api/config") && 
    !pathname.startsWith("/_next") && 
    !pathname.includes(".")
  ) {
  try {
    const configRes = await fetch(`${req.nextUrl.origin}/api/config`);
    const config = await configRes.json();

    if (config?.maintenanceMode && !pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
      // Only block non-admin routes. We assume admins can still access /admin
      // This requires the session check below to verify role eventually.
      return NextResponse.rewrite(new URL("/maintenance", req.url));
    }
  } catch (e) {
    // Fail open if config fetch fails to prevent lock-out
  }
  }

  // Paths that don't require authentication
  const isPublicPath = 
    pathname === "/" || 
    pathname.startsWith("/sign-in") || 
    pathname.startsWith("/sign-up") || 
    pathname.startsWith("/api/auth") || 
    pathname.startsWith("/api/webhooks");

  // Redirect logged-in users away from auth pages or landing page to the dashboard
  if (session && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If not a public path and no session exists, redirect to sign-in
  if (!isPublicPath && !session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Protect admin routes from users without a session
  if (pathname.startsWith("/admin") && !session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};