"use client";

import { useState } from "react";
import { Zap, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

interface UsageBannerProps {
  minutesUsed: number;
  minutesLimit: number;
  plan: "starter" | "growth" | "pro";
}

/**
 * Renders an inline banner when usage is >= 80%.
 * Shows nothing below that threshold.
 */
export function UsageBanner({ minutesUsed, minutesLimit, plan }: UsageBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const pct = minutesLimit > 0 ? (minutesUsed / minutesLimit) * 100 : 0;
  const remaining = Math.max(minutesLimit - minutesUsed, 0);
  const isCritical = pct >= 95;
  const isWarning = pct >= 80;

  if (!isWarning || dismissed || plan === "pro") return null;

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border px-4 py-3",
          isCritical
            ? "border-red-500/30 bg-red-500/10"
            : "border-amber-500/20 bg-amber-500/10",
        )}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle
            className={cn(
              "h-4 w-4 shrink-0",
              isCritical ? "text-red-400" : "text-amber-400",
            )}
          />
          <div>
            <p
              className={cn(
                "text-[13px] font-medium",
                isCritical ? "text-red-300" : "text-amber-300",
              )}
            >
              {isCritical
                ? `Only ${remaining} minutes remaining this month!`
                : `${Math.round(pct)}% of your monthly minutes used`}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {minutesUsed} / {minutesLimit} min ·{" "}
              {isCritical
                ? "Upgrade now to avoid dropped calls."
                : "Upgrade for more minutes and agents."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowUpgrade(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
              isCritical
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-amber-500 hover:bg-amber-400 text-zinc-950",
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Upgrade now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          currentPlan={plan}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}