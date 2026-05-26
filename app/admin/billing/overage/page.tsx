"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Users, 
  Zap, 
  Loader2, 
  Search,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TenantOverage {
  id: string;
  name: string;
  email: string;
  minutesUsed: number;
  minutesLimit: number;
  plan: string;
}

export default function OverageReportPage() {
  const [tenants, setTenants] = useState<TenantOverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingId, setBillingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Fetch and filter overage tenants in-memory (Firestore doesn't support cross-field comparison queries)
    const unsubscribe = onSnapshot(collection(db, "tenants"), (snap) => {
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(t => (t.minutesUsed || 0) > (t.minutesLimit || 0))
        .map(t => ({
          id: t.id,
          name: t.name || "Unnamed Tenant",
          email: t.email || "No email",
          minutesUsed: t.minutesUsed || 0,
          minutesLimit: t.minutesLimit || 0,
          plan: t.plan || "starter"
        }));
      
      setTenants(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleBillOverage = async (tenantId: string, name: string) => {
    if (!confirm(`Generate and finalize Stripe invoice for ${name}?`)) return;
    
    setBillingId(tenantId);
    try {
      const res = await fetch("/api/admin/billing/overage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (!res.ok) throw new Error("Billing process failed");
      alert("Invoice generated and finalized successfully.");
    } catch (err) {
      console.error(err);
      alert("Could not process overage billing. Check logs.");
    } finally {
      setBillingId(null);
    }
  };

  const filtered = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalOverage = tenants.reduce((acc, t) => acc + (t.minutesUsed - t.minutesLimit), 0);
  const projectedRevenue = totalOverage * 0.08;

  if (loading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        <p className="text-[13px] text-zinc-500">Scanning for unbilled usage…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Overage Report</h1>
          <p className="mt-1 text-sm text-zinc-500">Captured revenue from usage exceeding plan limits.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5">
          <Users className="h-4 w-4 text-zinc-500 mb-3" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Tenants Over Limit</p>
          <p className="text-2xl font-bold text-white mt-1">{tenants.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5">
          <Zap className="h-4 w-4 text-zinc-500 mb-3" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Total Overage Mins</p>
          <p className="text-2xl font-bold text-white mt-1">{totalOverage.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <TrendingUp className="h-4 w-4 text-emerald-400 mb-3" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500/60">Estimated Revenue</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${projectedRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search affected tenants…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 bg-zinc-900/50 border-white/[0.08] text-[13px]"
          />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            <span>Tenant</span>
            <span className="text-right">Usage / Limit</span>
            <span className="text-right">Overage</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((t) => (
              <div key={t.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center">
                <div>
                  <p className="text-[13px] font-semibold text-zinc-200">{t.name}</p>
                  <p className="text-[11px] text-zinc-500">{t.email}</p>
                </div>
                <p className="text-right font-mono text-[12px] text-zinc-400">{t.minutesUsed} / {t.minutesLimit}</p>
                <p className="text-right font-mono text-[12px] text-amber-400">+{t.minutesUsed - t.minutesLimit}</p>
                <p className="text-right font-mono text-[12px] font-bold text-white">${((t.minutesUsed - t.minutesLimit) * 0.08).toFixed(2)}</p>
                <div className="text-right">
                  <Button size="sm" onClick={() => handleBillOverage(t.id, t.name)} disabled={billingId === t.id} className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-[11px]">
                    {billingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                    Bill Overage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}