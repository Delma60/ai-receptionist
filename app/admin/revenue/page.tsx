"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Users, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/Button";

export default function AdminRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const snap = await getDocs(collection(db, "tenants"));
        let totalMrr = 0;
        let subsCount = 0;
        let totalNetRevenue = 0;
        const now = new Date();
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        );

        // For each tenant, aggregate invoices
        await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            subsCount++;
            const plan = data.plan || "starter";
            if (plan === "pro") totalMrr += 349;
            else if (plan === "growth") totalMrr += 149;
            else if (plan === "starter") totalMrr += 49;

            // Aggregate paid invoices in last 30 days
            const invoicesSnap = await getDocs(
              collection(db, "tenants", d.id, "invoices"),
            );
            invoicesSnap.forEach((inv) => {
              const invData = inv.data();
              if (
                invData.status === "paid" &&
                invData.createdAt &&
                invData.createdAt.toDate &&
                invData.createdAt.toDate() >= thirtyDaysAgo
              ) {
                totalNetRevenue += invData.amount || 0;
              }
            });
          }),
        );

        setMrr(totalMrr);
        setActiveSubs(subsCount);
        setNetRevenue(totalNetRevenue);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching revenue data:", err);
        setLoading(false);
      }
    };
    fetchRevenueData();
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Platform Revenue
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Monitor MRR, active subscriptions, and overall financial growth.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white"
        >
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>

      {/* ── Stats ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Est. MRR",
              value: `$${mrr.toLocaleString()}`,
              icon: TrendingUp,
              color: "text-emerald-400",
              sub: "Based on active plans",
            },
            {
              label: "Net Revenue",
              value: `$${netRevenue.toLocaleString()}`,
              icon: DollarSign,
              color: "text-violet-400",
              sub: "Last 30 days",
            },
            {
              label: "Active Subs",
              value: activeSubs.toLocaleString(),
              icon: Users,
              color: "text-sky-400",
              sub: "Paying organizations",
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
      )}

      {/* Placeholder for future revenue charts */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-zinc-500 text-sm">
          Revenue metrics visualization coming soon...
        </p>
      </div>
    </div>
  );
}
