import { NextResponse } from "next/server";
import { isAdmin, getTenantContext, logAdminAction } from "@/app/server/auth-helpers";
import { adminDb } from "@/lib/firebase-admin";

// GET: List all custom roles
export async function GET() {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const snapshot = await adminDb.collection("platform").doc("roles").collection("custom").get();
  const roles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ roles });
}

// POST: Create a new custom role
export async function POST(req: Request) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { name, description, permissions } = body;
  if (!name || !Array.isArray(permissions)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const docRef = await adminDb.collection("platform").doc("roles").collection("custom").add({
    name,
    description: description || "",
    permissions,
    createdAt: new Date(),
  });
  await logAdminAction((await getTenantContext())?.userId || "", "role_create", "platform", { name });
  return NextResponse.json({ success: true, id: docRef.id });
}
