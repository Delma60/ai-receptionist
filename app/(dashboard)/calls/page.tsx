"use client";

import { useState, useMemo } from "react";
import {
  PhoneCall,
  PhoneOff,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  CalendarCheck,
  MessageSquare,
  ArrowUpRight,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Bot,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────
type Outcome = "booked" | "transferred" | "message" | "unanswered";

interface Message {
  role: "agent" | "caller";
  text: string;
  time: string;
}

interface Call {
  id: string;
  caller: string;
  callerName?: string;
  date: string;
  time: string;
  duration: string;
  durationSec: number;
  outcome: Outcome;
  agent: string;
  summary: string;
  transcript: Message[];
}

// ── Mock data ────────────────────────────────────────
const calls: Call[] = [
  {
    id: "c1",
    caller: "+1 (415) 823-4411",
    callerName: "Sarah M.",
    date: "Today",
    time: "10:14 AM",
    duration: "3m 42s",
    durationSec: 222,
    outcome: "booked",
    agent: "Lisa",
    summary: "Booked dental cleaning for Thursday 2 PM. Patient asked about insurance coverage — confirmed Delta Dental accepted.",
    transcript: [
      { role: "agent", text: "Thank you for calling Bright Dental, this is Lisa. How can I help you today?", time: "0:00" },
      { role: "caller", text: "Hi, I'd like to book a cleaning appointment.", time: "0:07" },
      { role: "agent", text: "Of course! I'd be happy to help. Do you have a preference for date and time?", time: "0:12" },
      { role: "caller", text: "Thursday afternoon works best for me.", time: "0:19" },
      { role: "agent", text: "I have Thursday at 2:00 PM available with Dr. Martinez. Does that work for you?", time: "0:24" },
      { role: "caller", text: "Perfect. Also, do you accept Delta Dental?", time: "0:32" },
      { role: "agent", text: "Yes, we do accept Delta Dental insurance. I'll go ahead and book that appointment for Thursday at 2 PM. Can I get your name?", time: "0:38" },
      { role: "caller", text: "Sarah Miller.", time: "0:51" },
      { role: "agent", text: "Perfect, Sarah. You're all set for Thursday at 2 PM. You'll receive a confirmation text shortly. Is there anything else I can help with?", time: "0:55" },
      { role: "caller", text: "No that's all. Thank you!", time: "1:08" },
      { role: "agent", text: "Have a great day, Sarah! We'll see you Thursday.", time: "1:12" },
    ],
  },
  {
    id: "c2",
    caller: "+1 (628) 901-5523",
    date: "Today",
    time: "9:56 AM",
    duration: "1m 15s",
    durationSec: 75,
    outcome: "message",
    agent: "Lisa",
    summary: "Caller asked about office hours and holiday schedule. Left message requesting callback about pricing.",
    transcript: [
      { role: "agent", text: "Thank you for calling Bright Dental, this is Lisa. How can I help?", time: "0:00" },
      { role: "caller", text: "What are your office hours?", time: "0:06" },
      { role: "agent", text: "We're open Monday through Friday 8 AM to 6 PM, and Saturdays from 9 AM to 2 PM. We're closed on Sundays and major holidays.", time: "0:10" },
      { role: "caller", text: "Are you open on Thanksgiving?", time: "0:22" },
      { role: "agent", text: "We will be closed on Thanksgiving but will reopen the following Monday.", time: "0:27" },
      { role: "caller", text: "Okay. Can someone call me back about pricing for veneers?", time: "0:34" },
      { role: "agent", text: "Absolutely! I'll take down your number and have someone from our team reach out. What's the best number to reach you?", time: "0:40" },
      { role: "caller", text: "628-901-5523.", time: "0:48" },
      { role: "agent", text: "Got it. Someone will call you back within the business day. Is there anything else?", time: "0:52" },
      { role: "caller", text: "No that's fine.", time: "1:00" },
    ],
  },
  {
    id: "c3",
    caller: "+1 (510) 774-2200",
    callerName: "James R.",
    date: "Today",
    time: "9:31 AM",
    duration: "5m 08s",
    durationSec: 308,
    outcome: "transferred",
    agent: "Lisa",
    summary: "Patient requested to speak with Dr. Martinez directly about a post-procedure concern. Call transferred successfully.",
    transcript: [
      { role: "agent", text: "Thank you for calling Bright Dental, this is Lisa. How can I help you today?", time: "0:00" },
      { role: "caller", text: "I need to speak with Dr. Martinez. I had a root canal last week and I'm having some pain.", time: "0:07" },
      { role: "agent", text: "I'm sorry to hear you're experiencing discomfort. I can note that down and have Dr. Martinez call you back, or I can transfer you to the front desk where they can connect you directly.", time: "0:17" },
      { role: "caller", text: "I'd like to speak to someone now if possible.", time: "0:31" },
      { role: "agent", text: "Of course, let me transfer you to our front desk right away. Please hold for just a moment.", time: "0:36" },
    ],
  },
  {
    id: "c4",
    caller: "+1 (415) 229-6780",
    date: "Today",
    time: "8:59 AM",
    duration: "0m 28s",
    durationSec: 28,
    outcome: "unanswered",
    agent: "Lisa",
    summary: "Call dropped before agent could respond. No voicemail left.",
    transcript: [
      { role: "agent", text: "Thank you for calling Bright Dental, this is Lisa—", time: "0:00" },
    ],
  },
  {
    id: "c5",
    caller: "+1 (669) 345-8871",
    callerName: "Tom K.",
    date: "Yesterday",
    time: "3:44 PM",
    duration: "4m 55s",
    durationSec: 295,
    outcome: "booked",
    agent: "Lisa",
    summary: "Rescheduled root canal from Friday to next Monday at 10 AM. Patient confirmed they stopped blood thinners.",
    transcript: [
      { role: "agent", text: "Thank you for calling Bright Dental, this is Lisa. How can I help?", time: "0:00" },
      { role: "caller", text: "Hi, I need to reschedule my root canal. It was booked for this Friday.", time: "0:06" },
      { role: "agent", text: "Of course, I can help with that. Can I get your name?", time: "0:13" },
      { role: "caller", text: "Tom Kowalski.", time: "0:18" },
      { role: "agent", text: "Found you, Tom. Your appointment is Friday at 1 PM. What day works better for you?", time: "0:22" },
      { role: "caller", text: "Can we do next Monday?", time: "0:31" },
      { role: "agent", text: "We have 10 AM or 2 PM available Monday. Any preference?", time: "0:35" },
      { role: "caller", text: "10 AM please.", time: "0:41" },
      { role: "agent", text: "Perfect. Before I confirm, Dr. Martinez asked that we check — have you stopped taking blood thinners as advised?", time: "0:45" },
      { role: "caller", text: "Yes, stopped them 3 days ago.", time: "0:56" },
      { role: "agent", text: "Great. You're all rescheduled for Monday at 10 AM. We'll send a reminder the day before.", time: "1:01" },
    ],
  },
  {
    id: "c6",
    caller: "+1 (408) 512-3341",
    date: "Yesterday",
    time: "11:20 AM",
    duration: "2m 10s",
    durationSec: 130,
    outcome: "booked",
    agent: "Lisa",
    summary: "New patient inquiry. Booked initial consultation for Monday 9 AM. Explained new patient intake process.",
    transcript: [
      { role: "agent", text: "Thank you for calling Bright Dental, this is Lisa. How can I help?", time: "0:00" },
      { role: "caller", text: "Hi, I'm looking for a new dentist. Do you accept new patients?", time: "0:06" },
      { role: "agent", text: "We do! We'd love to have you. Would you like to schedule a new patient consultation?", time: "0:12" },
      { role: "caller", text: "Yes please. What does that involve?", time: "0:19" },
      { role: "agent", text: "The first visit is a full exam with x-rays, takes about an hour. Dr. Martinez will go over everything with you and create a treatment plan if needed.", time: "0:24" },
      { role: "caller", text: "Sounds good. Can you do Monday morning?", time: "0:38" },
      { role: "agent", text: "We have 9 AM open on Monday. Can I get your name to book that?", time: "0:43" },
    ],
  },
  {
    id: "c7",
    caller: "+1 (650) 332-9001",
    callerName: "Maria C.",
    date: "May 21",
    time: "2:15 PM",
    duration: "3m 30s",
    durationSec: 210,
    outcome: "booked",
    agent: "Lisa",
    summary: "Emergency appointment booked for same-day toothache. Patient reported pain level 8/10.",
    transcript: [
      { role: "agent", text: "Thank you for calling Bright Dental, this is Lisa. How can I help?", time: "0:00" },
      { role: "caller", text: "I have a really bad toothache. It started last night and it's getting worse.", time: "0:06" },
      { role: "agent", text: "I'm sorry to hear that. On a scale of 1-10, how would you rate the pain?", time: "0:14" },
      { role: "caller", text: "About an 8. It's throbbing.", time: "0:21" },
      { role: "agent", text: "We take tooth pain very seriously. Let me check our emergency slots for today.", time: "0:26" },
    ],
  },
];

// ── Config ────────────────────────────────────────────
const outcomeConfig: Record<Outcome, { label: string; classes: string; dotClass: string; icon: React.ElementType }> = {
  booked: {
    label: "Booked",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
    icon: CalendarCheck,
  },
  transferred: {
    label: "Transferred",
    classes: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dotClass: "bg-sky-500",
    icon: ArrowUpRight,
  },
  message: {
    label: "Message",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
    icon: MessageSquare,
  },
  unanswered: {
    label: "Unanswered",
    classes: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClass: "bg-red-500",
    icon: PhoneOff,
  },
};

// ── Sub-components ─────────────────────────────────────
function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const cfg = outcomeConfig[outcome];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", cfg.classes)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
      {cfg.label}
    </span>
  );
}

function TranscriptDrawer({ call, onClose }: { call: Call; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/[0.06] bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <p className="text-[15px] font-semibold text-white">
              {call.callerName ?? call.caller}
            </p>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {call.date} · {call.time} · {call.duration}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OutcomeBadge outcome={call.outcome} />
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="border-b border-white/[0.06] px-6 py-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Summary</p>
          <p className="text-[13px] leading-relaxed text-zinc-300">{call.summary}</p>
        </div>

        {/* Fake audio player */}
        <div className="border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPlaying(!playing)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 transition-colors"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-[38%] rounded-full bg-violet-600" />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
                <span>1:24</span>
                <span>{call.duration}</span>
              </div>
            </div>
            <Volume2 className="h-4 w-4 text-zinc-600" />
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Transcript</p>
          {call.transcript.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "caller" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  msg.role === "agent"
                    ? "bg-gradient-to-br from-violet-600 to-indigo-700"
                    : "bg-zinc-800"
                )}
              >
                {msg.role === "agent" ? (
                  <Bot className="h-3.5 w-3.5 text-white" />
                ) : (
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </div>
              <div className={cn("max-w-[80%]", msg.role === "caller" && "items-end flex flex-col")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    msg.role === "agent"
                      ? "rounded-tl-sm bg-zinc-800/80 text-zinc-200"
                      : "rounded-tr-sm bg-violet-600/20 text-violet-200"
                  )}
                >
                  {msg.text}
                </div>
                <span className="mt-1 text-[10px] text-zinc-700">{msg.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-6 py-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2.5 text-[13px] font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export transcript
          </button>
        </div>
      </div>
    </>
  );
}

// ── Stats ─────────────────────────────────────────────
function StatsRow() {
  const stats = [
    { label: "Total calls", value: "47", sub: "last 7 days", icon: PhoneCall, color: "text-violet-400" },
    { label: "Avg duration", value: "3m 08s", sub: "per call", icon: Clock, color: "text-sky-400" },
    { label: "Booking rate", value: "62%", sub: "29 bookings", icon: CalendarCheck, color: "text-emerald-400" },
    { label: "Missed", value: "3", sub: "6.4% miss rate", icon: PhoneOff, color: "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-white/[0.06] bg-zinc-900/80 px-4 py-3.5"
        >
          <div className="flex items-center gap-2 mb-2">
            <s.icon className={cn("h-4 w-4", s.color)} />
            <p className="text-[12px] text-zinc-500">{s.label}</p>
          </div>
          <p className="text-xl font-semibold text-white">{s.value}</p>
          <p className="mt-0.5 text-[11px] text-zinc-600">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<Outcome | "all">("all");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      const matchOutcome = outcomeFilter === "all" || c.outcome === outcomeFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.caller.includes(q) ||
        (c.callerName?.toLowerCase().includes(q) ?? false) ||
        c.summary.toLowerCase().includes(q);
      return matchOutcome && matchSearch;
    });
  }, [search, outcomeFilter]);

  const outcomes: { value: Outcome | "all"; label: string }[] = [
    { value: "all", label: "All calls" },
    { value: "booked", label: "Booked" },
    { value: "transferred", label: "Transferred" },
    { value: "message", label: "Message" },
    { value: "unanswered", label: "Unanswered" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Call logs</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Browse transcripts, recordings, and outcomes for every call.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/80 px-3.5 py-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <StatsRow />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, name, or summary…"
            className="w-full rounded-lg border border-white/[0.06] bg-zinc-900/80 py-2 pl-9 pr-4 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-colors"
          />
        </div>

        {/* Outcome tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-zinc-900/80 p-1">
          {outcomes.map((o) => (
            <button
              key={o.value}
              onClick={() => setOutcomeFilter(o.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                outcomeFilter === o.value
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors",
            showFilters
              ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
              : "border-white/[0.06] bg-zinc-900/80 text-zinc-400 hover:text-zinc-200"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Date range", options: ["Today", "Last 7 days", "Last 30 days", "Custom"] },
              { label: "Agent", options: ["All agents", "Lisa", "Max", "Sofia"] },
              { label: "Duration", options: ["Any length", "Under 1 min", "1–3 min", "Over 3 min"] },
            ].map((f) => (
              <div key={f.label}>
                <p className="mb-1.5 text-[11px] font-medium text-zinc-500">{f.label}</p>
                <div className="relative">
                  <select className="w-full appearance-none rounded-lg border border-white/[0.06] bg-zinc-800 py-2 pl-3 pr-8 text-[13px] text-zinc-300 outline-none focus:border-violet-500/40">
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call list */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 overflow-hidden">
        {/* Table header */}
        <div className="hidden border-b border-white/[0.06] px-5 py-3 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4">
          {["Caller", "Date & Time", "Duration", "Outcome", ""].map((h) => (
            <p key={h} className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              {h}
            </p>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <PhoneOff className="mx-auto h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-[14px] font-medium text-zinc-400">No calls found</p>
            <p className="mt-1 text-[12px] text-zinc-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((call) => {
              const cfg = outcomeConfig[call.outcome];
              return (
                <button
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className="group w-full text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex flex-col gap-2 px-5 py-4 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-4">
                    {/* Caller */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                          call.outcome === "unanswered"
                            ? "border-red-500/20 bg-red-500/10"
                            : "border-white/[0.06] bg-zinc-800"
                        )}
                      >
                        <cfg.icon
                          className={cn(
                            "h-4 w-4",
                            call.outcome === "unanswered" ? "text-red-400" : "text-zinc-400"
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-zinc-200 truncate">
                          {call.callerName ?? call.caller}
                        </p>
                        {call.callerName && (
                          <p className="text-[11px] text-zinc-600">{call.caller}</p>
                        )}
                        <p className="mt-0.5 truncate text-[12px] text-zinc-500 sm:hidden">
                          {call.summary}
                        </p>
                      </div>
                    </div>

                    {/* Summary (sm+) */}
                    <p className="hidden truncate text-[12px] text-zinc-500 sm:block col-span-1" style={{ display: "none" }}>
                      {call.summary}
                    </p>

                    {/* Date & time */}
                    <div className="shrink-0 text-right sm:text-left">
                      <p className="text-[12px] text-zinc-300">{call.date}</p>
                      <p className="text-[11px] text-zinc-600">{call.time}</p>
                    </div>

                    {/* Duration */}
                    <div className="hidden items-center gap-1.5 sm:flex shrink-0">
                      <Clock className="h-3 w-3 text-zinc-600" />
                      <span className="text-[12px] text-zinc-400">{call.duration}</span>
                    </div>

                    {/* Outcome badge */}
                    <div className="hidden sm:block shrink-0">
                      <OutcomeBadge outcome={call.outcome} />
                    </div>

                    {/* Arrow */}
                    <div className="hidden sm:block shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>

                  {/* Summary below on sm */}
                  <div className="hidden sm:block px-5 pb-3 -mt-2">
                    <p className="truncate text-[12px] text-zinc-600 pl-12">{call.summary}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-[12px] text-zinc-600">
              Showing <span className="text-zinc-400">{filtered.length}</span> of {calls.length} calls
            </p>
            <button className="text-[12px] text-violet-400 hover:text-violet-300 transition-colors">
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Transcript drawer */}
      {selectedCall && (
        <TranscriptDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}