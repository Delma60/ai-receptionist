"use client";

import { useState } from "react";
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

// ── Types ────────────────────────────────────────────
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

// ── Mock data ────────────────────────────────────────
const recentCalls: Call[] = [
  {
    id: "1",
    caller: "+1 (415) 823-4411",
    time: "2 min ago",
    duration: "3m 42s",
    outcome: "booked",
    agent: "Lisa",
    summary: "Booked dental cleaning for Thursday 2 PM",
  },
  {
    id: "2",
    caller: "+1 (628) 901-5523",
    time: "18 min ago",
    duration: "1m 15s",
    outcome: "message",
    agent: "Lisa",
    summary: "Asked about office hours, took a message",
  },
  {
    id: "3",
    caller: "+1 (510) 774-2200",
    time: "34 min ago",
    duration: "5m 08s",
    outcome: "transferred",
    agent: "Lisa",
    summary: "Requested to speak with Dr. Martinez directly",
  },
  {
    id: "4",
    caller: "+1 (415) 229-6780",
    time: "1h ago",
    duration: "0m 28s",
    outcome: "unanswered",
    agent: "Lisa",
    summary: "Call dropped before agent could respond",
  },
  {
    id: "5",
    caller: "+1 (669) 345-8871",
    time: "1h 22m ago",
    duration: "4m 55s",
    outcome: "booked",
    agent: "Lisa",
    summary: "Rescheduled root canal to next Monday",
  },
  {
    id: "6",
    caller: "+1 (408) 512-3341",
    time: "2h ago",
    duration: "2m 10s",
    outcome: "booked",
    agent: "Lisa",
    summary: "New patient inquiry, booked consultation",
  },
];

const weeklyData = [
  { day: "Mon", calls: 28, booked: 18 },
  { day: "Tue", calls: 35, booked: 24 },
  { day: "Wed", calls: 22, booked: 14 },
  { day: "Thu", calls: 41, booked: 31 },
  { day: "Fri", calls: 38, booked: 27 },
  { day: "Sat", calls: 19, booked: 12 },
  { day: "Sun", calls: 12, booked: 7 },
];

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

// ── Sub-components ───────────────────────────────────
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
  trend?: "up" | "down";
  trendValue?: string;
  accent?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-zinc-900">
      {/* Subtle corner glow */}
      <div
        className={cn(
          "absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
          accent ?? "bg-violet-600/20"
        )}
      />

      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border",
            accent
              ? "border-white/[0.06] bg-white/[0.04]"
              : "border-violet-500/20 bg-violet-500/10"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              accent ? "text-zinc-400" : "text-violet-400"
            )}
          />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
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
        {sub && (
          <p className="mt-1.5 text-[11px] text-zinc-600">{sub}</p>
        )}
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
        cfg.classes
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
      {cfg.label}
    </span>
  );
}

function WeeklyChart() {
  const maxCalls = Math.max(...weeklyData.map((d) => d.calls));
  const [hovered, setHovered] = useState<number | null>(null);
  const today = 4; // Thursday index

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-white">
            Call volume
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            This week · 195 total calls
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
        {weeklyData.map((d, i) => {
          const isHovered = hovered === i;
          const isToday = i === today;
          const totalH = Math.round((d.calls / maxCalls) * 120);
          const bookedH = Math.round((d.booked / maxCalls) * 120);

          return (
            <div
              key={d.day}
              className="group/bar relative flex flex-1 flex-col items-center gap-1"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="pointer-events-none absolute -top-14 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/[0.1] bg-zinc-800 px-3 py-1.5 text-[11px] text-zinc-300 shadow-xl">
                  <p className="font-semibold text-white">{d.day}</p>
                  <p>{d.calls} calls · {d.booked} booked</p>
                </div>
              )}

              {/* Bar group */}
              <div
                className="relative flex w-full items-end justify-center gap-0.5"
                style={{ height: 120 }}
              >
                {/* Total bar */}
                <div
                  className={cn(
                    "w-[calc(50%-1px)] rounded-t-md transition-all duration-200",
                    isToday
                      ? "bg-violet-500"
                      : isHovered
                      ? "bg-violet-600/80"
                      : "bg-violet-600/40"
                  )}
                  style={{ height: totalH }}
                />
                {/* Booked bar */}
                <div
                  className={cn(
                    "w-[calc(50%-1px)] rounded-t-md transition-all duration-200",
                    isToday
                      ? "bg-emerald-500"
                      : isHovered
                      ? "bg-emerald-600/80"
                      : "bg-emerald-600/40"
                  )}
                  style={{ height: bookedH }}
                />
              </div>

              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isToday ? "text-violet-400" : "text-zinc-600"
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
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── Header ────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Good morning, John 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Thursday, May 23 · Lisa has handled{" "}
            <span className="font-medium text-zinc-300">14 calls</span> today
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

      {/* ── Stat cards ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Calls today"
          value="14"
          sub="vs 11 yesterday"
          icon={PhoneCall}
          trend="up"
          trendValue="+27%"
        />
        <StatCard
          label="Avg duration"
          value="3m 12s"
          sub="across all calls"
          icon={Clock}
          trend="down"
          trendValue="-8s"
          accent="bg-sky-600/20"
        />
        <StatCard
          label="Booking rate"
          value="64%"
          sub="9 of 14 calls"
          icon={CalendarCheck}
          trend="up"
          trendValue="+12%"
          accent="bg-emerald-600/20"
        />
        <StatCard
          label="Missed calls"
          value="1"
          sub="0.7% miss rate"
          icon={PhoneOff}
          accent="bg-red-600/20"
        />
      </div>

      {/* ── Middle row: chart + agent card ────────── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Chart — spans 2 cols */}
        <div className="lg:col-span-2">
          <WeeklyChart />
        </div>

        {/* Active agent card */}
        <div className="flex flex-col gap-3">
          {/* Agent status */}
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
                <p className="text-[15px] font-semibold text-white">Lisa</p>
                <p className="text-[12px] text-zinc-500">Bright Dental · Friendly</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { label: "Phone", value: "+1 (415) 800-2200" },
                { label: "Language", value: "English" },
                { label: "FAQs trained", value: "12 questions" },
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
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200">
                <Play className="h-3 w-3" />
                Test call
              </button>
              <a
                href="/agents/1"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
              >
                Configure
                <ChevronRight className="h-3 w-3" />
              </a>
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
                  { outcome: "booked", count: 9, pct: 64 },
                  { outcome: "transferred", count: 2, pct: 14 },
                  { outcome: "message", count: 2, pct: 14 },
                  { outcome: "unanswered", count: 1, pct: 7 },
                ] as { outcome: Outcome; count: number; pct: number }[]
              ).map(({ outcome, count, pct }) => {
                const cfg = outcomeConfig[outcome];
                return (
                  <div key={outcome} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        cfg.dotClass
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

      {/* ── Recent calls table ─────────────────────── */}
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
          {recentCalls.map((call) => (
            <div
              key={call.id}
              className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
            >
              {/* Caller avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-zinc-800 text-[10px] font-semibold text-zinc-400">
                <PhoneCall className="h-3.5 w-3.5" />
              </div>

              {/* Caller + summary */}
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

              {/* Duration */}
              <div className="hidden w-16 text-right sm:block">
                <span className="text-[12px] text-zinc-600">{call.duration}</span>
              </div>

              {/* Outcome badge */}
              <div className="shrink-0">
                <OutcomeBadge outcome={call.outcome} />
              </div>

              {/* More button */}
              <button className="ml-1 rounded-md p-1 text-zinc-700 opacity-0 transition-all hover:bg-white/[0.06] hover:text-zinc-300 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────── */}
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

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  );
}