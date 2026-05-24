import { logAdminAction } from "@/auth";
import { isAdmin } from "@/app/server/auth-helpers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Verify the requester's admin status on the server
    const hasAdminRights = await isAdmin();
    
    if (!hasAdminRights) {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can record audit logs." }, 
        { status: 403 }
      );
    }

    const { adminId, action, targetTenantId, metadata } = await req.json();
    await logAdminAction(adminId, action, targetTenantId, metadata);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Audit logging error:", error);
    return NextResponse.json({ error: "Failed to record audit log" }, { status: 500 });
  }
}