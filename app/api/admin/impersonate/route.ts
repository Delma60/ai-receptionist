import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { tenantId } = await req.json();

    // TODO: In production, verify the requester's admin status via Firebase Admin SDK
    
    cookies().set("impersonated_tenant_id", tenantId, {
      path: "/",
      maxAge: 60 * 60, // 1 hour session
      httpOnly: false, // Frontend reads this to switch Firestore listeners
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to set impersonation" }, { status: 500 });
  }
}

export async function DELETE() {
  cookies().delete("impersonated_tenant_id");
  return NextResponse.json({ success: true });
}