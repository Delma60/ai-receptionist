import { adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

/**
 * PATCH /api/admin/flags/[flagId]
 * Update a flag (toggle enabled or manage tenant list).
 */
export async function PATCH(
  req: Request,
  { params }: { params: { flagId: string } }
) {
  try {
    const { flagId } = params;
    const body = await req.json();

    // We only allow updating specific fields
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof body.enabled === "boolean") updateData.enabled = body.enabled;
    if (body.description !== undefined) updateData.description = body.description;
    if (Array.isArray(body.enabledForTenants)) updateData.enabledForTenants = body.enabledForTenants;

    await adminDb.collection("featureFlags").doc(flagId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FLAG_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/flags/[flagId]
 */
export async function DELETE(
  req: Request,
  { params }: { params: { flagId: string } }
) {
  try {
    const { flagId } = params;
    await adminDb.collection("featureFlags").doc(flagId).delete();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FLAG_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
