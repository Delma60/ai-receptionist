"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  ShieldCheck,
  Save,
  ChevronRight,
  CheckCircle2,
  Zap,
  ExternalLink,
  Building2,
  Webhook,
  Code,
  Loader2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { openBillingPortal, parseCheckoutStatus } from "./billing-action";

// ── Plan config ───────────────────────────────────────────────────────────────

const PLAN_META: Record<
  string,
  {
    label: string;
    price: string;
    minutes: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  starter: {
    label: "Starter",
    price: "$49/mo",
    minutes: "100 min",
    color: "text-zinc-300",
    bg: "bg-zinc-800",
    border: "border-zinc-700",
  },
  growth: {
    label: "Growth",
    price: "$149/mo",
    minutes: "500 min",
    color: "text-violet-300",
    bg: "bg-violet-600/10",
    border: "border-violet-500/20",
  },
  pro: {
    label: "Pro",
    price: "$349/mo",
    minutes: "2,000 min",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Checkout redirect feedback
  const [checkoutBanner, setCheckoutBanner] = useState<{
    type: "success" | "error" | "cancelled";
    message: string;
  } | null>(null);

  // Parse ?checkout= param on mount
  useEffect(() => {
    const { status, plan } = parseCheckoutStatus(searchParams);
    if (status === "success") {
      setCheckoutBanner({
        type: "success",
        message: plan
          ? `Successfully upgraded to ${PLAN_META[plan]?.label ?? plan}! Your new limits are active.`
          : "Subscription updated successfully!",
      });
      // Clean the URL
      router.replace("/settings?tab=billing");
    } else if (status === "cancelled") {
      setCheckoutBanner({
        type: "cancelled",
        message: "Checkout was cancelled.",
      });
      router.replace("/settings?tab=billing");
    } else if (status === "error") {
      setCheckoutBanner({
        type: "error",
        message: "Payment failed. Please try again.",
      });
      router.replace("/settings?tab=billing");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "tenants", user.uid), (doc) => {
      if (doc.exists()) setTenant(doc.data());
    });
    const unsubInvoices = onSnapshot(
      query(
        collection(db, "tenants", user.uid, "invoices"),
        orderBy("createdAt", "desc"),
        limit(5),
      ),
      (snapshot) => {
        setInvoices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
    return () => {
      unsub();
      unsubInvoices();
    };
  }, [user]);

  const handleSave = async () => {
    if (!user || !tenant) return;
    setIsSaving(true);
    await updateDoc(doc(db, "tenants", user.uid), tenant);
    setIsSaving(false);
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    const err = await openBillingPortal();
    if (err) setPortalError(err);
    setPortalLoading(false);
  };

  const plan = tenant?.plan || "starter";
  const planMeta = PLAN_META[plan] ?? PLAN_META.starter;
  const usagePct = Math.min(
    ((tenant?.minutesUsed || 0) / Math.max(tenant?.minutesLimit || 100, 1)) *
      100,
    100,
  );

  const defaultTab = searchParams.get("tab") || "general";

  if (!tenant)
    return (
      <div className="flex h-screen items-center justify-center text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading settings...
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Settings
          </h1>
          <p className="text-zinc-500">
            Manage your workspace, billing, and global configurations.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 bg-violet-600 hover:bg-violet-500"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
      </div>

      {/* Checkout status banner */}
      {checkoutBanner && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3",
            checkoutBanner.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10"
              : checkoutBanner.type === "cancelled"
                ? "border-zinc-700 bg-zinc-800/60"
                : "border-red-500/20 bg-red-500/10",
          )}
        >
          {checkoutBanner.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          )}
          <p
            className={cn(
              "text-[13px] font-medium",
              checkoutBanner.type === "success"
                ? "text-emerald-400"
                : "text-zinc-400",
            )}
          >
            {checkoutBanner.message}
          </p>
          <button
            onClick={() => setCheckoutBanner(null)}
            className="ml-auto text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Theme toggle */}
      <div className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-zinc-900/80 p-4">
        <span className="text-zinc-300 font-medium text-sm">Dark Mode</span>
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked: boolean) =>
            setTheme(checked ? "dark" : "light")
          }
        />
        <span className="text-xs text-zinc-500 capitalize">
          ({theme === "system" ? "System" : theme})
        </span>
        <button
          className="ml-4 text-xs text-violet-400 hover:underline"
          onClick={() => setTheme(theme === "system" ? "light" : "system")}
        >
          {theme === "system" ? "Disable system" : "Use system"}
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-zinc-900/60 border border-white/[0.06] p-1 h-11">
          <TabsTrigger
            value="general"
            className="gap-2 data-[state=active]:bg-white/[0.08] px-4"
          >
            <Building2 className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="gap-2 data-[state=active]:bg-white/[0.08] px-4"
          >
            <CreditCard className="h-4 w-4" /> Billing
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="gap-2 data-[state=active]:bg-white/[0.08] px-4"
          >
            <Zap className="h-4 w-4" /> Integrations
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="gap-2 data-[state=active]:bg-white/[0.08] px-4"
          >
            <ShieldCheck className="h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        {/* ── General ─────────────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-8 space-y-6">
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-lg">Business Profile</CardTitle>
              <CardDescription className="text-zinc-500">
                How your business appears to callers and on invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-400">
                    Company name
                  </label>
                  <Input
                    value={tenant.name || ""}
                    onChange={(e) =>
                      setTenant({ ...tenant, name: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.08]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-400">
                    Primary email
                  </label>
                  <Input
                    value={tenant.email || ""}
                    onChange={(e) =>
                      setTenant({ ...tenant, email: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.08]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-400">
                  Office address
                </label>
                <Textarea
                  value={tenant.address || ""}
                  onChange={(e) =>
                    setTenant({ ...tenant, address: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.08] resize-none"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-lg">Communication</CardTitle>
              <CardDescription className="text-zinc-500">
                Global defaults for your AI receptionists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-400">
                    Default transfer number
                  </label>
                  <Input
                    value={tenant.supportPhone || ""}
                    onChange={(e) =>
                      setTenant({ ...tenant, supportPhone: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.08]"
                    placeholder="+1 (555) 000-0000"
                  />
                  <p className="text-[11px] text-zinc-600">
                    The human line agents transfer calls to by default.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-400">
                    Timezone
                  </label>
                  <select className="w-full rounded-md border border-white/[0.08] bg-zinc-900 px-3 py-2 text-[13px] text-white focus:border-violet-500 outline-none">
                    <option>Pacific Time (PT)</option>
                    <option>Eastern Time (ET)</option>
                    <option>UTC</option>
                    <option>Africa/Lagos</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Billing ──────────────────────────────────────────────────────── */}
        <TabsContent value="billing" className="mt-8 space-y-6">
          {/* Current plan card */}
          <Card className={cn("border bg-zinc-900/80", planMeta.border)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                        planMeta.bg,
                        planMeta.color,
                      )}
                    >
                      {planMeta.label}
                    </span>
                    <span className="text-[12px] text-zinc-500">plan</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {planMeta.price}
                  </p>
                  <p className="text-[12px] text-zinc-500 mt-0.5">
                    {planMeta.minutes} included · ${(0.08).toFixed(2)}/min
                    overage
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Upgrade button */}
                  {plan !== "pro" && (
                    <Button
                      onClick={() => setShowUpgradeModal(true)}
                      className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
                      size="sm"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Upgrade
                    </Button>
                  )}

                  {/* Billing portal */}
                  {tenant?.stripeCustomerId && (
                    <Button
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-white/[0.06] text-zinc-400 hover:text-white"
                    >
                      {portalLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                      Manage
                    </Button>
                  )}
                </div>
              </div>

              {/* Portal error */}
              {portalError && (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  <p className="text-[12px] text-red-400">{portalError}</p>
                </div>
              )}

              {/* Usage bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-[12px] text-zinc-500 mb-1.5">
                  <span>Monthly usage</span>
                  <span className="font-medium text-zinc-300">
                    {tenant?.minutesUsed || 0} / {tenant?.minutesLimit || 100}{" "}
                    min
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      usagePct >= 90
                        ? "bg-red-500"
                        : usagePct >= 70
                          ? "bg-amber-500"
                          : "bg-violet-500",
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                {usagePct >= 80 && (
                  <p className="mt-1.5 text-[11px] text-amber-400">
                    Approaching your limit — consider upgrading.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Payment method */}
            <Card className="lg:col-span-2 border-white/[0.06] bg-zinc-900/80">
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
                <CardDescription>
                  Manage your card and billing details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant?.paymentMethod || tenant?.stripeCustomerId ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-12 rounded bg-zinc-800 flex items-center justify-center border border-white/[0.06]">
                        <span className="text-[10px] font-bold text-zinc-400">
                          {tenant.paymentMethod?.brand?.toUpperCase() || "CARD"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white">
                          ···· {tenant.paymentMethod?.last4 || "****"}
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          Expires {tenant.paymentMethod?.expiry || "—"}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] border-white/[0.06]"
                    >
                      {portalLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Update
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center">
                    <p className="text-[13px] text-zinc-500">
                      No payment method on file.
                    </p>
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="mt-2 text-[12px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Add a card by upgrading →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card className="border-white/[0.06] bg-zinc-900/80">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-zinc-200">
                          {inv.createdAt?.toDate
                            ? inv.createdAt.toDate().toLocaleDateString()
                            : "Recent"}
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          #{(inv.invoiceNumber || inv.id || "").slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-[12px] font-medium text-zinc-300">
                            ${inv.amount?.toFixed(2)}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-medium capitalize",
                              inv.status === "paid"
                                ? "text-emerald-400"
                                : inv.status === "failed"
                                  ? "text-red-400"
                                  : "text-amber-400",
                            )}
                          >
                            {inv.status || "paid"}
                          </span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-zinc-600 text-sm">
                    No invoices yet.
                  </p>
                )}
                {tenant?.stripeCustomerId && (
                  <div className="p-4 text-center">
                    <button
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      className="text-[11px] text-violet-400 hover:underline disabled:opacity-50"
                    >
                      View all in billing portal →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Integrations / Developer ─────────────────────────────────────── */}
        <TabsContent value="integrations" className="mt-8 space-y-6">
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="h-5 w-5 text-violet-400" />
                Developer API
              </CardTitle>
              <CardDescription>
                Use your API keys to build custom integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-400">
                  Secret API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    readOnly
                    value={tenant.apiKey || "sk_live_••••••••••••••••"}
                    className="bg-white/[0.03] border-white/[0.08] font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    className="border-white/[0.06] bg-zinc-900 shrink-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "Hide" : "Reveal"}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Never expose this in client-side code.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5 text-emerald-400" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Receive events when calls complete or bookings are made.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-400">
                  Global Webhook URL
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://your-server.com/webhook"
                    value={tenant.webhookUrl || ""}
                    onChange={(e) =>
                      setTenant({ ...tenant, webhookUrl: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.08] text-[13px]"
                  />
                  <Button
                    variant="outline"
                    className="border-white/[0.06] bg-zinc-900 text-zinc-300 shrink-0"
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ─────────────────────────────────────────────────────── */}
        <TabsContent value="security" className="mt-8 space-y-6">
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-lg text-red-400">
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 border-t border-red-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-white">
                    Delete Workspace
                  </p>
                  <p className="text-[12px] text-zinc-500">
                    Permanently remove all agents, calls, and billing data.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
                >
                  Delete account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          currentPlan={plan as "starter" | "growth" | "pro"}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
