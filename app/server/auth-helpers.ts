// app/server/auth-helpers.ts
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { headers, cookies } from "next/headers";
import { hasRole, hasPermission, type UserRole, type Permission } from "@/lib/rbac";

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

/**
 * Verifies the current request's session cookie or Bearer token with Firebase Admin.
 * This is the authoritative server-side identity check — never trust client-supplied role values.
 */
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
      role:     (decoded.role as UserRole) || "user",
    };
  } catch (error) {
    console.error("[getTenantContext]", error);
    return null;
  }
}

/** Returns true only if the verified session belongs to an admin */
export async function isAdmin(): Promise<boolean> {
  const ctx = await getTenantContext();
  return hasRole(ctx?.role, "admin");
}

/** Returns true if the verified session has the given role or higher */
export async function requireRole(role: UserRole): Promise<boolean> {
  const ctx = await getTenantContext();
  return hasRole(ctx?.role, role);
}

/** Returns true if the verified session has the specific permission */
export async function requirePermission(permission: Permission): Promise<boolean> {
  const ctx = await getTenantContext();
  return hasPermission(ctx?.role, permission);
}

/**
 * Sets a custom role claim on a Firebase user.
 * Only callable from a verified admin context.
 */
export async function setUserRole(targetUid: string, role: UserRole): Promise<void> {
  await adminAuth.setCustomUserClaims(targetUid, { role });
}

/**
 * Logs an admin action to the immutable audit log.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetTenantId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await adminDb.collection("auditLog").add({
      adminId,
      action,
      targetTenantId,
      metadata,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[logAdminAction]", err);
  }
}

/**
 * Server-side feature flag check.
 */
export async function getFeatureFlag(flagName: string, tenantId?: string): Promise<boolean> {
  try {
    const doc = await adminDb.collection("featureFlags").doc(flagName).get();
    if (!doc.exists) return false;
    const data = doc.data()!;
    if (data.enabled) return true;
    return Array.isArray(data.enabledForTenants) && data.enabledForTenants.includes(tenantId);
  } catch {
    return false;
  }
}