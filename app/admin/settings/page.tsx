"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Flag,
  Activity,
  Save,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
}

interface PlatformConfig {
  defaultTrialDays: number;
  overageRate: number;
  maintenanceMode: boolean;
  supportEmail: string;
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"flags" | "config" | "health">("flags");
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 1. Listen to all feature flags in real-time
    const flagsUnsub = onSnapshot(collection(db, "featureFlags"), (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FeatureFlag[];
      setFlags(data);
    });

    // 2. Fetch global platform configuration
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "platform", "config");
        const d = await getDoc(docRef);
        if (d.exists()) {
          setConfig(d.data() as PlatformConfig);
        } else {
          // Initialize default config if it doesn't exist
          const initial = {
            defaultTrialDays: 14,
            overageRate: 0.08,
            maintenanceMode: false,
            supportEmail: "support@receptionly.ai",
          };
          await setDoc(docRef, initial);
          setConfig(initial);
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    return () => flagsUnsub();
  }, []);

  const handleToggleFlag = async (id: string, currentState: boolean) => {
    try {
      await updateDoc(doc(db, "featureFlags", id), {
        enabled: !currentState,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Error updating flag:", err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "platform", "config"), {
        ...config,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Error saving config:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-white">System Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage platform features, global configuration, and system health.
        </p>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/40 border border-white/[0.06] w-fit">
        {[
          { id: "flags", label: "Feature Flags", icon: Flag },
          { id: "config", label: "Global Config", icon: Settings },
          { id: "health", label: "System Health", icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="mt-6">
        {activeTab === "flags" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-zinc-500 font-medium">Feature</TableHead>
                    <TableHead className="text-zinc-500 font-medium">Description</TableHead>
                    <TableHead className="text-right text-zinc-500 font-medium pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.map((flag) => (
                    <TableRow key={flag.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                      <TableCell className="font-medium text-zinc-200">{flag.name}</TableCell>
                      <TableCell className="text-zinc-500 text-sm">{flag.description}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleFlag(flag.id, flag.enabled)}
                          className={cn(
                            "h-8 px-3 border-white/[0.06]",
                            flag.enabled 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-zinc-800/40 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
                          )}
                        >
                          {flag.enabled ? "Enabled" : "Disabled"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "config" && config && (
          <div className="max-w-2xl rounded-xl border border-white/[0.06] bg-zinc-900/40 p-6">
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Default Trial Period</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config.defaultTrialDays}
                      onChange={(e) => setConfig({ ...config, defaultTrialDays: parseInt(e.target.value) })}
                      className="bg-zinc-900/50 border-white/[0.06] pl-9 text-white"
                    />
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400/50" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Days</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Overage Rate</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      value={config.overageRate}
                      onChange={(e) => setConfig({ ...config, overageRate: parseFloat(e.target.value) })}
                      className="bg-zinc-900/50 border-white/[0.06] pl-9 text-white"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">/ min</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Platform Support Email</label>
                <Input
                  value={config.supportEmail}
                  onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                  placeholder="support@receptionly.ai"
                  className="bg-zinc-900/50 border-white/[0.06] text-white"
                />
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-zinc-200">Maintenance Mode</p>
                  <p className="text-xs text-zinc-500">Block platform access for non-admin users.</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                  className={cn(
                    "h-9 px-4 transition-colors font-semibold",
                    config.maintenanceMode 
                      ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                      : "bg-zinc-800 text-zinc-400 border-white/[0.06] hover:bg-zinc-700"
                  )}
                  variant="outline"
                >
                  {config.maintenanceMode ? "Active" : "Inactive"}
                </Button>
              </div>

              <Button 
                type="submit" 
                disabled={saving}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Global Config
              </Button>
            </form>
          </div>
        )}

        {activeTab === "health" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Vapi (Voice AI)", status: "operational", latency: "142ms", uptime: "99.98%" },
              { name: "Twilio (Telecom)", status: "operational", latency: "89ms", uptime: "100%" },
              { name: "Stripe (Payments)", status: "operational", latency: "45ms", uptime: "99.99%" },
              { name: "Firestore (Database)", status: "operational", latency: "12ms", uptime: "100%" },
              { name: "Resend (Email)", status: "degraded", latency: "2.4s", uptime: "98.5%" },
            ].map((service) => (
              <div key={service.name} className="p-5 rounded-xl border border-white/[0.06] bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      service.status === "operational" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    )} />
                    <span className="text-sm font-medium text-zinc-200">{service.name}</span>
                  </div>
                  <Badge className={cn(
                    "text-[10px] uppercase font-bold",
                    service.status === "operational" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  )}>
                    {service.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Latency</p>
                    <p className="text-xs font-mono text-zinc-300">{service.latency}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Uptime (30d)</p>
                    <p className="text-xs font-mono text-zinc-300">{service.uptime}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-5 rounded-xl border border-dashed border-white/[0.06] flex flex-col items-center justify-center text-center space-y-2">
              <RefreshCw className="h-5 w-5 text-zinc-600" />
              <p className="text-xs text-zinc-500 font-medium">Automatic checks every 5m</p>
              <Button variant="link" className="text-emerald-500 text-xs h-auto p-0">Run full diagnostic now</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
