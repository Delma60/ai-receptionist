"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Bot,
  LayoutDashboard,
  PhoneCall,
  Puzzle,
  Settings,
  ChevronLeft,
  LogOut,
  Bell,
  Mic,
  Zap,
  Users,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImpersonateBanner } from "@/components/admin/ImpersonateBanner";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";
import { UsageBanner } from "@/components/billing/usage-banner";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Agents",
    href: "/agents",
    icon: Bot,
  },
  {
    label: "Calls",
    href: "/calls",
    icon: PhoneCall,
    badge: 3,
  },
  {
    label: "Teams",
    href: "/teams",
    icon: Users,
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: Puzzle,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          active ? "bg-emerald-500" : "bg-zinc-500",
        )}
      />
    </span>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [activeAgent, setActiveAgent] = useState<any>(null);
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("impersonated_tenant_id="))
      ?.split("=")[1];

    setImpersonatedId(cookieValue || null);
  }, [pathname]);

  useEffect(() => {
    const effectiveId = impersonatedId || user?.uid;

    if (!effectiveId) {
      setTenant(null);
      setActiveAgent(null);
      return;
    }

    const unsubTenant = onSnapshot(doc(db, "tenants", effectiveId), (doc) => {
      setTenant(doc.data());
    });

    const unsubAgent = onSnapshot(
      query(
        collection(db, "tenants", effectiveId, "agents"),
        where("isActive", "==", true),
        limit(1),
      ),
      (snapshot) => {
        if (!snapshot.empty) setActiveAgent(snapshot.docs[0].data());
        else setActiveAgent(null);
      },
    );

    return () => {
      unsubTenant();
      unsubAgent();
    };
  }, [user, impersonatedId]);

  async function handleExitImpersonation() {
    try {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
      if (res.ok) {
        setImpersonatedId(null);
        router.refresh();
        router.push("/admin/tenants");
      }
    } catch (err) {
      console.error("Failed to exit impersonation", err);
    }
  }

  async function performLogout() {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/sign-in");
    } catch (err) {
      console.error("Logout failed", err);
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 font-[family-name:var(--font-geist-sans)]">
      {impersonatedId && tenant && (
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <ImpersonateBanner
            tenantName={tenant.name}
            onExit={handleExitImpersonation}
          />
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Sign out</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Are you sure you want to sign out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performLogout}
                disabled={isLoggingOut}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-zinc-900/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:translate-x-0",
          collapsed ? "w-[72px]" : "w-[240px]",
          impersonatedId && "pt-10",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Subtle gradient stripe at top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]",
            collapsed && "justify-center px-0",
          )}
        >
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute right-4 top-5 text-zinc-500 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 shadow-lg shadow-violet-900/50">
            <Mic className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold tracking-tight text-white leading-none">
                Receptionly
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 tracking-widest uppercase">
                AI Receptionist
              </p>
            </div>
          )}
        </div>

        {/* Active agent status pill */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-1 flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <StatusDot active={true} />
            <div className="overflow-hidden">
              <p className="text-[11px] font-medium text-emerald-400 leading-tight truncate">
                {activeAgent?.name || "No agent"} — Active
              </p>
              <p className="text-[10px] text-zinc-500 leading-tight">
                {activeAgent ? "1 agent online" : "Setup an agent"}
              </p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-medium tracking-widest text-zinc-600 uppercase">
              Navigation
            </p>
          )}
          {navItems.map(({ label, href, icon: Icon, badge }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                  collapsed && "justify-center px-0 w-full",
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                )}
                title={collapsed ? label : undefined}
              >
                {/* Active indicator bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-violet-500" />
                )}

                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active
                      ? "text-violet-400"
                      : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                />

                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium">{label}</span>
                    {badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600/90 px-1.5 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </>
                )}

                {/* Collapsed badge dot */}
                {collapsed && badge && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Divider + Usage */}
        {/* {!collapsed && (
        )} */}
        <UsageBanner
          minutesLimit={tenant?.minutesLimit || 500}
          minutesUsed={tenant?.minutesUsed || 0}
          plan={tenant?.plan || "starter"}
        />

        {/* Bottom: User + collapse */}
        <div className="border-t border-white/[0.06]">
          {/* User row */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-3",
              collapsed && "justify-center px-0",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-bold text-white shadow uppercase">
              {user?.displayName?.[0] || user?.email?.[0] || "U"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate leading-tight">
                  {user?.displayName || "User"}
                </p>
                <p className="text-[11px] text-zinc-500 truncate leading-tight">
                  {user?.email}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="rounded-md p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
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
            <ChevronLeft
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-300",
                collapsed && "rotate-180",
              )}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out ml-0",
          impersonatedId && "pt-10",
          collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]",
        )}
      >
        <div className="flex h-screen flex-col p-2">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/40 shadow-2xl">
            {/* Top bar */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-900/60 px-6 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMobileOpen(true)}
                  className="mr-2 rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.06] lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Zap className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[13px] font-medium text-zinc-300">
                  {navItems.find((n) => pathname?.startsWith(n.href))?.label ??
                    "Dashboard"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative rounded-lg p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
                </button>
                <div className="h-5 w-px bg-white/[0.08]" />
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-bold text-white shadow uppercase">
                  {user?.displayName?.[0] || user?.email?.[0] || "U"}
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-auto p-6 text-zinc-100">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
