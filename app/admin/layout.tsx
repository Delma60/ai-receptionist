// app/admin/layout.tsx
// FIX 4: Role enforcement happens in TWO layers:
//   1. proxy.ts (middleware) — cookie-based fast redirect to /dashboard for non-admins
//   2. This layout (server component) — re-verifies the session cookie via Firebase Admin
//      and hard-redirects if the verified role is not "admin". This closes the gap where
//      someone forges the "user-role" cookie to bypass the middleware redirect.
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import AdminLayoutClient from "@/components/admin/admin-layout-client";

async function getVerifiedRole(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return null;
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return (decoded.role as string) ?? null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // FIX 4: Server-side role check — this cannot be bypassed via a forged cookie
  const role = await getVerifiedRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
