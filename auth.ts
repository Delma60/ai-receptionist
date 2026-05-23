import { auth } from "@clerk/nextjs/server";

/**
 * Server-side utility to check if the current user has the admin role.
 * Enforces the "Superuser" requirement mentioned in the project documentation.
 */
export function isAdmin(): boolean {
  const { sessionClaims } = auth();
  return sessionClaims?.metadata?.role === "admin";
}

/**
 * Retrieves the tenant context for the current session.
 * Supports both Clerk Organizations and custom metadata tenant IDs.
 */
export function getTenantContext() {
  const { userId, orgId, sessionClaims } = auth();

  if (!userId) throw new Error("Unauthorized access: No session found.");

  return {
    userId,
    // Priority: Clerk Org ID -> Custom Metadata -> User ID as fallback
    tenantId: orgId || (sessionClaims?.metadata?.tenantId as string) || userId,
    role: sessionClaims?.metadata?.role as string || "user",
  };
}

/**
 * Type definition for Clerk JWT session claims.
 * Add this to a global d.ts file or keep it here for reference.
 */
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "admin" | "user" | "support";
      tenantId?: string;
    };
  }
}

export type UserRole = "admin" | "user" | "support";