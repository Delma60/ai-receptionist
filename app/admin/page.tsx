"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  PhoneCall,
  TrendingUp,
  Activity,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────
interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalCallsToday: number;
  totalMinutesToday: number;
  mrr: number;
}

interface ServiceHealth {
  firebase: boolean;
  vapi: boolean | null;
  twilio: boolean | null;
}

interface TenantRow {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: Timestamp | null;
  callCount: number;
}

interface PlanDist {
  starter: number;
  growth: number;
  pro: number;
}

// ── Helpers ────────────────────────────────────────────────────
const PLAN_PRICE: Record<string, number> = {
  starter: 49,
  growth: 149,
  pro: 349,
};

function fmtNum(n: number) {
  return n.toLocaleString();
}

function fmtDate(ts: Timestamp | null) {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Sub-components ─────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "text-emerald-400",
  bg = "bg-emerald-500/10",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  bg?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5 hover:border-white/[0.1] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2 rounded-lg border border-white/[0.06]", bg)}>
          <Icon className={cn("h-4 w-4", accent)} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-white tracking-tight">
        {typeof value === "number" ? fmtNum(value) : value}
      </p>
      <p className="mt-0.5 text-[13px] text-zinc-500">{label}</p>
      {sub && <p className="mt-1.5 text-[11px] text-zinc-600">{sub}</p>}
    </div>
  );
}

const planBadge: Record<string, string> = {
  starter: "bg-zinc-800 text-zinc-400",
  growth: "bg-sky-500/10 text-sky-400",
  pro: "bg-violet-500/10 text-violet-400",
};

// ── Main Page ──────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<ServiceHealth>({
    firebase: true,
    vapi: null,
    twilio: null,
  });

  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalTenants: 0,
    activeTenants: 0,
    totalCallsToday: 0,
    totalMinutesToday: 0,
    mrr: 0,
  });
  const [planDist, setPlanDist] = useState<PlanDist>({
    starter: 0,
    growth: 0,
    pro: 0,
  });
  const [recentTenants, setRecentTenants] = useState<TenantRow[]>([]);

  async function fetchData() {
    try {
      // 0. Fetch health status from internal ping routes
      try {
        const healthRes = await fetch("/api/admin/health");
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth((prev) => ({
            ...prev,
            vapi: healthData.vapiOk ?? null,
            twilio: healthData.twilioOk ?? null,
          }));
        }
      } catch (e) {
        console.error("Health check failed", e);
      }

      // 1. Try to get pre-aggregated platform metrics doc first
      const metricsDoc = await getDoc(doc(db, "platform", "metrics"));

      // 2. Fetch all tenants for counts / plan distribution
      const tenantsSnap = await getDocs(collection(db, "tenants"));
      const tenantDocs = tenantsSnap.docs;

      const dist: PlanDist = { starter: 0, growth: 0, pro: 0 };
      let computedMrr = 0;
      let activeTenants = 0;

      tenantDocs.forEach((d) => {
        const plan = (d.data().plan as string) || "starter";
        if (plan in dist) dist[plan as keyof PlanDist]++;
        computedMrr += PLAN_PRICE[plan] ?? 0;
        if (d.data().isActive !== false) activeTenants++;
      });

      setPlanDist(dist);

      // 3. Recent 5 tenants (sorted client-side since we already have them)
      const sorted = [...tenantDocs].sort((a, b) => {
        const aTs = a.data().createdAt?.seconds ?? 0;
        const bTs = b.data().createdAt?.seconds ?? 0;
        return bTs - aTs;
      });

      // 4. For each recent tenant, get their call count
      const recent: TenantRow[] = await Promise.all(
        sorted.slice(0, 8).map(async (d) => {
          const callsSnap = await getDocs(
            collection(db, "tenants", d.id, "calls"),
          );
          return {
            id: d.id,
            name: d.data().name || "Unnamed",
            email: d.data().email || "—",
            plan: d.data().plan || "starter",
            createdAt: d.data().createdAt || null,
            callCount: callsSnap.size,
          };
        }),
      );
      setRecentTenants(recent);

      // 5. Calls today across all tenants (try collectionGroup)
      let callsToday = 0;
      let minutesToday = 0;
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const callsSnap = await getDocs(
          query(
            collectionGroup(db, "calls"),
            where("createdAt", ">=", Timestamp.fromDate(todayStart)),
          ),
        );
        callsToday = callsSnap.size;
        callsSnap.docs.forEach((d) => {
          minutesToday += Math.round((d.data().duration ?? 0) / 60);
        });
      } catch {
        // collectionGroup may need index — fall back to 0
      }

      // 6. Merge with pre-aggregated metrics if available
      if (metricsDoc.exists()) {
        const m = metricsDoc.data() as Partial<PlatformMetrics>;
        setMetrics({
          totalTenants: tenantDocs.length,
          activeTenants: m.activeTenants ?? activeTenants,
          totalCallsToday: m.totalCallsToday ?? callsToday,
          totalMinutesToday: m.totalMinutesToday ?? minutesToday,
          mrr: m.mrr ?? computedMrr,
        });
      } else {
        setMetrics({
          totalTenants: tenantDocs.length,
          activeTenants,
          totalCallsToday: callsToday,
          totalMinutesToday: minutesToday,
          mrr: computedMrr,
        });
      }

      setError(null);
    } catch (err: any) {
      console.error("Admin fetch error:", err);
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Platform-wide overview — live from Firebase
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/80 px-3 py-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-red-400">
              Error loading data
            </p>
            <p className="text-[12px] text-red-400/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[108px] rounded-xl border border-white/[0.06] bg-zinc-900/80 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Tenants"
            value={metrics.totalTenants}
            sub={`${metrics.activeTenants} active`}
            icon={Users}
            accent="text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <StatCard
            label="MRR"
            value={`$${fmtNum(metrics.mrr)}`}
            sub="from active subscriptions"
            icon={TrendingUp}
            accent="text-violet-400"
            bg="bg-violet-500/10"
          />
          <StatCard
            label="Calls Today"
            value={metrics.totalCallsToday}
            sub={`${metrics.totalMinutesToday} min`}
            icon={PhoneCall}
            accent="text-sky-400"
            bg="bg-sky-500/10"
          />
          <StatCard
            label="Plan Distribution"
            value={`${planDist.pro} Pro`}
            sub={`${planDist.growth} Growth · ${planDist.starter} Starter`}
            icon={Activity}
            accent="text-amber-400"
            bg="bg-amber-500/10"
          />
        </div>
      )}

      {/* Plan breakdown bar */}
      {!loading && metrics.totalTenants > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5">
          <p className="text-[12px] font-medium uppercase tracking-widest text-zinc-600 mb-4">
            Plan Distribution
          </p>
          <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
            {(
              [
                { key: "starter", color: "bg-zinc-600", label: "Starter" },
                { key: "growth", color: "bg-sky-500", label: "Growth" },
                { key: "pro", color: "bg-violet-500", label: "Pro" },
              ] as const
            ).map(({ key, color, label }) => {
              const pct = metrics.totalTenants
                ? (planDist[key] / metrics.totalTenants) * 100
                : 0;
              return pct > 0 ? (
                <div
                  key={key}
                  className={cn("h-full rounded-sm", color)}
                  style={{ width: `${pct}%` }}
                  title={`${label}: ${planDist[key]}`}
                />
              ) : null;
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {(
              [
                { key: "starter", color: "bg-zinc-600", label: "Starter" },
                { key: "growth", color: "bg-sky-500", label: "Growth" },
                { key: "pro", color: "bg-violet-500", label: "Pro" },
              ] as const
            ).map(({ key, color, label }) => (
              <div
                key={key}
                className="flex items-center gap-1.5 text-[12px] text-zinc-400"
              >
                <span className={cn("h-2 w-2 rounded-full", color)} />
                {label}
                <span className="text-zinc-600">({planDist[key]})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent tenants table */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              Recent Tenants
            </h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              Newest registered accounts
            </p>
          </div>
          <Link
            href="/admin/tenants"
            className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-2.5 w-48 bg-zinc-800/60 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : recentTenants.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Users className="h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-[14px] font-medium text-zinc-400">
              No tenants found
            </p>
            <p className="text-[12px] text-zinc-600 mt-1">
              Tenant accounts will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-white/[0.04]">
              {["Name", "Email", "Plan", "Calls", "Joined"].map((h) => (
                <p
                  key={h}
                  className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
                >
                  {h}
                </p>
              ))}
            </div>

            <div className="divide-y divide-white/[0.04]">
              {recentTenants.map((t) => (
                <div
                  key={t.id}
                  className="group flex flex-col sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-center gap-2 sm:gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-[11px] font-bold text-white uppercase">
                      {t.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-200 truncate">
                        {t.name}
                      </p>
                      <p className="text-[11px] text-zinc-600 sm:hidden">
                        {t.email}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <p className="hidden sm:block text-[12px] text-zinc-500 truncate">
                    {t.email}
                  </p>

                  {/* Plan badge */}
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                      planBadge[t.plan] ?? "bg-zinc-800 text-zinc-400",
                    )}
                  >
                    {t.plan}
                  </span>

                  {/* Call count */}
                  <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 shrink-0">
                    <PhoneCall className="h-3 w-3 text-zinc-600" />
                    {t.callCount}
                  </div>

                  {/* Joined date */}
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 shrink-0">
                    <Clock className="h-3 w-3" />
                    {fmtDate(t.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* System health placeholder (can wire to real checks later) */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5">
        <p className="text-[12px] font-medium uppercase tracking-widest text-zinc-600 mb-4">
          Third-party Services
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { name: "Firebase", ok: health.firebase },
            { name: "Vapi", ok: health.vapi },
            { name: "Twilio", ok: health.twilio },
          ].map(({ name, ok }) => (
            <div
              key={name}
              className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              {ok === null ? (
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
              ) : ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className="text-[13px] text-zinc-300">{name}</span>
              <span className="ml-auto text-[11px] text-zinc-600">
                {ok === null ? "unchecked" : ok ? "ok" : "error"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
