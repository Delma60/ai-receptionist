"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  collectionGroup,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/Button";

// FIX 8: Plan price map — single source of truth matching PLAN_LIMITS in types/index.ts
const PLAN_PRICE: Record<string, number> = {
  starter: 49,
  growth: 149,
  pro: 349,
};

interface ChartPoint {
  date: string;
  amount: number;
  fullDate: string;
}

interface RevenueStats {
  mrr: number;
  netRevenue: number;
  activeSubs: number;
  planBreakdown: { starter: number; growth: number; pro: number };
  avgRevenuePerUser: number;
  trendData: ChartPoint[];
}

export default function AdminRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<RevenueStats>({
    mrr: 0,
    netRevenue: 0,
    activeSubs: 0,
    planBreakdown: { starter: 0, growth: 0, pro: 0 },
    avgRevenuePerUser: 0,
    trendData: [],
  });

  const RevenueTrendChart = ({ data }: { data: ChartPoint[] }) => {
    const maxAmount = Math.max(...data.map((d) => d.amount), 1);
    return (
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Daily Revenue Trend</h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">Net revenue from paid invoices · Last 30 days</p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-40">
          {data.map((d, i) => {
            const h = d.amount === 0 ? 2 : Math.round((d.amount / maxAmount) * 140);
            return (
              <div key={i} className="group relative flex-1 flex flex-col items-center gap-2">
                <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-950 px-2.5 py-1.5 text-[10px] text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 border border-white/10 shadow-2xl">
                  <p className="font-semibold text-white">{d.date}</p>
                  <p className="text-emerald-400 font-mono">${d.amount.toLocaleString()}</p>
                </div>
                <div 
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-300",
                    d.amount > 0 ? "bg-emerald-500/40 group-hover:bg-emerald-500/80" : "bg-zinc-800/20"
                  )}
                  style={{ height: h }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between text-[10px] text-zinc-600 px-1">
          <span>{data[0]?.date}</span>
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  const fetchRevenueData = async () => {
    try {
      const dailyMap: Record<string, number> = {};
      const initialTrend: ChartPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toDateString();
        dailyMap[ds] = 0;
        initialTrend.push({
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          fullDate: ds,
          amount: 0
        });
      }

      // FIX 8: Real MRR aggregation from live tenant plan data
      const tenantsSnap = await getDocs(collection(db, "tenants"));
      let totalMrr = 0;
      let subsCount = 0;
      const planBreakdown = { starter: 0, growth: 0, pro: 0 };

      tenantsSnap.docs.forEach((d) => {
        const plan = (d.data().plan || "starter") as keyof typeof planBreakdown;
        subsCount++;
        totalMrr += PLAN_PRICE[plan] ?? 0;
        if (plan in planBreakdown) planBreakdown[plan]++;
      });

      // FIX 8: Real net revenue from paid invoices in last 30 days
      // using collectionGroup for platform-wide invoice query
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let totalNetRevenue = 0;
      try {
        const invoicesSnap = await getDocs(
          query(
            collectionGroup(db, "invoices"),
            where("status", "==", "paid"),
            where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
          ),
        );
        invoicesSnap.docs.forEach((inv) => {
          totalNetRevenue += inv.data().amount || 0;
          const data = inv.data();
          totalNetRevenue += data.amount || 0;

          const dateStr = data.createdAt?.toDate?.().toDateString();
          if (dateStr && dailyMap[dateStr] !== undefined) dailyMap[dateStr] += data.amount || 0;
        });
      } catch (err) {
        // collectionGroup query may need a Firestore index — fall back to per-tenant aggregation
        console.warn(
          "[revenue] collectionGroup query failed, falling back:",
          err,
        );
        await Promise.all(
          tenantsSnap.docs.map(async (tenantDoc) => {
            const invSnap = await getDocs(
              collection(db, "tenants", tenantDoc.id, "invoices"),
            );
            invSnap.docs.forEach((inv) => {
              const data = inv.data();
              if (
                data.status === "paid" &&
                data.createdAt?.toDate &&
                data.createdAt.toDate() >= thirtyDaysAgo
              ) {
                totalNetRevenue += data.amount || 0;

                const dateStr = data.createdAt.toDate().toDateString();
                if (dailyMap[dateStr] !== undefined) dailyMap[dateStr] += data.amount || 0;
              }
            });
          }),
        );
      }

      const avgRevenuePerUser =
        subsCount > 0 ? Math.round(totalMrr / subsCount) : 0;

      const trendData = initialTrend.map(p => ({
        ...p,
        amount: dailyMap[p.fullDate] || 0
      }));

      setStats({
        mrr: totalMrr,
        netRevenue: Math.round(totalNetRevenue),
        activeSubs: subsCount,
        planBreakdown,
        avgRevenuePerUser,
        trendData,
      });
    } catch (err) {
      console.error("Error fetching revenue data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRevenueData();
  };

  const totalPlanned =
    stats.planBreakdown.starter +
    stats.planBreakdown.growth +
    stats.planBreakdown.pro;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Platform Revenue
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live MRR, subscriptions, and 30-day net revenue from Firestore.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="h-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white"
          >
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Est. MRR",
                value: `$${stats.mrr.toLocaleString()}`,
                icon: TrendingUp,
                color: "text-emerald-400",
                sub: "From active plan subscriptions",
              },
              {
                label: "Net Revenue (30d)",
                value: `$${stats.netRevenue.toLocaleString()}`,
                icon: DollarSign,
                color: "text-violet-400",
                sub: "Paid invoices last 30 days",
              },
              {
                label: "Active Subscribers",
                value: stats.activeSubs.toLocaleString(),
                icon: Users,
                color: "text-sky-400",
                sub: "Paying organizations",
              },
              {
                label: "ARPU",
                value: `$${stats.avgRevenuePerUser}`,
                icon: TrendingUp,
                color: "text-amber-400",
                sub: "Average revenue per user",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
                    {stat.label}
                  </p>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-zinc-600 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Plan breakdown */}
          {totalPlanned > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5">
              <p className="text-[12px] font-medium uppercase tracking-widest text-zinc-600 mb-4">
                Revenue by Plan
              </p>
              <div className="space-y-3">
                {(
                  [
                    {
                      key: "pro",
                      label: "Pro",
                      price: 349,
                      color: "bg-violet-500",
                    },
                    {
                      key: "growth",
                      label: "Growth",
                      price: 149,
                      color: "bg-sky-500",
                    },
                    {
                      key: "starter",
                      label: "Starter",
                      price: 49,
                      color: "bg-zinc-600",
                    },
                  ] as const
                ).map(({ key, label, price, color }) => {
                  const count = stats.planBreakdown[key];
                  const revenue = count * price;
                  const pct = stats.mrr > 0 ? (revenue / stats.mrr) * 100 : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", color)} />
                          <span className="text-zinc-300">{label}</span>
                          <span className="text-zinc-600">
                            ({count} tenants)
                          </span>
                        </div>
                        <span className="text-zinc-300 font-medium">
                          ${revenue.toLocaleString()}/mo
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={cn("h-full rounded-full", color)}
                          style={{ width: `${pct}%`, opacity: 0.8 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Placeholder for future chart */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-zinc-500 text-sm">MRR trend chart coming soon…</p>
      </div>
      {/* Revenue Trend Chart */}
      {!loading && stats.trendData.length > 0 && <RevenueTrendChart data={stats.trendData} />}
    </div>
  );
}
