"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  Phone,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  KeyRound,
  Server,
  Plus,
  Store,
  Settings,
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
import { Button } from "@/components/ui/Button";
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
// import {  }
// sonner
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationCategory, Integration } from "@/types";

// ── Mock Initial Data for Platform Keys ──────────────────────────────
const initialPlatformIntegrations = [
  {
    id: "vapi",
    name: "Vapi Voice AI",
    description: "Core voice intelligence.",
    icon: Mic,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    status: "operational",
    fields: [
      {
        key: "vapi_private",
        label: "Private API Key",
        value: "sk-live-***",
        type: "password",
      },
    ],
  },
  {
    id: "twilio",
    name: "Twilio Telephony",
    description: "SIP trunking and SMS.",
    icon: Phone,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    status: "operational",
    fields: [
      {
        key: "twilio_sid",
        label: "Account SID",
        value: "AC***",
        type: "password",
      },
    ],
  },
];

const categories: Integration["category"][] = [
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

// integration color map
const categoryColors: Record<Integration["category"], string> = {
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

// const

const iconNameMap: Record<Integration["category"], string> = {
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

export default function AdminIntegrationsPage() {
  const [platformIntegrations] = useState(initialPlatformIntegrations);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // App Catalog State
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Integration>({
    id: "",
    name: "",
    description: "",
    category: "crm",
    iconName: "globe",
    published: false,
    comingSoon: false,
  });
  // Track if user has manually edited the slug
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Fetch the live catalog that users see
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "available_integrations"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCatalogItems(data);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const toggleSecret = (fieldKey: string) => {
    setShowSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  // Toggle whether users can see this integration in their dashboard
  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "available_integrations", id), {
        published: !currentStatus,
      });
      toast.success(
        `Integration is now ${!currentStatus ? "visible" : "hidden"} to users.`,
      );
    } catch (error) {
      console.error("Failed to toggle publish status", error);
    }
  };

  // Add a new integration to the catalog
  const handleAddIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.id || !newItem.name) return;
    try {
      // Use setDoc to create a document with the specific slug ID
      const payload: Integration = {
        id: newItem.id,
        name: newItem.name,
        description: newItem.description,
        category: newItem.category,
        iconName: iconNameMap[newItem.category] || "puzzle-piece",
        published: newItem.published,
        comingSoon: newItem.comingSoon,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        iconBg: categoryColors[newItem.category],
        iconColor: categoryColors[newItem.category],
        status: 'connected',
        features: ["Standard Sync", "Real-time updates"], // default features
      };
      await setDoc(doc(db, "available_integrations", newItem.id), payload).then(
        () => {
          setNewItem({
            id: "",
            name: "",
            description: "",
            category: "crm",
            iconName: "globe",
            published: false,
            comingSoon: false,

          });
          toast.success("New integration added to catalog!");
        },
      );
    } catch (error) {
      console.error("Failed to add integration", error);
      toast.error("Failed to add integration. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Integrations Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage platform infrastructure keys and curate the app catalog for
          your users.
        </p>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="mb-6 bg-zinc-900/50 border border-white/[0.06]">
          <TabsTrigger
            value="catalog"
            className="data-[state=active]:bg-zinc-800"
          >
            <Store className="h-4 w-4 mr-2" />
            User App Catalog
          </TabsTrigger>
          <TabsTrigger
            value="platform"
            className="data-[state=active]:bg-zinc-800"
          >
            <Settings className="h-4 w-4 mr-2" />
            Platform API Keys
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: USER APP CATALOG (MARKETPLACE) ── */}
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

          {/* Add New Form (Expands) */}
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
                      setNewItem((prev) => {
                        // If slug was not manually edited, auto-generate slug from name
                        if (!slugManuallyEdited) {
                          return {
                            ...prev,
                            name,
                            id: name
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-+|-+$/g, ""),
                          };
                        }
                        return { ...prev, name };
                      });
                    }}
                    required
                    className="bg-zinc-900/50 border-white/[0.1]"
                  />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">
                    Slug ID (e.g., salesforce-crm)
                  </label>
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
                    defaultValue="crm"
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, category: String(value) as IntegrationCategory })
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
                  ></Textarea>
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

          {/* Catalog List */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                Loading catalog...
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
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
                        {item.description || "No description provided."}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium text-zinc-500">
                        {item.published ? "Visible to Users" : "Hidden"}
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
                {catalogItems.length === 0 && !loading && (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                    No apps in catalog. Click "Add App" to create one.
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB 2: PLATFORM API KEYS (INFRASTRUCTURE) ── */}
        <TabsContent value="platform" className="space-y-4">
          {platformIntegrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.id}
                className="overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/40"
              >
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border",
                        integration.iconBg,
                      )}
                    >
                      <Icon className={cn("h-5 w-5", integration.iconColor)} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {integration.name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-zinc-950/30">
                  <div className="space-y-4 max-w-xl">
                    {integration.fields.map((field) => {
                      const isSecretVisible = showSecrets[field.key] || false;
                      const inputType =
                        field.type === "password" && !isSecretVisible
                          ? "password"
                          : "text";
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-[12px] font-medium text-zinc-400">
                            {field.label}
                          </label>
                          <div className="relative">
                            <Input
                              type={inputType}
                              defaultValue={field.value}
                              className="h-9 border-white/[0.06] bg-zinc-900/60 pr-10 font-mono text-sm"
                            />
                            {field.type === "password" && (
                              <button
                                type="button"
                                onClick={() => toggleSecret(field.key)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                              >
                                {isSecretVisible ? (
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
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-500 text-white mt-2"
                    >
                      <Save className="h-3 w-3 mr-2" /> Save Keys
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
