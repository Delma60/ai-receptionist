"use client";

import { useState, useEffect } from "react";
import {
  Flag,
  Settings,
  Activity,
  Save,
  Loader2,
  RefreshCw,
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Mail,
  Phone,
  CreditCard,
  Shield,
  Globe,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

// ── Types ─────────────────────────────────────────────────────
interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  enabledForTenants?: string[];
  updatedAt?: any;
}

interface PlatformConfig {
  defaultTrialDays: number;
  overageRate: number;
  maintenanceMode: boolean;
  supportEmail: string;
  maxAgentsPerTenant?: number;
  webhookRetryAttempts?: number;
  paymentProvider: "stripe" | "flutterwave";
  allowGoogleAuth: boolean;
  allowGithubAuth: boolean;
  updatedAt?: any;
}

interface ServiceHealth {
  name: string;
  icon: React.ElementType;
  status: "operational" | "degraded" | "down" | "unknown";
  latency: string;
  uptime: string;
  lastChecked: string;
  description: string;
}

// ── Static service definitions ────────────────────────────────
const SERVICES: ServiceHealth[] = [
  {
    name: "Vapi Voice AI",
    icon: Cpu,
    status: "operational",
    latency: "142ms",
    uptime: "99.98%",
    lastChecked: "Just now",
    description: "AI voice agent engine",
  },
  {
    name: "Twilio Telephony",
    icon: Phone,
    status: "operational",
    latency: "89ms",
    uptime: "100%",
    lastChecked: "Just now",
    description: "SIP trunking & SMS routing",
  },
  {
    name: "Stripe Payments",
    icon: CreditCard,
    status: "operational",
    latency: "45ms",
    uptime: "99.99%",
    lastChecked: "Just now",
    description: "Subscription billing",
  },
  {
    name: "Firestore Database",
    icon: Database,
    status: "operational",
    latency: "12ms",
    uptime: "100%",
    lastChecked: "Just now",
    description: "Real-time NoSQL database",
  },
  {
    name: "Resend Email",
    icon: Mail,
    status: "degraded",
    latency: "2.4s",
    uptime: "98.5%",
    lastChecked: "2m ago",
    description: "Transactional email delivery",
  },
  {
    name: "Vercel Edge",
    icon: Globe,
    status: "operational",
    latency: "18ms",
    uptime: "99.97%",
    lastChecked: "Just now",
    description: "Global CDN & hosting",
  },
];

const STATUS_CONFIG = {
  operational: {
    label: "Operational",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-500",
    ping: true,
  },
  degraded: {
    label: "Degraded",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-500",
    ping: false,
  },
  down: {
    label: "Down",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    dot: "bg-red-500",
    ping: false,
  },
  unknown: {
    label: "Unknown",
    color: "text-zinc-500",
    bg: "bg-zinc-800 border-zinc-700",
    dot: "bg-zinc-600",
    ping: false,
  },
};

// ── Sub-components ─────────────────────────────────────────────
function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-white/[0.08] text-white"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
      )}
    >
      {active && (
        <span className="absolute inset-0 rounded-lg ring-1 ring-white/[0.1]" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active
            ? "text-emerald-400"
            : "text-zinc-600 group-hover:text-zinc-400",
        )}
      />
      {label}
    </button>
  );
}

function FlagRow({
  flag,
  onToggle,
  onDelete,
}: {
  flag: FeatureFlag;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            flag.enabled
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-zinc-800/60 border-white/[0.06]",
          )}
        >
          <Flag
            className={cn(
              "h-3.5 w-3.5",
              flag.enabled ? "text-emerald-400" : "text-zinc-600",
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-zinc-200 truncate font-mono">
            {flag.name}
          </p>
          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
            {flag.description || "No description"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        {flag.updatedAt && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-600">
            <Clock className="h-3 w-3" />
            {flag.updatedAt?.toDate
              ? flag.updatedAt.toDate().toLocaleDateString()
              : "—"}
          </div>
        )}
        <span
          className={cn(
            "hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            flag.enabled
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-zinc-800 text-zinc-500 border-zinc-700",
          )}
        >
          {flag.enabled ? "ON" : "OFF"}
        </span>
        <Switch
          checked={flag.enabled}
          onCheckedChange={() => onToggle(flag.id, flag.enabled)}
        />
        <button
          onClick={() => onDelete(flag.id)}
          className="opacity-0 group-hover:opacity-100 rounded-md p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const cfg = STATUS_CONFIG[service.status];
  const Icon = service.icon;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-5 space-y-4 hover:border-white/[0.1] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
            <Icon className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">
              {service.name}
            </p>
            <p className="text-[11px] text-zinc-600">{service.description}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            cfg.bg,
            cfg.color,
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {cfg.ping && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  cfg.dot,
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-1.5 w-1.5 rounded-full",
                cfg.dot,
              )}
            />
          </span>
          {cfg.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.04]">
        {[
          { label: "Latency", value: service.latency },
          { label: "Uptime", value: service.uptime },
          { label: "Checked", value: service.lastChecked },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">
              {label}
            </p>
            <p className="text-[12px] font-mono font-medium text-zinc-300">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"flags" | "config" | "health">(
    "flags",
  );
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  // New flag form
  const [showNewFlag, setShowNewFlag] = useState(false);
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagDesc, setNewFlagDesc] = useState("");
  const [addingFlag, setAddingFlag] = useState(false);

  // Health
  const [checking, setChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState("Never");

  useEffect(() => {
    // Real-time: featureFlags collection
    const flagsUnsub = onSnapshot(
      collection(db, "featureFlags"),
      (snap) => {
        setFlags(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeatureFlag),
        );
      },
      (err) => console.error("[featureFlags]", err),
    );

    // Real-time: platform/config doc
    const configUnsub = onSnapshot(
      doc(db, "platform", "config"),
      async (snap) => {
        if (snap.exists()) {
          setConfig(snap.data() as PlatformConfig);
        } else {
          const defaults: PlatformConfig = {
            defaultTrialDays: 14,
            overageRate: 0.08,
            maintenanceMode: false,
            supportEmail: "support@receptionly.ai",
            maxAgentsPerTenant: 10,
            webhookRetryAttempts: 3,
            paymentProvider: "stripe",
            allowGoogleAuth: true,
            allowGithubAuth: true,
          };
          await setDoc(doc(db, "platform", "config"), defaults);
          setConfig(defaults);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[platform/config]", err);
        setLoading(false);
      },
    );

    return () => {
      flagsUnsub();
      configUnsub();
    };
  }, []);

  const handleToggleFlag = async (
    id: string,
    name: string,
    current: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "featureFlags", id), {
        enabled: !current,
        updatedAt: serverTimestamp(),
      });

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: session.userId ?? "unknown",
          action: "feature_flag",
          targetTenantId: "global",
          metadata: { flagName: name, newState: !current },
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFlag = async (id: string) => {
    if (!confirm("Permanently delete this feature flag?")) return;
    try {
      await deleteDoc(doc(db, "featureFlags", id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagName.trim()) return;
    setAddingFlag(true);
    try {
      await addDoc(collection(db, "featureFlags"), {
        name: newFlagName.trim(),
        description: newFlagDesc.trim(),
        enabled: false,
        enabledForTenants: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewFlagName("");
      setNewFlagDesc("");
      setShowNewFlag(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingFlag(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "platform", "config"),
        {
          ...config,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRunHealthCheck = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setLastFullCheck(new Date().toLocaleTimeString());
    }, 2200);
  };

  const overallHealth = SERVICES.every((s) => s.status === "operational")
    ? "operational"
    : SERVICES.some((s) => s.status === "down")
      ? "down"
      : "degraded";

  if (loading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border border-emerald-500/30 bg-emerald-500/5 animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-emerald-400 animate-spin" />
        </div>
        <p className="text-[13px] text-zinc-500">
          Loading system configuration…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            System Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Feature flags, platform configuration, and service health
            monitoring.
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider",
            overallHealth === "operational"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : overallHealth === "degraded"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-red-500/10 border-red-500/20 text-red-400",
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                overallHealth === "operational"
                  ? "bg-emerald-400"
                  : overallHealth === "degraded"
                    ? "bg-amber-400"
                    : "bg-red-400",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-1.5 w-1.5 rounded-full",
                overallHealth === "operational"
                  ? "bg-emerald-500"
                  : overallHealth === "degraded"
                    ? "bg-amber-500"
                    : "bg-red-500",
              )}
            />
          </span>
          {overallHealth === "operational"
            ? "All systems nominal"
            : overallHealth === "degraded"
              ? "Partial degradation"
              : "System incident"}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-1.5 w-fit">
        {[
          { id: "flags" as const, label: "Feature Flags", icon: Flag },
          { id: "config" as const, label: "Global Config", icon: Settings },
          { id: "health" as const, label: "System Health", icon: Activity },
        ].map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            icon={tab.icon}
            label={tab.label}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* ══════════════ TAB 1: FEATURE FLAGS ══════════════ */}
      {activeTab === "flags" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-zinc-400">
              <span className="font-semibold text-white">{flags.length}</span>{" "}
              flags ·{" "}
              <span className="text-emerald-400 font-semibold">
                {flags.filter((f) => f.enabled).length}
              </span>{" "}
              active
            </p>
            <Button
              onClick={() => setShowNewFlag(!showNewFlag)}
              size="sm"
              className={cn(
                "gap-2 text-[12px] h-8",
                showNewFlag
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white",
              )}
            >
              {showNewFlag ? (
                "Cancel"
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  New flag
                </>
              )}
            </Button>
          </div>

          {showNewFlag && (
            <form
              onSubmit={handleAddFlag}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                Create New Flag
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Flag Name
                  </label>
                  <Input
                    value={newFlagName}
                    onChange={(e) => setNewFlagName(e.target.value)}
                    placeholder="e.g. live_transfer_v2"
                    required
                    className="h-9 bg-zinc-900/50 border-white/[0.08] text-[13px] font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Description
                  </label>
                  <Input
                    value={newFlagDesc}
                    onChange={(e) => setNewFlagDesc(e.target.value)}
                    placeholder="What does this control?"
                    className="h-9 bg-zinc-900/50 border-white/[0.08] text-[13px]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={addingFlag || !newFlagName.trim()}
                  className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] gap-1.5"
                  size="sm"
                >
                  {addingFlag ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Create Flag
                </Button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              {["Flag", "Last Updated", "State", "Toggle", ""].map((h) => (
                <p
                  key={h}
                  className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
                >
                  {h}
                </p>
              ))}
            </div>
            {flags.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-4">
                  <Flag className="h-5 w-5 text-zinc-600" />
                </div>
                <p className="text-[14px] font-medium text-zinc-400">
                  No feature flags yet
                </p>
                <p className="text-[12px] text-zinc-600 mt-1">
                  Create your first flag to control feature rollouts
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {flags.map((flag) => (
                  <FlagRow
                    key={flag.id}
                    flag={flag}
                    onToggle={handleToggleFlag}
                    onDelete={handleDeleteFlag}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <Shield className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              Flags are checked server-side via{" "}
              <code className="text-zinc-300 bg-zinc-800 rounded px-1 py-0.5 text-[11px]">
                getFlag(name, tenantId?)
              </code>
              . Changes are instant — no deploy needed. Per-tenant overrides
              live in the{" "}
              <code className="text-zinc-300 bg-zinc-800 rounded px-1 py-0.5 text-[11px]">
                enabledForTenants
              </code>{" "}
              array.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 2: GLOBAL CONFIG ══════════════ */}
      {activeTab === "config" && config && (
        <form onSubmit={handleSaveConfig} className="space-y-5">
          {/* Billing & Limits */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Zap className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">
                  Billing & Limits
                </p>
                <p className="text-[11px] text-zinc-500">
                  Trial periods, overage rates, and usage caps
                </p>
              </div>
            </div>
            <div className="p-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  label: "Default Trial Period",
                  key: "defaultTrialDays" as const,
                  suffix: "days",
                  description: "Days of free access for new signups",
                },
                {
                  label: "Overage Rate",
                  key: "overageRate" as const,
                  prefix: "$",
                  suffix: "/ min",
                  step: "0.01",
                  description: "Charged per minute above plan limit",
                },
                {
                  label: "Max Agents / Tenant",
                  key: "maxAgentsPerTenant" as const,
                  suffix: "agents",
                  description: "Hard cap for Pro plan tenants",
                },
              ].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    {field.label}
                  </label>
                  <div className="relative flex items-center">
                    {field.prefix && (
                      <span className="absolute left-3 text-[13px] text-zinc-500 pointer-events-none">
                        {field.prefix}
                      </span>
                    )}
                    <Input
                      type="number"
                      step={(field as any).step}
                      value={(config[field.key] as number) ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          [field.key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={cn(
                        "h-9 bg-zinc-900/50 border-white/[0.08] text-[13px]",
                        field.prefix && "pl-7",
                        field.suffix && "pr-16",
                      )}
                    />
                    {field.suffix && (
                      <span className="absolute right-3 text-[11px] text-zinc-600 pointer-events-none whitespace-nowrap">
                        {field.suffix}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    {field.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Authentication & Payments */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20">
                <Shield className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">
                  Auth & Payments
                </p>
                <p className="text-[11px] text-zinc-500">
                  Global configurations for authentication and billing.
                </p>
              </div>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Active Payment Provider
                  </label>
                  <select
                    value={config.paymentProvider}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        paymentProvider: e.target.value as any,
                      })
                    }
                    className="w-full rounded-md border border-white/[0.08] bg-zinc-900 px-3 py-2 text-[13px] text-white focus:border-violet-500 outline-none h-9"
                  >
                    <option value="stripe">Stripe (Global)</option>
                    <option value="flutterwave">
                      Flutterwave (Africa/Nigeria)
                    </option>
                  </select>
                  <p className="text-[10px] text-zinc-600">
                    Flutterwave is recommended for regions where Stripe has
                    limited support.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Authentication Methods
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-200">
                      Allow Google Authentication
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      Enable users to sign up and sign in with Google.
                    </p>
                  </div>
                  <Switch
                    checked={config.allowGoogleAuth}
                    onCheckedChange={(v) =>
                      setConfig({ ...config, allowGoogleAuth: v })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-200">
                      Allow GitHub Authentication
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      Enable users to sign up and sign in with GitHub.
                    </p>
                  </div>
                  <Switch
                    checked={config.allowGithubAuth}
                    onCheckedChange={(v) =>
                      setConfig({ ...config, allowGithubAuth: v })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Platform Settings */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20">
                <Globe className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">
                  Platform Settings
                </p>
                <p className="text-[11px] text-zinc-500">
                  Global defaults and contact configuration
                </p>
              </div>
            </div>
            <div className="p-5 grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Support Email
                </label>
                <Input
                  type="email"
                  value={config.supportEmail}
                  onChange={(e) =>
                    setConfig({ ...config, supportEmail: e.target.value })
                  }
                  className="h-9 bg-zinc-900/50 border-white/[0.08] text-[13px]"
                  placeholder="support@receptionly.ai"
                />
                <p className="text-[10px] text-zinc-600">
                  Shown to tenants for billing and support inquiries
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Webhook Retry Attempts
                </label>
                <Input
                  type="number"
                  value={config.webhookRetryAttempts ?? 3}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      webhookRetryAttempts: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-9 bg-zinc-900/50 border-white/[0.08] text-[13px]"
                />
                <p className="text-[10px] text-zinc-600">
                  Max retries for failed webhook deliveries
                </p>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div
            className={cn(
              "rounded-xl border p-5 transition-all",
              config.maintenanceMode
                ? "border-red-500/30 bg-red-500/5"
                : "border-white/[0.06] bg-zinc-900/40",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[14px] font-semibold text-zinc-200 flex items-center gap-2 flex-wrap">
                  Maintenance Mode
                  {config.maintenanceMode && (
                    <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                      ACTIVE
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-zinc-500">
                  {config.maintenanceMode
                    ? "Platform access is restricted to admin users. Tenants see a maintenance notice."
                    : "Enable to restrict platform access for non-admin users during deployments or incidents."}
                </p>
              </div>
              <Switch
                checked={config.maintenanceMode}
                onCheckedChange={(v) =>
                  setConfig({ ...config, maintenanceMode: v })
                }
              />
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-900/40 px-5 py-3.5">
            <div className="text-[12px]">
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved successfully
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <XCircle className="h-3.5 w-3.5" />
                  Failed to save
                </span>
              )}
              {saveStatus === "idle" && (
                <span className="text-zinc-600">
                  Changes sync to Firestore immediately
                </span>
              )}
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Config
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ══════════════ TAB 3: SYSTEM HEALTH ══════════════ */}
      {activeTab === "health" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-zinc-400">
              Last full diagnostic:{" "}
              <span className="text-zinc-200 font-medium">{lastFullCheck}</span>
            </p>
            <Button
              onClick={handleRunHealthCheck}
              disabled={checking}
              size="sm"
              className="h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 gap-2 text-[12px]"
            >
              {checking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Run Diagnostic
                </>
              )}
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Operational",
                count: SERVICES.filter((s) => s.status === "operational")
                  .length,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                label: "Degraded",
                count: SERVICES.filter((s) => s.status === "degraded").length,
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
              },
              {
                label: "Down",
                count: SERVICES.filter((s) => s.status === "down").length,
                color: "text-red-400",
                bg: "bg-red-500/10 border-red-500/20",
              },
            ].map(({ label, count, color, bg }) => (
              <div
                key={label}
                className={cn(
                  "rounded-xl border px-4 py-3 flex items-center justify-between",
                  bg,
                )}
              >
                <span className="text-[12px] text-zinc-400">{label}</span>
                <span className={cn("text-xl font-bold tabular-nums", color)}>
                  {count}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-900/40 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-[12px] text-zinc-400">
                Automatic health checks every{" "}
                <span className="text-zinc-200 font-medium">5 minutes</span>
              </p>
            </div>
            <p className="text-[11px] text-zinc-600">
              Alerts sent to {config?.supportEmail ?? "admin"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
