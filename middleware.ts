import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const { pathname } = req.nextUrl;

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