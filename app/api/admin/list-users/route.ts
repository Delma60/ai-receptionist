// app/api/admin/list-users/route.ts
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { isAdmin } from "@/app/server/auth-helpers";

export async function GET() {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let users: any[] = [];
  let nextPageToken: string | undefined = undefined;
  do {
    const result = await adminAuth.listUsers(1000, nextPageToken);
    users = users.concat(result.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      customClaims: u.customClaims,
    })));
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  return NextResponse.json({ users });
}
