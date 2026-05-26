"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  enabledForTenants: string[];
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTenantId, setNewTenantId] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      const res = await fetch("/api/admin/flags");
      const data = await res.json();
      setFlags(data);
    } catch (err) {
      console.error("Failed to fetch flags", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(flag: FeatureFlag) {
    const newStatus = !flag.enabled;
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: newStatus }),
      });
      if (res.ok) {
        setFlags(flags.map(f => f.id === flag.id ? { ...f, enabled: newStatus } : f));
      }
    } catch (err) {
      alert("Update failed");
    }
  }

  async function addTenantOverride(flag: FeatureFlag) {
    const tid = newTenantId[flag.id];
    if (!tid) return;
    
    const newList = [...flag.enabledForTenants, tid];
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabledForTenants: newList }),
      });
      if (res.ok) {
        setFlags(flags.map(f => f.id === flag.id ? { ...f, enabledForTenants: newList } : f));
        setNewTenantId({ ...newTenantId, [flag.id]: "" });
      }
    } catch (err) {
      alert("Failed to add override");
    }
  }

  async function removeTenantOverride(flag: FeatureFlag, tid: string) {
    const newList = flag.enabledForTenants.filter(t => t !== tid);
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabledForTenants: newList }),
      });
      if (res.ok) {
        setFlags(flags.map(f => f.id === flag.id ? { ...f, enabledForTenants: newList } : f));
      }
    } catch (err) {
      alert("Failed to remove override");
    }
  }

  if (loading) return <div className="p-8">Loading configuration...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Platform Feature Flags</h1>
      <p className="text-gray-500">Enable features globally or for specific tenants.</p>

      <div className="grid gap-6">
        {flags.map((flag) => (
          <div key={flag.id} className="border rounded-lg p-6 bg-white shadow-sm flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold uppercase tracking-wider text-gray-700">{flag.name}</h3>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  flag.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                )}>
                  {flag.enabled ? "ACTIVE GLOBALLY" : "DISABLED"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{flag.description}</p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tenant Overrides</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {flag.enabledForTenants.map(tid => (
                    <span key={tid} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-100">
                      {tid}
                      <button onClick={() => removeTenantOverride(flag, tid)} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                  {flag.enabledForTenants.length === 0 && <span className="text-sm text-gray-400 italic">No overrides set.</span>}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="tenant_id" 
                    className="text-sm border rounded px-2 py-1 w-40"
                    value={newTenantId[flag.id] || ""}
                    onChange={(e) => setNewTenantId({ ...newTenantId, [flag.id]: e.target.value })}
                  />
                  <button 
                    onClick={() => addTenantOverride(flag)}
                    className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-black transition"
                  >
                    Add Override
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <button
                onClick={() => toggleFlag(flag)}
                className={cn(
                  "px-4 py-2 rounded text-sm font-semibold transition-colors",
                  flag.enabled ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                {flag.enabled ? "Disable Globally" : "Enable Globally"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
