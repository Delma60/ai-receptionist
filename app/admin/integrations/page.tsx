"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  Phone,
  CreditCard,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Store,
  Settings,
  Loader2,
  XCircle,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationCategory, Integration } from "@/types";
import configJson from "@/lib/config/app.json";
import { DynamicIcon } from "lucide-react/dynamic";

// ── Types ──────────────────────────────────────────────────────────────────

interface PlatformIntegration {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  fields: {
    key: string;
    label: string;
    placeholder?: string;
    type: "password" | "text";
  }[];
}

interface KeyState {
  value: string; // what the user typed (empty = untouched)
  masked: string; // server-provided masked display value
  hasValue: boolean; // whether a real value exists on the server
  dirty: boolean; // user has typed something new
}

// ── Platform integrations definition ──────────────────────────────────────

const PLATFORM_INTEGRATIONS: PlatformIntegration[] = configJson.integrations;

const categories: IntegrationCategory[] = [
  "analytics",
  "communication",
  "crm",
  "marketing",
  "storage",
  "support",
  "custom",
  "webhook",
  "calendar",
  "phone",
  "sms",
];

const iconNameMap: Record<IntegrationCategory, string> = {
  analytics: "bar-chart-2",
  communication: "message-square",
  crm: "users",
  marketing: "megaphone",
  storage: "hard-drive",
  support: "life-buoy",
  custom: "puzzle-piece",
  webhook: "zap",
  calendar: "calendar",
  phone: "phone",
  sms: "message-text",
};

const categoryColors: Record<IntegrationCategory, string> = {
  analytics: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  communication: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  crm: "text-green-400 bg-green-500/10 border-green-500/20",
  marketing: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  storage: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  support: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  custom: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  webhook: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  calendar: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  phone: "text-red-400 bg-red-500/10 border-red-500/20",
  sms: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

// ── PlatformKeyCard ────────────────────────────────────────────────────────

function PlatformKeyCard({
  integration,
}: {
  integration: PlatformIntegration;
}) {
  // const Icon = integration.icon;
  // console.log(configJson.integrations)

  // Map of fieldKey → KeyState
  const [keyStates, setKeyStates] = useState<Record<string, KeyState>>(() =>
    Object.fromEntries(
      integration.fields.map((f) => [
        f.key,
        { value: "", masked: "", hasValue: false, dirty: false },
      ]),
    ),
  );
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  // Load masked values from server on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchKeys() {
      try {
        const res = await fetch("/api/admin/platform-keys");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setKeyStates((prev) => {
          const next = { ...prev };
          for (const field of integration.fields) {
            const serverKey = data.keys?.[field.key];
            if (serverKey) {
              next[field.key] = {
                value: "",
                masked: serverKey.masked,
                hasValue: serverKey.hasValue,
                dirty: false,
              };
            }
          }
          return next;
        });
      } catch {
        // Non-fatal — will just show empty placeholders
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchKeys();
    return () => {
      cancelled = true;
    };
  }, [integration.fields]);

  function handleChange(fieldKey: string, val: string) {
    setKeyStates((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], value: val, dirty: true },
    }));
  }

  async function handleSave() {
    const keysToSave: Record<string, string> = {};
    let anyDirty = false;
    for (const field of integration.fields) {
      const state = keyStates[field.key];
      if (state.dirty) {
        keysToSave[field.key] = state.value;
        anyDirty = true;
      }
    }
    if (!anyDirty) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/admin/platform-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: keysToSave }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const { updated } = await res.json();

      // Mark saved fields as clean, refresh their masked display
      setKeyStates((prev) => {
        const next = { ...prev };
        for (const key of updated) {
          if (next[key]) {
            const savedVal = next[key].value;
            next[key] = {
              value: "",
              masked: savedVal
                ? savedVal.slice(0, 4) + "•••••••" + savedVal.slice(-3)
                : "",
              hasValue: !!savedVal,
              dirty: false,
            };
          }
        }
        return next;
      });

      setSaveStatus("saved");
      toast.success(`${integration.name} keys saved.`);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: any) {
      setSaveStatus("error");
      toast.error(err.message || "Failed to save keys");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }

  const hasDirtyFields = Object.values(keyStates).some((s) => s.dirty);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/40">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border",
              integration.iconBg,
            )}
          >
            <DynamicIcon
              name={integration.icon}
              className={cn("h-5 w-5", integration.iconColor)}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {integration.name}
            </h3>
            <p className="text-xs text-zinc-500">{integration.description}</p>
          </div>
        </div>
        {/* Status dot */}
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
          ) : (
            <div className="flex items-center gap-1.5 text-[11px]">
              {Object.values(keyStates).every((s) => s.hasValue) ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Incomplete
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="p-5 bg-zinc-950/30 space-y-4">
        <div className="space-y-4 max-w-xl">
          {integration.fields.map((field) => {
            const state = keyStates[field.key];
            const isVisible = showSecrets[field.key] ?? false;
            const inputType =
              field.type === "password" && !isVisible ? "password" : "text";
            const displayValue = state.dirty
              ? state.value
              : state.hasValue
                ? state.masked
                : "";

            return (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-zinc-400">
                    {field.label}
                  </label>
                  {state.hasValue && !state.dirty && (
                    <span className="text-[10px] text-emerald-500 font-medium">
                      ● Saved
                    </span>
                  )}
                  {state.dirty && (
                    <span className="text-[10px] text-amber-400 font-medium">
                      ● Unsaved changes
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={inputType}
                    value={displayValue}
                    placeholder={field.placeholder}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="h-9 border-white/[0.06] bg-zinc-900/60 pr-10 font-mono text-sm"
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecrets((p) => ({
                          ...p,
                          [field.key]: !p[field.key],
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {isVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
          <div className="text-[12px]">
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-red-400">
                <XCircle className="h-3.5 w-3.5" /> Save failed
              </span>
            )}
            {saveStatus === "idle" && hasDirtyFields && (
              <span className="text-amber-400/70 text-[11px]">
                You have unsaved changes
              </span>
            )}
          </div>
          <Button
            size="sm"
            disabled={saving || !hasDirtyFields}
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2 min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-3 w-3" /> Save Keys
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminIntegrationsPage() {
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [newItem, setNewItem] = useState<Integration>({
    id: "",
    name: "",
    description: "",
    category: "crm",
    iconName: "globe",
    published: false,
    comingSoon: false,
  });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "available_integrations"),
      (snapshot) => {
        setCatalogItems(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "available_integrations", id), {
        published: !currentStatus,
      });
      toast.success(
        `Integration is now ${!currentStatus ? "visible" : "hidden"} to users.`,
      );
    } catch {
      toast.error("Failed to update visibility.");
    }
  };

  const handleAddIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.id || !newItem.name) return;
    try {
      const payload: Integration = {
        ...newItem,
        iconName: iconNameMap[newItem.category] || "puzzle-piece",
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        iconBg: categoryColors[newItem.category],
        iconColor: categoryColors[newItem.category],
        status: "connected",
        features: ["Standard Sync", "Real-time updates"],
      };
      await setDoc(doc(db, "available_integrations", newItem.id), payload);
      setNewItem({
        id: "",
        name: "",
        description: "",
        category: "crm",
        iconName: "globe",
        published: false,
        comingSoon: false,
      });
      setIsAdding(false);
      setSlugManuallyEdited(false);
      toast.success("Integration added to catalog!");
    } catch {
      toast.error("Failed to add integration.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Integrations Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage platform infrastructure keys and curate the app catalog for
          your users.
        </p>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="mb-6 bg-zinc-900/50 border border-white/[0.06]">
          <TabsTrigger
            value="platform"
            className="data-[state=active]:bg-zinc-800"
          >
            <Settings className="h-4 w-4 mr-2" />
            Platform API Keys
          </TabsTrigger>
          <TabsTrigger
            value="catalog"
            className="data-[state=active]:bg-zinc-800"
          >
            <Store className="h-4 w-4 mr-2" />
            User App Catalog
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: PLATFORM API KEYS ── */}
        <TabsContent value="platform" className="space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/20 px-5 py-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-amber-300">
                Security notice
              </p>
              <p className="text-[12px] text-zinc-500 mt-0.5">
                Keys are encrypted at rest in Firestore. Existing values are
                never returned in full — only masked for display. Leave a field
                blank to keep the current value unchanged.
              </p>
            </div>
          </div>

          {PLATFORM_INTEGRATIONS.map((integration) => (
            <PlatformKeyCard key={integration.id} integration={integration} />
          ))}
        </TabsContent>

        {/* ── TAB 2: USER APP CATALOG ── */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-white">
                App Store Visibility
              </h2>
              <p className="text-xs text-zinc-500">
                Control which apps appear in the tenant's integration page.
              </p>
            </div>
            <Button
              onClick={() => setIsAdding(!isAdding)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Add App to Catalog
            </Button>
          </div>

          {isAdding && (
            <form
              onSubmit={handleAddIntegration}
              className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4"
            >
              <h3 className="text-sm font-medium text-emerald-400">
                Create New App Listing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Display Name</label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewItem((prev) => ({
                        ...prev,
                        name,
                        id: slugManuallyEdited
                          ? prev.id
                          : name
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-+|-+$/g, ""),
                      }));
                    }}
                    required
                    className="bg-zinc-900/50 border-white/[0.1]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Slug ID</label>
                  <Input
                    value={newItem.id}
                    onChange={(e) => {
                      setNewItem({ ...newItem, id: e.target.value });
                      setSlugManuallyEdited(true);
                    }}
                    required
                    className="bg-zinc-900/50 border-white/[0.1]"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-zinc-400">Type</label>
                  <Select
                    value={newItem.category}
                    onValueChange={(v) =>
                      setNewItem({
                        ...newItem,
                        category: v as IntegrationCategory,
                      })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900/50 border-white/[0.1] w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900/90 border-white/[0.1] text-white">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-zinc-400">Description</label>
                  <Textarea
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                    required
                    className="bg-zinc-900/50 border-white/[0.1]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Save Listing
                </Button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {catalogItems.length === 0 && (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                    No apps in catalog yet.
                  </div>
                )}
                {catalogItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-white/[0.02]"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        {item.name}
                        {item.comingSoon && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-zinc-800 text-zinc-400 border-none"
                          >
                            Coming Soon
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {item.description || "No description."}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium text-zinc-500">
                        {item.published ? "Visible" : "Hidden"}
                      </span>
                      <Switch
                        checked={item.published || false}
                        onCheckedChange={() =>
                          handleTogglePublish(item.id, item.published)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
