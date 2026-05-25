import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tenantId = params.id;

  try {
    // 1. Delete tenant document
    await adminDb.collection("tenants").doc(tenantId).delete();

    // 2. Log the action to Audit Log
    await adminDb.collection("auditLog").add({
      action: "tenant_delete",
      targetTenantId: tenantId,
      createdAt: new Date(),
      // adminId: from session...
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tenant error:", error);
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}
