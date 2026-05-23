"use client";

import { X, ShieldAlert } from "lucide-react";

interface ImpersonateBannerProps {
  tenantName: string;
  onExit: () => void;
}

export function ImpersonateBanner({ tenantName, onExit }: ImpersonateBannerProps) {
  return (
    <div className="sticky top-0 z-[100] flex w-full items-center justify-between bg-amber-500 px-4 py-2 text-zinc-950 shadow-lg ring-1 ring-amber-400/50">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <ShieldAlert className="h-4 w-4" />
        <p>
          ADMIN MODE: Impersonating <span className="underline">{tenantName}</span>
        </p>
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1.5 rounded-md bg-zinc-950/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition hover:bg-zinc-950/20"
      >
        <X className="h-3.5 w-3.5" />
        Exit Session
      </button>
    </div>
  );
}
