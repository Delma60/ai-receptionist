'use client'

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCustomRoles } from "@/hooks/useCustomRoles";

export default function AdminRolesPage() {
  const { roles, loading, error } = useCustomRoles();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        permissions: form.permissions.split(",").map((p) => p.trim()),
      }),
    });
    if (res.ok) {
      setMessage("Role created!");
      setForm({ name: "", description: "", permissions: "" });
      setShowCreate(false);
    } else {
      setMessage("Error creating role");
    }
    setSaving(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Custom Roles</h1>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error loading roles</div>
      ) : (
        <ul className="mb-6">
          {roles.map((role: any) => (
            <li key={role.id} className="mb-2 p-3 border rounded">
              <div className="font-semibold">{role.name}</div>
              <div className="text-sm text-zinc-500">{role.description}</div>
              <div className="text-xs text-zinc-400">
                Permissions: {role.permissions?.join(", ")}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "Cancel" : "Create New Role"}
      </Button>
      {showCreate && (
        <form className="mt-4 space-y-3" onSubmit={handleCreate}>
          <input
            className="w-full border p-2 rounded"
            placeholder="Role name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="w-full border p-2 rounded"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="w-full border p-2 rounded font-mono"
            placeholder="Permissions (comma separated)"
            value={form.permissions}
            onChange={(e) => setForm({ ...form, permissions: e.target.value })}
            required
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Role"}
          </Button>
          {message && <div className="text-sm mt-2">{message}</div>}
        </form>
      )}
    </div>
  );
}
