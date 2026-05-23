"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Puzzle,
  Users,
  Settings,
  Shield,
  ChevronLeft,
  LogOut,
  Bell,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Integrations Catalog",
    href: "/admin/integrations",
    icon: Puzzle,
  },
  {
    label: "Tenants",
    href: "/admin/tenants",
    icon: Users,
  },
  {
    label: "Global Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-950 font-[family-name:var(--font-geist-sans)]">
      {/* ── ADMIN SIDEBAR ────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-zinc-900/90 backdrop-blur-xl transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[240px]",
        )}
      >
        {/* Admin Header */}
        <div
          className={cn(
            "flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-lg shadow-emerald-900/50">
            <Shield className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold tracking-tight text-white leading-none">
                Admin Portal
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 tracking-widest uppercase">
                Receptionly
              </p>
            </div>
          )}
        </div>

        {/* Admin Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-medium tracking-widest text-zinc-600 uppercase">
              Management
            </p>
          )}
          {adminNavItems.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/admin" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                  collapsed && "justify-center px-0 w-full",
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                )}
                title={collapsed ? label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-emerald-500" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active
                      ? "text-emerald-400"
                      : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                />
                {!collapsed && (
                  <span className="flex-1 font-medium">{label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/[0.06] p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                collapsed && "rotate-180",
              )}
            />
            {!collapsed && <span>Collapse menu</span>}
          </button>

          <Link
            href="/dashboard"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-violet-400 hover:bg-violet-500/10 transition-colors mt-1",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Exit Admin</span>}
          </Link>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out",
          collapsed ? "ml-[72px]" : "ml-[240px]",
        )}
      >
        <div className="flex h-screen flex-col p-2">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/40 shadow-2xl">
            {/* Admin Top bar */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-900/60 px-6 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Menu className="h-4 w-4 text-emerald-400" />
                <span className="text-[13px] font-medium text-zinc-300 uppercase tracking-widest">
                  System Administration
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  AD
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-auto p-8 text-zinc-100">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
