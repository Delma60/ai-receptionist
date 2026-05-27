"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Settings,
  Unlink,
  Zap,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, collection } from "firebase/firestore";
import { Integration, IntegrationStatus } from "@/types";
import { DynamicIcon } from "lucide-react/dynamic";

// ── Types ────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  calendar: Calendar,
  zap: Zap,
  globe: Globe,
  messageSquare: MessageSquare,
  link2: Link2,
  phone: Phone,
};

// ── Status helpers ────────────────────────────────────────────────────
const statusConfig = {
  connected: {
    label: "Connected",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ping: true,
  },
  disconnected: {
    label: "Not connected",
    dot: "bg-zinc-600",
    badge: "bg-zinc-800 text-zinc-500 border-zinc-700",
    ping: false,
  },
  error: {
    label: "Sync error",
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    ping: false,
  },
  syncing: {
    label: "Syncing…",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    ping: true,
  },
};

const categoryLabels: Record<Integration["category"], string> = {
  calendar: "Calendar",
  crm: "CRM",
  sms: "Messaging",
  phone: "Phone",
  analytics: "Analytics",
  webhook: "Webhooks",
  communication: "Communication",
  marketing: "Marketing",
  storage: "Storage",
  support: "Support",
  custom: "Custom",
};

// ── Sub-components ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: IntegrationStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        cfg.badge,
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
  );
}

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onSync,
}: {
  integration: Integration;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
}) {
  // const Icon = integration.icon;
  const isConnected = integration.status === "connected";
  const isError = integration.status === "error";
  const isSyncing = integration.status === "syncing";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border bg-zinc-900/80 p-5 transition-all duration-200",
        isConnected
          ? "border-white/[0.08] hover:border-white/[0.12]"
          : isError
            ? "border-red-500/20 hover:border-red-500/30"
            : "border-white/[0.06] hover:border-white/[0.1]",
        integration.comingSoon && "opacity-60",
      )}
    >
      {/* Popular badge */}
      {integration.popular && !isConnected && (
        <div className="absolute -top-2.5 right-4 rounded-full border border-violet-500/30 bg-violet-600/20 px-2.5 py-0.5 text-[10px] font-semibold text-violet-400">
          POPULAR
        </div>
      )}

      {/* Coming soon badge */}
      {integration.comingSoon && (
        <div className="absolute -top-2.5 right-4 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500">
          COMING SOON
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            integration.iconBg,
          )}
        >
          {/* Check point */}
          {integration.icon}
          {/* <Icon className={cn("h-5 w-5", integration.iconColor)} /> */}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-zinc-100">
              {integration.name}
            </h3>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
              {categoryLabels[integration.category]}
            </span>
          </div>
          <div className="mt-1">
            <StatusBadge status={integration.status} />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] leading-relaxed text-zinc-500">
        {integration.description}
      </p>

      {/* Connected account info */}
      {(isConnected || isError) && integration.connectedAccount && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2.5",
            isError
              ? "border-red-500/20 bg-red-500/5"
              : "border-white/[0.06] bg-white/[0.02]",
          )}
        >
          {isError && (
            <div className="mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[11px] font-medium text-red-400">
                Authentication expired — reconnect to resume
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-600">Connected account</p>
              <p className="mt-0.5 text-[12px] font-medium text-zinc-300">
                {integration.connectedAccount}
              </p>
            </div>
            {integration.lastSync && (
              <div className="text-right">
                <p className="text-[11px] text-zinc-600">Last sync</p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] font-medium",
                    isError ? "text-red-400" : "text-zinc-400",
                  )}
                >
                  {integration.lastSync}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature chips */}
      <div className="flex flex-wrap gap-1.5">
        {integration?.features?.map((f) => (
          <span
            key={f}
            className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-500"
          >
            {f}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {integration.comingSoon ? (
          <button
            disabled
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 text-[12px] font-medium text-zinc-600 cursor-not-allowed"
          >
            Notify me
          </button>
        ) : isConnected ? (
          <>
            <button
              onClick={() => onSync(integration.id)}
              disabled={isSyncing}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync now
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200">
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDisconnect(integration.id)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] font-medium text-red-400 transition hover:bg-red-500/10"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </>
        ) : isError ? (
          <button
            onClick={() => onConnect(integration.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-[12px] font-medium text-red-400 transition hover:bg-red-500/15"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reconnect
          </button>
        ) : (
          <button
            onClick={() => onConnect(integration.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-2 text-[12px] font-medium text-white transition hover:bg-violet-500"
          >
            Connect
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectModal({
  integration,
  onClose,
  onConfirm,
}: {
  integration: Integration & { icon: React.ReactNode };
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<"idle" | "connecting" | "done">("idle");
  // const Icon = integration.iconName;

  const handleConnect = () => {
    setStep("connecting");
    setTimeout(() => {
      setStep("done");
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 shadow-2xl">
        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-white">
                {integration.name} connected!
              </h3>
              <p className="mt-1 text-[13px] text-zinc-500">
                Your integration is live and syncing.
              </p>
            </div>
            <button
              onClick={onConfirm}
              className="mt-2 w-full rounded-lg bg-violet-600 py-2.5 text-[13px] font-medium text-white transition hover:bg-violet-500"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border",
                  integration.iconBg,
                )}
              >
                {/* TODO: checkpoint */}
                {integration.icon}
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">
                  Connect {integration.name}
                </h3>
                <p className="text-[12px] text-zinc-500">
                  Authorize access to complete integration
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600 mb-3">
                Permissions required
              </p>
              {integration?.features?.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[13px] text-zinc-400">{f}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex flex-1 items-center justify-center rounded-lg border border-white/[0.08] py-2.5 text-[13px] font-medium text-zinc-400 transition hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={step === "connecting"}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-[13px] font-medium text-white transition hover:bg-violet-500 disabled:opacity-70"
              >
                {step === "connecting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Authorize & Connect
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [availableIntegrations, setAvailableIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [connecting, setConnecting] = useState<
    (Integration & { icon: React.ReactNode }) | null
  >(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "tenants", user.uid), (doc) => {
      if (doc.exists()) {
        setTenant(doc.data());
      }
    });

    const unsubAvailable = onSnapshot(
      collection(db, "available_integrations"),
      (snapshot) => {
        // Filter out items that the admin has not published
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item: any) => item.published === true); // <--- Add this filter

        setAvailableIntegrations(data);
        setLoading(false);
      },
    );

    return () => {
      unsub();
      unsubAvailable();
    };
  }, [user]);

  // Derive items by merging static metadata with live Firestore status
  // Hide Google Calendar, HubSpot, GoHighLevel integrations if not implemented
  const items: Integration[] = availableIntegrations
    .filter((item) => {
      const key = (item.service || item.id || "").toLowerCase();
      // Hide these integrations unless implemented
      if (["google_calendar", "hubspot", "gohighlevel"].includes(key)) {
        return !!item.comingSoon;
      }
      return true;
    })
    .map((item) => {
      const firestoreKey = item.id.replace(/-([a-z])/g, (g: any) =>
        g[1].toUpperCase(),
      );
      const dynamic = tenant?.integrations?.[firestoreKey];

      // Add icon and oauthUrl to satisfy type
      return {
        ...item,
        icon: (
          <DynamicIcon
            name={item.iconName}
            className={cn("h-5 w-5", item.iconColor)}
          />
        ),
        oauthUrl: item.oauthUrl || undefined,
        status: dynamic
          ? (dynamic.status as IntegrationStatus) ||
            (dynamic.connected ? "connected" : "disconnected")
          : "disconnected",
        connectedAccount: dynamic?.connectedAccount || dynamic?.account,
        lastSync: dynamic?.lastSync,
      } as Integration;
    });

  const connectedCount = items.filter((i) => i.status === "connected").length;
  const errorCount = items.filter((i) => i.status === "error").length;

  const _categories = items.reduce((acc, item) => {
    if (!acc.includes(item.category)) {
      acc.push(item.category);
    }
    return acc;
  }, [] as string[]);

  const categories = ["all", ..._categories];

  const filtered =
    activeFilter === "all"
      ? items
      : items.filter((i) => i.category === activeFilter);

  const handleConnect = (id: string) => {
    const integration = items.find((i) => i.id === id);
    if (integration) setConnecting({ ...integration, icon: integration.icon });
  };

  const handleConnectConfirm = async () => {
    if (!connecting || !user) return;

    const firestoreKey = connecting.id.replace(/-([a-z])/g, (g) =>
      g[1].toUpperCase(),
    );
    const path = `integrations.${firestoreKey}`;
    // Simulate OAuth redirect for integrations that require it
    if (connecting?.oauthUrl) {
      window.location.href = connecting.oauthUrl + `?tenant=${user.uid}`;
      return;
    }
    await updateDoc(doc(db, "tenants", user.uid), {
      [path]: {
        connected: true,
        status: connecting?.oauthUrl ? "pending" : "connected",
        connectedAccount: connecting?.oauthUrl
          ? "Pending OAuth"
          : "Connected account",
        lastSync: "Just now",
      },
    });

    setConnecting(null);
  };

  const handleDisconnect = async (id: string) => {
    if (!user) return;

    const firestoreKey = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const path = `integrations.${firestoreKey}`;
    await updateDoc(doc(db, "tenants", user.uid), {
      [path]: {
        connected: false,
        status: "disconnected",
      },
    });
  };

  const handleSync = async (id: string) => {
    if (!user) return;

    const firestoreKey = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    await updateDoc(doc(db, "tenants", user.uid), {
      [`integrations.${firestoreKey}.status`]: "syncing",
    });

    setTimeout(() => {
      updateDoc(doc(db, "tenants", user.uid), {
        [`integrations.${firestoreKey}.status`]: "connected",
        [`integrations.${firestoreKey}.lastSync`]: "Just now",
      });
    }, 2500);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading integrations...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Integrations
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Connect your tools to automate booking, follow-ups, and CRM sync
          </p>
        </div>
        <a
          href="https://docs.receptionly.ai/integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-zinc-900/80 px-3 py-2 text-[13px] font-medium text-zinc-400 transition hover:border-white/[0.1] hover:text-zinc-200"
        >
          Docs
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Connected",
            value: connectedCount,
            color: "text-emerald-400",
            dot: "bg-emerald-500",
          },
          {
            label: "Available",
            value: items.filter(
              (i) => i.status === "disconnected" && !i.comingSoon,
            ).length,
            color: "text-zinc-300",
            dot: "bg-zinc-500",
          },
          {
            label: "Needs attention",
            value: errorCount,
            color: errorCount > 0 ? "text-red-400" : "text-zinc-500",
            dot: errorCount > 0 ? "bg-red-500" : "bg-zinc-700",
          },
        ].map(({ label, value, color, dot }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-900/80 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", dot)} />
              <span className="text-[13px] text-zinc-500">{label}</span>
            </div>
            <span
              className={cn("text-[18px] font-semibold tabular-nums", color)}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {errorCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-[13px] font-medium text-red-400">
              {errorCount} integration{errorCount > 1 ? "s need" : " needs"}{" "}
              attention
            </p>
            <p className="mt-0.5 text-[12px] text-red-400/70">
              Reconnect your expired integrations to resume syncing and avoid
              missed appointments.
            </p>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[12px] font-medium capitalize transition",
              activeFilter === cat
                ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:border-white/[0.1] hover:text-zinc-300",
            )}
          >
            {cat === "all"
              ? "All integrations"
              : categoryLabels[cat as Integration["category"]]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
          />
        ))}
      </div>

      {/* Webhook CTA */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-900/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
            <Phone className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-white">
              Need a custom integration?
            </p>
            <p className="text-[12px] text-zinc-500">
              Use our REST API or webhooks to connect any tool
            </p>
          </div>
        </div>
        <a
          href="/settings"
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3.5 py-2 text-[12px] font-medium text-zinc-300 transition hover:bg-zinc-700"
        >
          API settings
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="h-4" />

      {/* Connect Modal */}
      {connecting && (
        <ConnectModal
          integration={connecting}
          onClose={() => setConnecting(null)}
          onConfirm={handleConnectConfirm}
        />
      )}
    </div>
  );
}
