"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  ChevronRight,
  Building2,
  Zap,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

export default function AdminTenantEditPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    plan: "starter",
    minutesLimit: 500,
  });

  useEffect(() => {
    async function fetchTenant() {
      if (!tenantId) return;
      try {
        const docRef = doc(db, "tenants", tenantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            name: data.name || "",
            email: data.email || "",
            plan: data.plan || "starter",
            minutesLimit: data.minutesLimit || 500,
          });
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTenant();
  }, [tenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, "tenants", tenantId), formData);
      router.push(`/admin/tenants/${tenantId}`);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium">Retrieving configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Link
                href="/admin/tenants"
                className="hover:text-emerald-400 transition-colors"
              >
                Tenants
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/admin/tenants/${tenantId}`}
                className="hover:text-emerald-400 transition-colors"
              >
                Details
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-zinc-300">Edit Settings</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Edit Tenant Account
        </h1>
        <p className="text-sm text-zinc-500">
          Update business identity and platform restrictions for{" "}
          <span className="text-zinc-300 font-medium">{formData.name}</span>.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border-white/[0.06] bg-zinc-900/80">
          <CardHeader className="border-b border-white/[0.06] py-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-400">
                  Company Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.08] focus-visible:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-400">
                  Account Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.08] focus-visible:ring-emerald-500/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-zinc-900/80">
          <CardHeader className="border-b border-white/[0.06] py-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Account Quotas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-400">
                  Subscription Plan
                </label>
                <select
                  value={formData.plan}
                  onChange={(e) =>
                    setFormData({ ...formData, plan: e.target.value as any })
                  }
                  className="w-full rounded-md border border-white/[0.08] bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/50 transition-colors text-zinc-300"
                >
                  <option value="starter">Starter Plan</option>
                  <option value="growth">Growth Plan</option>
                  <option value="pro">Pro Plan</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-400">
                  Minute Allowance
                </label>
                <Input
                  type="number"
                  value={formData.minutesLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minutesLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-white/[0.03] border-white/[0.08] focus-visible:ring-emerald-500/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-200/60 leading-relaxed">
            <span className="font-bold text-amber-400">Warning:</span> Manual
            changes to plans or quotas bypass Stripe synchronization. Verify
            changes correspond to the tenant's current subscription agreement to
            avoid billing discrepancies.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px] shadow-lg shadow-emerald-900/20"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Updating..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
