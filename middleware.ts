import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define matchers for route groups
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)", // Ensure Vapi, Twilio, and Stripe webhooks are public
]);

export default clerkMiddleware((auth, req) => {
  // 1. Authorization: Admin Role Check
  if (isAdminRoute(req)) {
    const { sessionClaims } = auth();
    // Check for the admin role in the Clerk JWT template metadata
    if (sessionClaims?.metadata?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 2. Authentication: Protect non-public routes
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  // Standard matcher for Next.js middleware to exclude static assets
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};