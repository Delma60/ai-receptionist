import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { headers, cookies } from "next/headers";

/**
 * Server-side utility to check if the current user has the admin role.
 */
export async function isAdmin(): Promise<boolean> {
  const context = await getTenantContext();
  return context?.role === "admin";
}

/**
 * Retrieves the tenant context for the current session.
 */
export async function getTenantContext() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  
  const headersList = await headers();
  const authorization = headersList.get("Authorization");
  
  // Prefer Bearer token for API calls, fallback to session cookie for UI navigation
  const token = (authorization?.startsWith("Bearer ") ? authorization.split("Bearer ")[1] : null) || session;

  if (!token) return null;

  try {
    let decodedToken;
    if (session) {
      // Use verifySessionCookie for cookie-based sessions
      decodedToken = await adminAuth.verifySessionCookie(token, true);
    } else {
      // Use verifyIdToken for header-based Bearer tokens
      decodedToken = await adminAuth.verifyIdToken(token);
    }

    return {
      userId: decodedToken.uid,
      tenantId: (decodedToken.tenantId as string) || decodedToken.uid,
      role: (decodedToken.role as string) || "user",
    };
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
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