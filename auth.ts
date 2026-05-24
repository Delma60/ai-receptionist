import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";



/**
 * Retrieves the tenant context for the current session.
 */
export async function getTenantContext() {
  throw new Error("getTenantContext() is now in app/server/auth-helpers.ts and can only be used in server components or API routes.");
}

/**
 * Logs administrative actions to the immutable audit log.
 */
export async function logAdminAction(
  adminId: string, 
  action: "impersonate" | "plan_change" | "tenant_delete" | "feature_flag", 
  targetTenantId: string, 
  metadata: Record<string, any> = {}
) {
  try {
    await adminDb.collection("auditLog").add({
      adminId,
      action,
      targetTenantId,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Audit Log Error:", error);
  }
}

/**
 * Server-side check for feature flags.
 */
export async function getFeatureFlag(flagName: string, tenantId?: string): Promise<boolean> {
  try {
    const flagDoc = await adminDb.collection("featureFlags").doc(flagName).get();
    if (!flagDoc.exists) return false;

    const data = flagDoc.data();
    if (!data) return false;

    // Check global state
    if (data.enabled) return true;

    // Check tenant-specific overrides
    return data.enabledForTenants?.includes(tenantId) || false;
  } catch (e) {
    return false;
  }
}

/**
 * Server-side check for authentication settings.
 */
export async function isAuthProviderAllowed(provider: 'google' | 'github'): Promise<boolean> {
  try {
    const configDoc = await adminDb.collection("platform").doc("config").get();
    if (!configDoc.exists) return true;

    const data = configDoc.data();
    if (provider === 'google') return data?.allowGoogleAuth ?? true;
    if (provider === 'github') return data?.allowGithubAuth ?? true;
    return true;
  } catch (e) {
    return true;
  }
}

declare global {
  interface DecodedIdToken {
    role?: UserRole;
    tenantId?: string;
  }
}

export type UserRole = "admin" | "user" | "support";