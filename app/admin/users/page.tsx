// app/admin/users/page.tsx
import { adminAuth } from "@/lib/firebase-admin";
import { RoleAssignmentPicker } from "@/components/admin/RoleAssignmentPicker";
import { useEffect, useState } from "react";

interface UserRecord {
  uid: string;
  email: string;
  displayName?: string;
  customClaims?: Record<string, any>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch("/api/admin/list-users");
      const data = await res.json();
      setUsers(data.users || []);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">All Users</h1>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Display Name</th>
            <th className="border px-4 py-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.uid}>
              <td className="border px-4 py-2">{user.email}</td>
              <td className="border px-4 py-2">{user.displayName || "-"}</td>
              <td className="border px-4 py-2">
                <RoleAssignmentPicker
                  userId={user.uid}
                  currentRole={user.customClaims?.role || "user"}
                  onAssign={async (role) => {
                    await fetch("/api/admin/set-role", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.uid, role }),
                    });
                    setUsers((prev) =>
                      prev.map((u) =>
                        u.uid === user.uid
                          ? { ...u, customClaims: { ...u.customClaims, role } }
                          : u,
                      ),
                    );
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
