"use client";

import { useState, useEffect } from "react";
import { useTheme, Theme } from "@/context/ThemeContext";
import { Switch } from "@/components/ui/switch";
import {
  User,
  CreditCard,
  Bell,
  ShieldCheck,
  Globe,
  Save,
  ChevronRight,
  CheckCircle2,
  Zap,
  Database,
  ExternalLink,
  Mail,
  Building2,
  Phone,
  Webhook,
  Code,
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

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  const [showApiKey, setShowApiKey] = useState(false);

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

  if (!tenant)
    return (
      <div className="flex h-screen items-center justify-center text-zinc-500">
        Loading settings...
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* ── Header ──────────────────────────────────────── */}
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
            "Saving..."
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save all changes
            </>
          )}
        </Button>
      </div>

      {/* ── Theme Toggle ────────────────────────────────── */}
      <div className="flex items-center gap-4 border border-white/[0.06] rounded-lg p-4 bg-zinc-900/80">
        <span className="text-zinc-300 font-medium">Dark Mode</span>
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked: boolean) =>
            setTheme(checked ? "dark" : "light")
          }
        />
        <span className="text-xs text-zinc-500">
          (
          {theme === "system"
            ? "System"
            : theme.charAt(0).toUpperCase() + theme.slice(1)}
          )
        </span>
        <button
          className="ml-4 text-xs text-violet-400 hover:underline"
          onClick={() => setTheme(theme === "system" ? "light" : "system")}
        >
          {theme === "system" ? "Disable System" : "Use System"}
        </button>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────── */}
      <Tabs defaultValue="general" className="w-full">
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

        {/* ── General Settings ──────────────────────────── */}
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
                  />
                  <p className="text-[11px] text-zinc-600">
                    The human line agents transfer to by default.
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
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Billing Settings ──────────────────────────── */}
        <TabsContent value="billing" className="mt-8 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-white/[0.06] bg-zinc-900/80">
              <CardHeader>
                <CardTitle className="text-lg">Subscription Plan</CardTitle>
                <CardDescription>
                  You are currently on the Growth plan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-xl bg-violet-600/10 border border-violet-500/20 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-violet-600 flex items-center justify-center text-white">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-wider">
                            {tenant.plan || "Starter"} Plan
                          </p>
                          <p className="text-[12px] text-violet-300/70">
                            Billed monthly
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                      >
                        Upgrade
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Monthly Usage</span>
                        <span className="text-white font-medium">
                          {tenant.minutesUsed || 0} /{" "}
                          {tenant.minutesLimit || 500} mins
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{
                            width: `${Math.min(((tenant.minutesUsed || 0) / Math.max(tenant.minutesLimit || 500, 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="text-[13px] font-medium text-zinc-300">
                      Payment Method
                    </h4>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-12 rounded bg-zinc-800 flex items-center justify-center border border-white/[0.06]">
                          <span className="text-[10px] font-bold text-zinc-400">
                            VISA
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-white">
                            {tenant.paymentMethod?.brand || "VISA"} ••••{" "}
                            {tenant.paymentMethod?.last4 || "4242"}
                          </p>
                          <p className="text-[11px] text-zinc-600">
                            Expires {tenant.paymentMethod?.expiry || "12/28"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] border-white/[0.06]"
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                            : inv.date || "Recent"}
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          #{inv.invoiceNumber || inv.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-medium text-zinc-400">
                          ${inv.amount}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-zinc-600 text-sm">
                    No invoices found.
                  </p>
                )}
                <div className="p-4 text-center">
                  <button className="text-[11px] text-violet-400 hover:underline">
                    View billing portal
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Custom Integrations Settings ─────────────────────── */}
        <TabsContent value="integrations" className="mt-8 space-y-6">
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="h-5 w-5 text-violet-400" />
                Developer API
              </CardTitle>
              <CardDescription>
                Use your API keys to build custom integrations with your own
                platform.
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
                    value={tenant.apiKey || "••••••••••••••••"}
                    className="bg-white/[0.03] border-white/[0.08] font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    className="border-white/[0.06] bg-zinc-900"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "Hide" : "Reveal"}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  Keep this key secure. Never expose it in client-side code.
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
                Listen to events (like completed calls or new bookings) to
                trigger workflows in external tools.
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
                    className="border-white/[0.06] bg-zinc-900 text-zinc-300"
                  >
                    Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Settings ─────────────────────────── */}
        <TabsContent value="security" className="mt-8 space-y-6">
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-lg text-red-400">
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions for your account and data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 border-t border-red-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-white">
                    Delete Workspace
                  </p>
                  <p className="text-[12px] text-zinc-500">
                    Permanently remove all agents, call logs, and billing data.
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
    </div>
  );
}

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: any;
  connected: boolean;
  color: string;
}

function IntegrationCard({
  name,
  description,
  icon: Icon,
  connected,
  color,
}: IntegrationCardProps) {
  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between h-[140px] transition-all hover:border-white/[0.1] hover:bg-white/[0.04]">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center text-white",
            color,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </span>
        ) : (
          <span className="text-[10px] font-medium text-zinc-600 px-2 py-0.5 rounded-full bg-zinc-800 border border-white/[0.04]">
            Not linked
          </span>
        )}
      </div>
      <div>
        <h3 className="text-[14px] font-semibold text-white">{name}</h3>
        <p className="text-[11px] text-zinc-500 line-clamp-1">{description}</p>
        <button
          className={cn(
            "mt-3 text-[12px] font-medium transition-colors flex items-center gap-1",
            connected
              ? "text-red-400 hover:text-red-300"
              : "text-violet-400 hover:text-violet-300",
          )}
        >
          {connected ? "Disconnect" : "Configure"}
          {!connected && <ChevronRight className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
