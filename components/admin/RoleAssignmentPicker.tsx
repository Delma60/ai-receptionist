"use client";

import { useState, useEffect } from "react";
import { Shield, ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Role {
  id: string;
  name: string;
  description: string;
}

export function RoleAssignmentPicker({
  currentRoleId,
  onAssign,
}: {
  currentRoleId?: string;
  onAssign: (roleId: string) => Promise<void>;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selected, setSelected] = useState(currentRoleId);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((res) => res.json())
      .then((data) => {
        setRoles(data);
        setLoading(false);
      });
  }, []);

  const handleUpdate = async (id: string) => {
    setUpdating(true);
    try {
      await onAssign(id);
      setSelected(id);
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="h-10 w-full animate-pulse bg-zinc-900 rounded-lg border border-white/[0.06]" />
    );

  return (
    <div className="space-y-3">
      <label className="text-[12px] font-medium text-zinc-400 ml-1 flex items-center gap-1.5">
        <Shield className="h-3 w-3" /> Assigned Access Role
      </label>
      <div className="grid gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleUpdate(role.id)}
            disabled={updating}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
              selected === role.id
                ? "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20"
                : "bg-zinc-950 border-white/[0.06] hover:border-white/[0.12]",
            )}
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">{role.name}</p>
              <p className="text-[11px] text-zinc-500">{role.description}</p>
            </div>
            {selected === role.id ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : updating ? (
              <Loader2 className="h-3 w-3 animate-spin text-zinc-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-zinc-700" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
