import { NextResponse } from "next/server";
import type { NextRequest } from 'next/request';

export default function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const { pathname } = req.nextUrl;

  // Paths that don't require authentication
  const isPublicPath = 
    pathname === "/" || 
    pathname.startsWith("/sign-in") || 
    pathname.startsWith("/sign-up") || 
    pathname.startsWith("/api/webhooks");

  // If not a public path and no session exists, redirect to sign-in
  if (!isPublicPath && !session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Redirect logged-in users away from auth pages to the dashboard
  if (session && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};