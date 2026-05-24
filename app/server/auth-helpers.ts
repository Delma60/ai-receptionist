// app/server/auth-helpers.ts
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { headers, cookies } from "next/headers";
import {
  hasPlatformRole,
  hasPlatformPermission,
  hasTenantRole,
  hasTenantPermission,
  type PlatformRole,
  type PlatformPermission,
  type TenantRole,
  type TenantPermission,
} from "@/lib/rbac";

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: PlatformRole;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const headersList = await headers();
  const authorization = headersList.get("Authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.split("Bearer ")[1]
    : null;
  const token = bearerToken || session;
  if (!token) return null;
  try {
    const decoded = bearerToken
      ? await adminAuth.verifyIdToken(token)
      : await adminAuth.verifySessionCookie(token, true);
    return {
      userId:   decoded.uid,
      tenantId: (decoded.tenantId as string) || decoded.uid,
      role:     (decoded.role as PlatformRole) || "user",
    };
  } catch (error) {
    console.error("[getTenantContext]", error);
    return null;
  }
}

// Platform guards
export async function isAdmin(): Promise<boolean> {
  const ctx = await getTenantContext();
  return hasPlatformRole(ctx?.role, "admin");
}

export async function requirePlatformRole(role: PlatformRole): Promise<boolean> {
  const ctx = await getTenantContext();
  return hasPlatformRole(ctx?.role, role);
}

export async function requirePlatformPermission(permission: PlatformPermission): Promise<boolean> {
  const ctx = await getTenantContext();
  return hasPlatformPermission(ctx?.role, permission);
}

// Tenant guards
export async function getCallerTenantRole(
  tenantId: string,
  userId?: string,
): Promise<TenantRole | null> {
  const uid = userId ?? (await getTenantContext())?.userId;
  if (!uid) return null;
  try {
    const memberDoc = await adminDb
      .collection("tenants").doc(tenantId)
      .collection("members").doc(uid)
      .get();
    if (!memberDoc.exists) return null;
    return (memberDoc.data()?.role as TenantRole) ?? null;
  } catch { return null; }
}

export async function requireTenantRole(tenantId: string, required: TenantRole): Promise<boolean> {
  const role = await getCallerTenantRole(tenantId);
  return hasTenantRole(role, required);
}

export async function requireTenantPermission(tenantId: string, permission: TenantPermission): Promise<boolean> {
  const role = await getCallerTenantRole(tenantId);
  return hasTenantPermission(role, permission);
}

// Role management
export async function setUserRole(targetUid: string, role: PlatformRole): Promise<void> {
  await adminAuth.setCustomUserClaims(targetUid, { role });
}

export async function setTenantMemberRole(tenantId: string, memberId: string, role: TenantRole): Promise<void> {
  await adminDb
    .collection("tenants").doc(tenantId)
    .collection("members").doc(memberId)
    .set({ role }, { merge: true });
}

export async function logAdminAction(
  adminId: string, action: string, targetTenantId: string, metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await adminDb.collection("auditLog").add({ adminId, action, targetTenantId, metadata, createdAt: new Date() });
  } catch (err) { console.error("[logAdminAction]", err); }
}

export async function getFeatureFlag(flagName: string, tenantId?: string): Promise<boolean> {
  try {
    const doc = await adminDb.collection("featureFlags").doc(flagName).get();
    if (!doc.exists) return false;
    const data = doc.data()!;
    if (data.enabled) return true;
    return Array.isArray(data.enabledForTenants) && data.enabledForTenants.includes(tenantId);
  } catch { return false; }
}