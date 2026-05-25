"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PhoneCall,
  PhoneOff,
  Clock,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Bot,
  ArrowUpRight,
  MoreHorizontal,
  Play,
  ChevronRight,
  Zap,
  Users,
  Mic,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  where,
  Timestamp,
} from "firebase/firestore";

// ── Types ────────────────────────────────────
type Outcome = "booked" | "transferred" | "message" | "unanswered";

interface Call {
  id: string;
  caller: string;
  time: string;
  duration: string;
  outcome: Outcome;
  agent: string;
  summary: string;
}

interface ChartDay {
  day: string;
  calls: number;
  booked: number;
  isToday?: boolean;
  fullDate: string;
}

// ── Helpers ──────────────────────────────────

function fmtDuration(secs: number): string {
  if (!secs || secs <= 0) return "0m 00s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// FIX 5: Real trend percentage from actual daily call data
function trendPct(
  current: number,
  previous: number,
): { pct: number; dir: "up" | "down" | null } {
  if (previous <= 0 && current <= 0) return { pct: 0, dir: null };
  if (previous <= 0) return { pct: 100, dir: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), dir: pct >= 0 ? "up" : "down" };
}

const outcomeConfig: Record<
  Outcome,
  { label: string; classes: string; dotClass: string }
> = {
  booked: {
    label: "Booked",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
  },
  transferred: {
    label: "Transferred",
    classes: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dotClass: "bg-sky-500",
  },
  message: {
    label: "Message",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
  },
  unanswered: {
    label: "Unanswered",
    classes: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClass: "bg-red-500",
  },
};

// ── Sub-components ───────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendValue,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | null;
  trendValue?: string;
  accent?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-zinc-900">
      <div
        className={cn(
          "absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
          accent ?? "bg-violet-600/20",
        )}
      />
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border",
            accent
              ? "border-white/[0.06] bg-white/[0.04]"
              : "border-violet-500/20 bg-violet-500/10",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              accent ? "text-zinc-400" : "text-violet-400",
            )}
          />
        </div>
        {trend && trend !== null && trendValue && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400",
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-semibold tracking-tight text-white">
          {value}
        </p>
        <p className="mt-0.5 text-[13px] font-medium text-zinc-500">{label}</p>
        {sub && <p className="mt-1.5 text-[11px] text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const cfg = outcomeConfig[outcome];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        cfg.classes,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
      {cfg.label}
    </span>
  );
}

function WeeklyChart({ data }: { data: ChartDay[] }) {
  const maxCalls = Math.max(...data.map((d) => d.calls), 1);
  const [hovered, setHovered] = useState<number | null>(null);
  const totalCalls = data.reduce((acc, d) => acc + d.calls, 0);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-white">Call volume</h2>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Last 7 days · {totalCalls} total calls
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-violet-600" />
            Total
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-emerald-600" />
            Booked
          </span>
        </div>
      </div>
      <div className="flex items-end gap-2" style={{ height: 140 }}>
        {data.map((d, i) => {
          const isHovered = hovered === i;
          const isToday = d.isToday;
          const totalH =
            d.calls === 0 ? 2 : Math.round((d.calls / maxCalls) * 120);
          const bookedH = Math.round((d.booked / maxCalls) * 120);
          return (
            <div
              key={d.day}
              className="group/bar relative flex flex-1 flex-col items-center gap-1"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHovered && (
                <div className="pointer-events-none absolute -top-14 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/[0.1] bg-zinc-800 px-3 py-1.5 text-[11px] text-zinc-300 shadow-xl">
                  <p className="font-semibold text-white">{d.day}</p>
                  <p>
                    {d.calls} calls · {d.booked} booked
                  </p>
                </div>
              )}
              <div
                className="relative flex w-full items-end justify-center gap-0.5"
                style={{ height: 120 }}
              >
                <div
                  className={cn(
                    "w-[calc(50%-1px)] rounded-t-md transition-all duration-200",
                    isToday
                      ? "bg-violet-500"
                      : isHovered
                        ? "bg-violet-600/80"
                        : "bg-violet-600/40",
                  )}
                  style={{ height: totalH }}
                />
                <div
                  className={cn(
                    "w-[calc(50%-1px)] rounded-t-md transition-all duration-200",
                    isToday
                      ? "bg-emerald-500"
                      : isHovered
                        ? "bg-emerald-600/80"
                        : "bg-emerald-600/40",
                  )}
                  style={{ height: bookedH }}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isToday ? "text-violet-400" : "text-zinc-600",
                )}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Dashboard Page ──────────────────────────────

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [activeAgent, setActiveAgent] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [chartData, setChartData] = useState<ChartDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubTenant = onSnapshot(doc(db, "tenants", user.uid), (snap) => {
      if (snap.exists()) setTenant(snap.data());
    });

    const qAgent = query(
      collection(db, "tenants", user.uid, "agents"),
      where("isActive", "==", true),
      limit(1),
    );
    const unsubAgent = onSnapshot(qAgent, (snap) => {
      if (!snap.empty)
        setActiveAgent({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setActiveAgent(null);
    });

    const qCalls = query(
      collection(db, "tenants", user.uid, "calls"),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    const unsubCalls = onSnapshot(qCalls, (snap) => {
      setRecentCalls(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            caller: data.callerNumber || "Unknown",
            time: data.createdAt?.toDate
              ? data.createdAt
                  .toDate()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
              : "Recent",
            duration: data.duration ? fmtDuration(data.duration) : "0s",
            outcome: data.outcome || "unanswered",
            agent: data.agentName || "Agent",
            summary: data.summary || "No summary available",
          } as Call;
        }),
      );
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const qChart = query(
      collection(db, "tenants", user.uid, "calls"),
      where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo)),
      orderBy("createdAt", "asc"),
    );
    const unsubChart = onSnapshot(qChart, (snap) => {
      const daysArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const initial: ChartDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        initial.push({
          day: daysArr[d.getDay()],
          fullDate: d.toDateString(),
          calls: 0,
          booked: 0,
          isToday: i === 0,
        });
      }
      snap.docs.forEach((d) => {
        const call = d.data();
        const callDate = call.createdAt?.toDate
          ? call.createdAt.toDate().toDateString()
          : null;
        const dayObj = initial.find((x) => x.fullDate === callDate);
        if (dayObj) {
          dayObj.calls++;
          if (call.outcome === "booked") dayObj.booked++;
        }
      });
      setChartData(initial);
      setLoading(false);
    });

    return () => {
      unsubTenant();
      unsubAgent();
      unsubCalls();
      unsubChart();
    };
  }, [user]);

  // FIX 5: Compute real trend values from the 7-day chart data
  // Compare today vs yesterday using actual call counts, not hardcoded values
  const trends = useMemo(() => {
    if (chartData.length < 2) return { calls: null, booking: null };

    const today = chartData[chartData.length - 1];
    const yesterday = chartData[chartData.length - 2];

    return {
      calls: trendPct(today.calls, yesterday.calls),
      booking: trendPct(today.booked, yesterday.booked),
    };
  }, [chartData]);

  // FIX 5: Format avgDuration from the stored avgDurationSecs field in Firestore
  const avgDurationSecs = (tenant?.avgDurationSecs ?? 0) as number;
  const avgDurationDisplay = fmtDuration(avgDurationSecs);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Good morning, {user?.displayName?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {activeAgent?.name || "AI"} has handled{" "}
            <span className="font-medium text-zinc-300">
              {tenant?.callsToday || 0} calls
            </span>{" "}
            today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/80 px-3 py-2 text-[13px] font-medium text-zinc-400 transition-all hover:border-white/[0.1] hover:text-zinc-200"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            Refresh
          </button>
          <a
            href="/agents/new"
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:bg-violet-500"
          >
            <Zap className="h-3.5 w-3.5" />
            New agent
          </a>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Calls today"
          value={(tenant?.callsToday ?? 0).toString()}
          sub={`vs ${tenant?.callsYesterday ?? 0} yesterday`}
          icon={PhoneCall}
          trend={trends.calls?.dir}
          trendValue={
            trends.calls?.dir
              ? `${trends.calls.dir === "up" ? "+" : "-"}${trends.calls.pct}%`
              : undefined
          }
        />
        <StatCard
          label="Avg duration"
          value={avgDurationDisplay}
          sub="rolling average"
          icon={Clock}
          accent="bg-sky-600/20"
        />
        <StatCard
          label="Booking rate"
          value={`${tenant?.bookingRate ?? 0}%`}
          sub={`${tenant?.totalBookings ?? 0} total bookings`}
          icon={CalendarCheck}
          trend={trends.booking?.dir}
          trendValue={
            trends.booking?.dir
              ? `${trends.booking.dir === "up" ? "+" : "-"}${trends.booking.pct}%`
              : undefined
          }
          accent="bg-emerald-600/20"
        />
        <StatCard
          label="Missed calls"
          value={(tenant?.missedCalls ?? 0).toString()}
          sub={`${tenant?.missRate ?? 0}% miss rate`}
          icon={PhoneOff}
          accent="bg-red-600/20"
        />
      </div>

      {/* ── Middle row ──────────────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyChart data={chartData} />
        </div>

        <div className="flex flex-col gap-3">
          {/* Active agent card */}
          <div className="flex-1 rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium uppercase tracking-widest text-zinc-600">
                Active agent
              </p>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-900/40">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">
                  {activeAgent?.name || "No active agent"}
                </p>
                <p className="text-[12px] text-zinc-500">
                  {activeAgent?.business || "Setup required"} ·{" "}
                  <span className="capitalize">
                    {activeAgent?.tone || "standard"}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {[
                { label: "Phone", value: activeAgent?.phoneNumber || "—" },
                {
                  label: "Language",
                  value: activeAgent?.language || "English",
                },
                {
                  label: "FAQs trained",
                  value: `${activeAgent?.faqs?.length ?? 0} questions`,
                },
                {
                  label: "Booking rate",
                  value: `${activeAgent?.bookingRate ?? 0}%`,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="text-zinc-600">{label}</span>
                  <span className="font-medium text-zinc-300">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  if (!activeAgent) return;
                  alert(`Initiating web call for ${activeAgent.name}...`);
                  if ((window as any).vapi) {
                    (window as any).vapi.start(activeAgent.id);
                  }
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <Play className="h-3 w-3" />
                Test call
              </button>
              {activeAgent && (
                <a
                  href={`/agents/${activeAgent.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
                >
                  Configure
                  <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Outcome breakdown */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-4">
            <p className="mb-3 text-[12px] font-medium uppercase tracking-widest text-zinc-600">
              Today's outcomes
            </p>
            <div className="space-y-2">
              {(
                [
                  {
                    outcome: "booked",
                    count: tenant?.bookingsToday ?? 0,
                    pct: tenant?.bookingRate ?? 0,
                  },
                  {
                    outcome: "transferred",
                    count: tenant?.transfersToday ?? 0,
                    pct: 0,
                  },
                  {
                    outcome: "message",
                    count: tenant?.messagesToday ?? 0,
                    pct: 0,
                  },
                  {
                    outcome: "unanswered",
                    count: tenant?.missedCalls ?? 0,
                    pct: tenant?.missRate ?? 0,
                  },
                ] as { outcome: Outcome; count: number; pct: number }[]
              ).map(({ outcome, count, pct }) => {
                const cfg = outcomeConfig[outcome];
                return (
                  <div key={outcome} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        cfg.dotClass,
                      )}
                    />
                    <span className="flex-1 text-[12px] text-zinc-400">
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={cn("h-full rounded-full", cfg.dotClass)}
                          style={{ width: `${pct}%`, opacity: 0.7 }}
                        />
                      </div>
                      <span className="w-5 text-right text-[11px] font-medium text-zinc-500">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent calls ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              Recent calls
            </h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              Live feed · updates in real time
            </p>
          </div>
          <a
            href="/calls"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-zinc-400 transition hover:border-white/[0.1] hover:text-zinc-200"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {loading ? (
            <div className="p-6 text-center text-zinc-500">
              Loading recent calls…
            </div>
          ) : recentCalls.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              No recent calls found.
            </div>
          ) : (
            recentCalls.map((call) => (
              <div
                key={call.id}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-zinc-800 text-[10px] font-semibold text-zinc-400">
                  <PhoneCall className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-zinc-200">
                      {call.caller}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {call.time}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                    {call.summary}
                  </p>
                </div>
                <div className="hidden w-16 text-right sm:block">
                  <span className="text-[12px] text-zinc-600">
                    {call.duration}
                  </span>
                </div>
                <OutcomeBadge outcome={call.outcome} />
                <button className="ml-1 rounded-md p-1 text-zinc-700 opacity-0 transition-all hover:bg-white/[0.06] hover:text-zinc-300 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            href: "/agents/new",
            icon: Bot,
            label: "Add agent",
            desc: "Configure a new AI receptionist",
          },
          {
            href: "/calls",
            icon: PhoneCall,
            label: "Call logs",
            desc: "Browse all call transcripts",
          },
          {
            href: "/integrations",
            icon: Zap,
            label: "Integrations",
            desc: "Connect Google Calendar & CRM",
          },
          {
            href: "/settings",
            icon: Users,
            label: "Team",
            desc: "Manage members & billing",
          },
        ].map(({ href, icon: Icon, label, desc }) => (
          <a
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/80 p-4 transition-all duration-150 hover:border-white/[0.1] hover:bg-zinc-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] transition group-hover:border-violet-500/30 group-hover:bg-violet-500/10">
              <Icon className="h-4 w-4 text-zinc-500 transition group-hover:text-violet-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-200">{label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-600">
                {desc}
              </p>
            </div>
          </a>
        ))}
      </div>

      <div className="h-4" />
    </div>
  );
}
