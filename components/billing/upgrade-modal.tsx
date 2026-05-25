"use client";

import { useState } from "react";
import {
  Zap,
  Check,
  Loader2,
  X,
  ArrowRight,
  Star,
  PhoneCall,
  Bot,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  {
    key: "starter",
    label: "Starter",
    price: 49,
    minutes: 100,
    agents: 1,
    numbers: 1,
    accent: "border-zinc-700 hover:border-zinc-600",
    badgeBg: "bg-zinc-800 text-zinc-400",
    checkColor: "text-zinc-400",
    buttonClass:
      "border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]",
  },
  {
    key: "growth",
    label: "Growth",
    price: 149,
    minutes: 500,
    agents: 3,
    numbers: 3,
    popular: true,
    accent: "border-violet-500/40 ring-1 ring-violet-500/20",
    badgeBg: "bg-violet-600/20 text-violet-300",
    checkColor: "text-violet-400",
    buttonClass: "bg-violet-600 hover:bg-violet-500 text-white",
  },
  {
    key: "pro",
    label: "Pro",
    price: 349,
    minutes: 2000,
    agents: Infinity,
    numbers: 10,
    accent: "border-amber-500/30 hover:border-amber-500/50",
    badgeBg: "bg-amber-500/10 text-amber-400",
    checkColor: "text-amber-400",
    buttonClass:
      "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  },
] as const;

type PlanKey = "starter" | "growth" | "pro";

// ── Feature rows ──────────────────────────────────────────────────────────────

const FEATURES: {
  label: string;
  icon: React.ElementType;
  starter: string;
  growth: string;
  pro: string;
}[] = [
  {
    label: "Monthly minutes",
    icon: Clock,
    starter: "100 min",
    growth: "500 min",
    pro: "2,000 min",
  },
  {
    label: "AI agents",
    icon: Bot,
    starter: "1 agent",
    growth: "3 agents",
    pro: "Unlimited",
  },
  {
    label: "Phone numbers",
    icon: PhoneCall,
    starter: "1 number",
    growth: "3 numbers",
    pro: "10 numbers",
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  currentPlan: PlanKey;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UpgradeModal({ currentPlan, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(plan: PlanKey) {
    if (plan === currentPlan) return;
    setLoading(plan);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err.message || "Failed to start checkout. Please try again.");
      setLoading(null);
    }
  }

  const PLAN_ORDER: PlanKey[] = ["starter", "growth", "pro"];
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Upgrade your plan
              </h2>
              <p className="mt-0.5 text-[13px] text-zinc-500">
                Unlock more minutes, agents, and phone numbers
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-4 p-6">
            {PLANS.map((plan) => {
              const planIdx = PLAN_ORDER.indexOf(plan.key);
              const isCurrent = plan.key === currentPlan;
              const isDowngrade = planIdx < currentIdx;
              const isLoading = loading === plan.key;

              return (
                <div
                  key={plan.key}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-5 transition-all",
                    plan.accent,
                    isCurrent && "opacity-70",
                  )}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-600/20 px-3 py-0.5 text-[10px] font-bold text-violet-300">
                      <Star className="h-2.5 w-2.5 fill-violet-400 text-violet-400" />
                      POPULAR
                    </div>
                  )}

                  {/* Current badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-white/[0.1] bg-zinc-800 px-3 py-0.5 text-[10px] font-bold text-zinc-400">
                      CURRENT
                    </div>
                  )}

                  {/* Price */}
                  <div className="mb-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold mb-2",
                        plan.badgeBg,
                      )}
                    >
                      {plan.label}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        ${plan.price}
                      </span>
                      <span className="text-[12px] text-zinc-600">/mo</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mb-5 space-y-2 flex-1">
                    {FEATURES.map((f) => {
                      const val =
                        plan.key === "starter"
                          ? f.starter
                          : plan.key === "growth"
                            ? f.growth
                            : f.pro;
                      const Icon = f.icon;
                      return (
                        <li
                          key={f.label}
                          className="flex items-center gap-2 text-[12px] text-zinc-400"
                        >
                          <Icon
                            className={cn("h-3.5 w-3.5 shrink-0", plan.checkColor)}
                          />
                          {val}
                        </li>
                      );
                    })}
                    <li className="flex items-center gap-2 text-[12px] text-zinc-400">
                      <Check
                        className={cn("h-3.5 w-3.5 shrink-0", plan.checkColor)}
                      />
                      $0.08/min overage
                    </li>
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={isCurrent || isDowngrade || isLoading || loading !== null}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium transition-all disabled:opacity-40 disabled:pointer-events-none",
                      plan.buttonClass,
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCurrent ? (
                      "Current plan"
                    ) : isDowngrade ? (
                      "Contact support"
                    ) : (
                      <>
                        Upgrade
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-[12px] text-red-400">{error}</p>
            </div>
          )}

          {/* Footer note */}
          <div className="border-t border-white/[0.06] px-6 py-4">
            <p className="text-center text-[11px] text-zinc-600">
              Secure checkout via Stripe · Cancel anytime · Prorated upgrades ·
              Need enterprise?{" "}
              <a
                href="mailto:support@receptionly.ai"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}