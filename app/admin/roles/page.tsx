"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCustomRoles } from "@/hooks/useCustomRoles";
import {
  Shield,
  Plus,
  X,
  Key,
  Info,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_AVAILABLE_PERMISSIONS = [
  { id: "users.read", label: "View Users", category: "Users" },
  { id: "users.write", label: "Manage Users", category: "Users" },
  { id: "tenants.read", label: "View Tenants", category: "Tenants" },
  { id: "tenants.write", label: "Manage Tenants", category: "Tenants" },
  { id: "calls.view", label: "View Calls", category: "Activity" },
  { id: "billing.read", label: "View Billing", category: "Finance" },
  { id: "roles.read", label: "View Roles", category: "System" },
  { id: "roles.write", label: "Manage Roles", category: "System" },
];

export default function AdminRolesPage() {
  const { roles, loading, error } = useCustomRoles();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    permissions: string[];
  }>({
    name: "",
    description: "",
    permissions: [],
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
        permissions: form.permissions,
      }),
    });
    if (res.ok) {
      setMessage("Role created!");
      setForm({ name: "", description: "", permissions: [] });
      setShowCreate(false);
    } else {
      setMessage("Error creating role");
    }
    setSaving(false);
  };

  const togglePermission = (permId: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Custom Roles</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Define and manage granular access levels for the platform.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate((v) => !v)}
          variant={showCreate ? "outline" : "default"}
          className={cn(
            "gap-2 transition-all",
            !showCreate &&
              "bg-emerald-600 hover:bg-emerald-500 text-white border-none",
          )}
        >
          {showCreate ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Create New Role
            </>
          )}
        </Button>
      </div>

      {/* Status Messages */}
      {message && (
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border",
            message.includes("Error")
              ? "bg-red-500/5 border-red-500/20 text-red-400"
              : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
          )}
        >
          {message.includes("Error") ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <p className="text-[13px] font-medium">{message}</p>
        </div>
      )}

      {/* Create Form Card */}
      {showCreate && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-400 ml-1">
                  Role Name
                </label>
                <input
                  className="w-full bg-zinc-950 border border-white/[0.1] p-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="e.g. Support Manager"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-400 ml-1">
                  Description
                </label>
                <input
                  className="w-full bg-zinc-950 border border-white/[0.1] p-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Briefly describe the responsibilities"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-zinc-400 ml-1 flex items-center gap-1.5">
                <Key className="h-3 w-3" /> Permissions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {ALL_AVAILABLE_PERMISSIONS.map((perm) => (
                  <label
                    key={perm.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                      form.permissions.includes(perm.id)
                        ? "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20"
                        : "bg-zinc-950 border-white/[0.06] hover:border-white/[0.12]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-zinc-200">
                        {perm.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {perm.id}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-1 ml-1">
                <Info className="h-3 w-3" /> Selected permissions will be
                granted to any user assigned this role.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving || form.permissions.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[120px]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Role"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Roles List */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-white/[0.06] bg-zinc-900/80 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center justify-center text-center rounded-xl border border-red-500/10 bg-red-500/5">
          <AlertCircle className="h-8 w-8 text-red-500/50 mb-3" />
          <p className="text-zinc-400 font-medium">Failed to load roles</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role: any) => (
            <div
              key={role.id}
              className="group relative flex flex-col p-5 rounded-xl border border-white/[0.06] bg-zinc-900/80 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Shield className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {role.name}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed min-h-[32px]">
                {role.description || "No description provided."}
              </p>

              <div className="mt-4 pt-4 border-t border-white/[0.04] flex flex-wrap gap-1.5">
                {role.permissions?.map((perm: string) => (
                  <span
                    key={perm}
                    className="px-1.5 py-0.5 rounded bg-zinc-950 border border-white/[0.06] text-[10px] font-mono text-zinc-400"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
