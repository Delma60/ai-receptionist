import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAdmin } from "@/auth"; 

export async function POST(req: Request) {
  try {
    // 1. Verify the requester's admin status
    const hasAdminRights = await isAdmin();
    
    if (!hasAdminRights) {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can impersonate tenants." }, 
        { status: 403 }
      );
    }

    const { tenantId } = await req.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required." }, 
        { status: 400 }
      );
    }

    // 2. Await the cookies() instance (recommended for Next.js 14+/15)
    const cookieStore = await cookies();
    
    cookieStore.set("impersonated_tenant_id", tenantId, {
      path: "/",
      maxAge: 60 * 60, // 1 hour session
      httpOnly: false, // Frontend reads this to switch Firestore listeners
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Impersonation error:", error);
    return NextResponse.json({ error: "Failed to set impersonation" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // It's good practice to ensure only admins can manage this route entirely,
    // though clearing the cookie is inherently less risky.
    const hasAdminRights = await isAdmin();
    
    if (!hasAdminRights) {
      return NextResponse.json(
        { error: "Unauthorized action." }, 
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete("impersonated_tenant_id");
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("End impersonation error:", error);
    return NextResponse.json({ error: "Failed to remove impersonation" }, { status: 500 });
  }
}