"use client";

import { useState } from "react";
import { useRef } from "react";
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
  Server,
  KeyRound,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ── Mock Initial Data ────────────────────────────────────────────────
type SystemStatus = "operational" | "degraded" | "missing_keys";

interface SystemIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  status: SystemStatus;
  lastPing: string;
  fields: {
    key: string;
    label: string;
    value: string;
    type: "text" | "password" | "url";
    placeholder: string;
  }[];
}

const initialIntegrations: SystemIntegration[] = [
  {
    id: "vapi",
    name: "Vapi Voice AI",
    description:
      "Core voice intelligence, agent configuration, and real-time call routing.",
    icon: Mic,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    status: "operational",
    lastPing: "2 mins ago",
    fields: [
      {
        key: "vapi_private",
        label: "Private API Key",
        value: "sk-live-****************************892a",
        type: "password",
        placeholder: "sk-live-...",
      },
      {
        key: "vapi_public",
        label: "Public API Key",
        value: "pk-live-****************************3b1c",
        type: "password",
        placeholder: "pk-live-...",
      },
    ],
  },
  {
    id: "twilio",
    name: "Twilio Telephony",
    description:
      "SIP trunking, SMS fallback, and global phone number provisioning.",
    icon: Phone,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    status: "operational",
    lastPing: "Just now",
    fields: [
      {
        key: "twilio_sid",
        label: "Account SID",
        value: "ACa9b8c7d6e5f4g3h2i1j0k9l8m7n6o5p4",
        type: "password",
        placeholder: "AC...",
      },
      {
        key: "twilio_token",
        label: "Auth Token",
        value: "********************************",
        type: "password",
        placeholder: "Enter Auth Token",
      },
      {
        key: "twilio_webhook",
        label: "Global Webhook URL",
        value: "https://api.receptionly.ai/v1/twilio/webhook",
        type: "url",
        placeholder: "https://...",
      },
    ],
  },
  {
    id: "stripe",
    name: "Stripe Billing",
    description:
      "Subscription management, usage-based billing, and invoice generation.",
    icon: CreditCard,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    status: "missing_keys",
    lastPing: "Never",
    fields: [
      {
        key: "stripe_secret",
        label: "Secret Key",
        value: "",
        type: "password",
        placeholder: "sk_live_...",
      },
      {
        key: "stripe_webhook",
        label: "Webhook Secret",
        value: "",
        type: "password",
        placeholder: "whsec_...",
      },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    description:
      "Fallback LLM provider for transcript analysis and call summaries.",
    icon: Sparkles,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    status: "operational",
    lastPing: "1 hour ago",
    fields: [
      {
        key: "openai_key",
        label: "API Key",
        value: "sk-proj-****************************4f8d",
        type: "password",
        placeholder: "sk-...",
      },
      {
        key: "openai_org",
        label: "Organization ID",
        value: "org-xyz123",
        type: "text",
        placeholder: "org-...",
      },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────
const statusConfig = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  missing_keys: {
    label: "Missing Keys",
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

// ── Main Page ────────────────────────────────────────────────────────
export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  // For field refs to focus after save
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleSecret = (fieldKey: string) => {
    setShowSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  // Handle field change
  const handleFieldChange = (
    integrationId: string,
    fieldKey: string,
    value: string,
  ) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === integrationId
          ? {
              ...integration,
              fields: integration.fields.map((field) =>
                field.key === fieldKey ? { ...field, value } : field,
              ),
            }
          : integration,
      ),
    );
  };

  const handleSave = (id: string) => {
    setSaving(id);
    setTimeout(() => {
      setSaving(null);
      setExpandedId(null);
      toast.success("Configuration saved", {
        description: `Integration '${id}' updated.`,
      });
    }, 1000);
  };

  const handleTest = (id: string) => {
    setTesting(id);
    setTimeout(() => {
      setTesting(null);
      toast.success("Connection successful", {
        description: `Integration '${id}' is reachable.`,
      });
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Platform Integrations
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage global API keys and webhooks for foundational third-party
            services.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400"
          >
            <Server className="mr-2 h-4 w-4" />
            Check All Status
          </Button>
        </div>
      </div>

      {/* ── Global Alert (If missing keys) ── */}
      {integrations.some((i) => i.status === "missing_keys") && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-[13px] font-medium text-red-400">
              Action Required: Missing Infrastructure Keys
            </p>
            <p className="mt-0.5 text-[12px] text-red-400/70">
              One or more essential platform integrations are missing
              credentials. Core functionality may be blocked.
            </p>
          </div>
        </div>
      )}

      {/* ── Integrations List ── */}
      <div className="space-y-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const statusCfg = statusConfig[integration.status];
          const isExpanded = expandedId === integration.id;

          // Optionally, you could provide real docs links per integration
          const docsLinks: Record<string, string> = {
            vapi: "https://docs.vapi.ai/",
            twilio: "https://www.twilio.com/docs/",
            stripe: "https://dashboard.stripe.com/apikeys",
            openai: "https://platform.openai.com/docs/",
          };
          const docsUrl = docsLinks[integration.id] || "#";

          return (
            <div
              key={integration.id}
              className={cn(
                "overflow-hidden rounded-xl border transition-colors group focus-within:ring-2 focus-within:ring-violet-500/40",
                isExpanded
                  ? "border-violet-500/40 bg-zinc-900/90 shadow-lg"
                  : "border-white/[0.06] bg-zinc-900/40 hover:border-white/[0.08]",
              )}
              tabIndex={0}
              aria-expanded={isExpanded}
            >
              {/* Card Header (Clickable) */}
              <div
                onClick={() =>
                  setExpandedId(isExpanded ? null : integration.id)
                }
                className="flex cursor-pointer items-center justify-between p-5 select-none"
                role="button"
                aria-label={
                  isExpanded
                    ? `Collapse ${integration.name}`
                    : `Expand ${integration.name}`
                }
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setExpandedId(isExpanded ? null : integration.id);
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border",
                      integration.iconBg,
                    )}
                  >
                    <Icon className={cn("h-6 w-6", integration.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white">
                      {integration.name}
                    </h3>
                    <p className="text-[13px] text-zinc-500">
                      {integration.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Status Badge */}
                  <div className="hidden sm:flex flex-col items-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                        statusCfg.badge,
                      )}
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        {integration.status === "operational" && (
                          <span
                            className={cn(
                              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                              statusCfg.dot,
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "relative inline-flex h-1.5 w-1.5 rounded-full",
                            statusCfg.dot,
                          )}
                        />
                      </span>
                      {statusCfg.label}
                    </span>
                    <span className="mt-1 text-[11px] text-zinc-600">
                      Last ping: {integration.lastPing}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-zinc-400 hover:text-white hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-violet-500/40",
                      isExpanded && "text-violet-400",
                    )}
                    aria-label={
                      isExpanded
                        ? `Close ${integration.name}`
                        : `Configure ${integration.name}`
                    }
                  >
                    {isExpanded ? "Close" : "Configure"}
                  </Button>
                </div>
              </div>

              {/* Expanded Configuration Area */}
              {isExpanded && (
                <div className="border-t border-white/[0.06] bg-zinc-950/30 p-5">
                  <div className="grid gap-6 md:grid-cols-[1fr_300px]">
                    {/* Fields Form */}
                    <div className="space-y-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                        <KeyRound className="h-4 w-4 text-zinc-500" />
                        Authentication Credentials
                      </div>

                      {integration.fields.map((field) => {
                        const isSecretVisible = showSecrets[field.key] || false;
                        const inputType =
                          field.type === "password" && !isSecretVisible
                            ? "password"
                            : field.type === "url"
                              ? "url"
                              : "text";

                        return (
                          <div key={field.key} className="space-y-1.5">
                            <label
                              className="text-[12px] font-medium text-zinc-400"
                              htmlFor={`${integration.id}-${field.key}`}
                            >
                              {field.label}
                            </label>
                            <div className="relative group">
                              <Input
                                id={`${integration.id}-${field.key}`}
                                ref={(el) =>
                                  (inputRefs.current[
                                    `${integration.id}-${field.key}`
                                  ] = el)
                                }
                                type={inputType}
                                value={field.value}
                                placeholder={field.placeholder}
                                className="h-10 border-white/[0.06] bg-zinc-900/60 pr-10 text-[13px] font-mono focus:border-violet-500/50 focus:ring-violet-500/20"
                                aria-label={field.label}
                                onChange={(e) =>
                                  handleFieldChange(
                                    integration.id,
                                    field.key,
                                    e.target.value,
                                  )
                                }
                                autoComplete="off"
                              />
                              {field.type === "password" && (
                                <button
                                  type="button"
                                  aria-label={
                                    isSecretVisible
                                      ? `Hide ${field.label}`
                                      : `Show ${field.label}`
                                  }
                                  onClick={() => toggleSecret(field.key)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                                  tabIndex={0}
                                >
                                  {isSecretVisible ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">
                                    {isSecretVisible ? "Hide" : "Show"} secret
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions Panel */}
                    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
                      <p className="text-[12px] font-medium text-zinc-400 mb-1">
                        Actions
                      </p>
                      <Button
                        onClick={() => handleTest(integration.id)}
                        disabled={testing === integration.id}
                        variant="outline"
                        className="w-full border-white/[0.06] bg-transparent hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-violet-500/40"
                        aria-busy={testing === integration.id}
                        aria-label={`Test connection for ${integration.name}`}
                      >
                        {testing === integration.id ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin text-zinc-500" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4 text-zinc-500" />
                        )}
                        {testing === integration.id
                          ? "Pinging API..."
                          : "Test Connection"}
                      </Button>

                      <Button
                        onClick={() => handleSave(integration.id)}
                        disabled={saving === integration.id}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white focus-visible:ring-2 focus-visible:ring-violet-500/40"
                        aria-busy={saving === integration.id}
                        aria-label={`Save configuration for ${integration.name}`}
                      >
                        {saving === integration.id ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {saving === integration.id
                          ? "Saving..."
                          : "Save Configuration"}
                      </Button>

                      <div className="mt-auto pt-4 border-t border-white/[0.04]">
                        <a
                          href={docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          aria-label={`View API documentation for ${integration.name}`}
                        >
                          View API Documentation
                          <ArrowUpRight className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
