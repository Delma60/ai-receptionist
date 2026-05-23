import { adminAuth } from "@/lib/firebase-admin";
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
  
  // Prefer session cookie for UI navigation, fallback to Bearer token for API calls
  const token = session || (authorization?.startsWith("Bearer ") ? authorization.split("Bearer ")[1] : null);

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

declare global {
  interface DecodedIdToken {
    role?: UserRole;
    tenantId?: string;
  }
}

export type UserRole = "admin" | "user" | "support";