"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  CreditCard,
  Settings,
  Puzzle,
  Shield,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Activity,
  Flag,
  FileText,
  Circle,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ── Nav config ────────────────────────────────────────────
const navGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Activity", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Tenants", href: "/admin/tenants", icon: Users, badge: "12" },
      { label: "Calls", href: "/admin/calls", icon: PhoneCall },
      { label: "Integrations", href: "/admin/integrations", icon: Puzzle },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Billing", href: "/admin/billing", icon: CreditCard },
      { label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Feature Flags", href: "/admin/flags", icon: Flag },
      { label: "Audit Log", href: "/admin/audit", icon: FileText },
      { label: "System Health", href: "/admin/system", icon: Circle },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// ── Status indicator ──────────────────────────────────────
function SystemStatusDot({ healthy = true }: { healthy?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {healthy && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          healthy ? "bg-emerald-500" : "bg-red-500",
        )}
      />
    </span>
  );
}

// ── Main layout ───────────────────────────────────────────
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        // We call a lightweight check to verify role
        const res = await fetch("/api/auth/session");
        const data = await res.json();

        if (data.role === "admin") {
          setAuthorized(true);
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        router.push("/sign-in");
      } finally {
        setVerifying(false);
      }
    }
    checkAdmin();
  }, [router]);

  if (verifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] font-[family-name:var(--font-geist-sans)]">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-[#0d0d14] transition-all duration-300 ease-in-out lg:translate-x-0",
          collapsed ? "w-[68px]" : "w-[240px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        {/* ── Logo / Header ── */}
        <div
          className={cn(
            "flex items-center gap-3 border-b border-white/[0.06] px-4 py-4",
            collapsed && "justify-center px-0",
          )}
        >
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute right-4 top-4 text-zinc-500 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-emerald-500/30">
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-semibold tracking-tight text-white">
                Admin Console
              </p>
              <p className="text-[10px] tracking-widest text-zinc-600 uppercase">
                Receptionly
              </p>
            </div>
          )}
        </div>

        {/* ── System health pill ── */}
        {!collapsed && (
          <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <SystemStatusDot healthy />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-emerald-400">
                All systems operational
              </p>
            </div>
          </div>
        )}

        {/* ── Nav groups ── */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ label, href, icon: Icon, badge }) => {
                  const active =
                    href === "/admin"
                      ? pathname === "/admin"
                      : pathname?.startsWith(href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsMobileOpen(false)}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                        collapsed && "justify-center px-0 w-full",
                        active
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                      )}
                    >
                      {/* active left bar */}
                      {active && (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-emerald-500" />
                      )}

                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-emerald-400"
                            : "text-zinc-600 group-hover:text-zinc-400",
                        )}
                      />

                      {!collapsed && (
                        <>
                          <span className="flex-1">{label}</span>
                          {badge && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600/20 px-1.5 text-[10px] font-bold text-emerald-400">
                              {badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* collapsed badge dot */}
                      {collapsed && badge && (
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom: user + collapse ── */}
        <div className="border-t border-white/[0.06]">
          {/* User row */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-3 py-3",
              collapsed && "justify-center px-0",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 ring-1 ring-emerald-500/30 text-[11px] font-bold text-emerald-400 uppercase">
              AD
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white leading-tight">
                  Admin
                </p>
                <p className="truncate text-[11px] text-zinc-600 leading-tight">
                  superadmin
                </p>
              </div>
            )}
            {!collapsed && (
              <Link
                href="/dashboard"
                className="rounded-md p-1 text-zinc-600 hover:text-red-400 transition-colors"
                title="Exit admin"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex w-full items-center gap-2 border-t border-white/[0.06] px-3 py-2.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out ml-0",
          collapsed ? "lg:ml-[68px]" : "lg:ml-[240px]",
        )}
      >
        <div className="flex h-screen flex-col p-2">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f18]/60 shadow-2xl">
            {/* ── Topbar ── */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0d0d14]/80 px-6 backdrop-blur-sm">
              {/* breadcrumb */}
              <div className="flex items-center gap-2 text-[13px]">
                <button
                  onClick={() => setIsMobileOpen(true)}
                  className="mr-2 rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.06] lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-zinc-600">/</span>
                <span className="font-medium text-zinc-300">
                  {navGroups
                    .flatMap((g) => g.items)
                    .sort((a, b) => b.href.length - a.href.length)
                    .find((i) =>
                      i.href === "/admin"
                        ? pathname === "/admin"
                        : pathname?.startsWith(i.href),
                    )?.label ?? "Admin"}
                </span>
              </div>

              {/* right actions */}
              <div className="flex items-center gap-3">
                {/* System health badge */}
                <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                  <SystemStatusDot />
                  <span>Healthy</span>
                </div>

                {/* Notif */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative rounded-lg p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                  </button>
                </div>

                <div className="h-5 w-px bg-white/[0.08]" />

                {/* Avatar */}
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/20 ring-1 ring-emerald-500/30 text-[11px] font-bold text-emerald-400">
                  AD
                </div>
              </div>
            </header>

            {/* ── Page content ── */}
            <main className="flex-1 overflow-auto p-6 text-zinc-100">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
