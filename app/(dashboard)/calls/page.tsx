"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  PhoneCall,
  PhoneOff,
  Search,
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
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ────────────────────────────────────────────────────────────────────
type Outcome = "booked" | "transferred" | "message" | "unanswered";

interface TranscriptMessage {
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
  transcript: TranscriptMessage[];
  recordingUrl?: string | null;
}

// ── Config ────────────────────────────────────────────────────────────────────
const outcomeConfig: Record<
  Outcome,
  {
    label: string;
    classes: string;
    dotClass: string;
    icon: React.ElementType;
  }
> = {
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

// ── OutcomeBadge ─────────────────────────────────────────────────────────────
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

// ── AudioPlayer ──────────────────────────────────────────────────────────────
// Real HTML5 audio player wired to the Vapi recording URL.
function AudioPlayer({ url }: { url: string | null | undefined }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Clean up on unmount or URL change.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleDuration);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {}); // some browsers require interaction
    }
    setPlaying(!playing);
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.currentTime + seconds, duration),
    );
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  if (!url) {
    return (
      <div className="border-b border-white/[0.06] px-6 py-4">
        <p className="text-[12px] text-zinc-600 italic">
          No recording available for this call.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-white/[0.06] px-6 py-4">
      {/* Hidden native audio element */}
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={() => skip(-10)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          title="Back 10s"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 transition-colors"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-0.5" />
          )}
        </button>

        <button
          onClick={() => skip(10)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          title="Forward 10s"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1">
          <div
            className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-800 cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = ratio * duration;
            }}
          >
            <div
              className="h-full rounded-full bg-violet-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <Volume2 className="h-4 w-4 text-zinc-600" />
      </div>
    </div>
  );
}

// ── TranscriptDrawer ──────────────────────────────────────────────────────────
function TranscriptDrawer({
  call,
  onClose,
}: {
  call: Call;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!call} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md bg-zinc-950 border-l border-white/[0.06] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-white/[0.06] space-y-0">
          <div>
            <SheetTitle className="text-[16px] font-semibold text-white">
              {call?.callerName ?? call?.caller}
            </SheetTitle>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {call?.date} · {call?.time} · {call?.duration}
            </p>
          </div>
          <div className="mt-2">
            {call && <OutcomeBadge outcome={call.outcome} />}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {/* Summary */}
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Summary
            </p>
            <p className="text-[13px] leading-relaxed text-zinc-300">
              {call?.summary || "No summary available for this call."}
            </p>
          </div>

          {/* Audio Player */}
          <AudioPlayer url={call?.recordingUrl} />

          {/* Transcript */}
          <div className="px-6 py-6 space-y-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Transcript
            </p>

            {!call?.transcript || call.transcript.length === 0 ? (
              <p className="text-[13px] text-zinc-600 italic py-4 text-center">
                No transcript available for this call.
              </p>
            ) : (
              call.transcript.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.role === "caller" && "flex-row-reverse",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      msg.role === "agent"
                        ? "bg-gradient-to-br from-violet-600 to-indigo-700"
                        : "bg-zinc-800",
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
                        "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                        msg.role === "agent"
                          ? "rounded-tl-sm bg-zinc-900 border border-white/[0.04] text-zinc-200"
                          : "rounded-tr-sm bg-violet-600/10 border border-violet-500/10 text-violet-200",
                      )}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-1.5 text-[10px] text-zinc-700">
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-6 py-4">
          <Button
            variant="outline"
            className="w-full bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
            onClick={() => {
              // Re-use logic for export
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export transcript
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsRow({ tenant }: { tenant: any }) {
  const stats = [
    {
      label: "Total calls",
      value: tenant?.totalCalls?.toString() || "0",
      sub: "all time",
      icon: PhoneCall,
      color: "text-violet-400",
    },
    {
      label: "Avg duration",
      value: tenant?.avgDuration || "0m 00s",
      sub: "per call",
      icon: Clock,
      color: "text-sky-400",
    },
    {
      label: "Booking rate",
      value: `${tenant?.bookingRate || 0}%`,
      sub: `${tenant?.totalBookings || 0} bookings`,
      icon: CalendarCheck,
      color: "text-emerald-400",
    },
    {
      label: "Missed",
      value: tenant?.missedCalls?.toString() || "0",
      sub: `${tenant?.missRate || 0}% miss rate`,
      icon: PhoneOff,
      color: "text-red-400",
    },
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<Outcome | "all">("all");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All agents");
  const [durationFilter, setDurationFilter] = useState("Any length");
  const [agentOptions, setAgentOptions] = useState<string[]>(["All agents"]);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubTenant = onSnapshot(doc(db, "tenants", user.uid), (snap) => {
      if (snap.exists()) setTenant(snap.data());
    });

    // Fetch agent options for filter
    const agentRef = collection(db, "tenants", user.uid, "agents");
    onSnapshot(agentRef, (snapshot) => {
      const agents = snapshot.docs.map((doc) => doc.data().name || "Agent");
      setAgentOptions(["All agents", ...agents]);
    });

    // Build query constraints
    let constraints: any[] = [orderBy("createdAt", "desc")];
    const now = new Date();
    if (dateRange === "Today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      constraints.push({ field: "createdAt", op: ">=", value: start });
    } else if (dateRange === "Last 7 days") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6,
      );
      constraints.push({ field: "createdAt", op: ">=", value: start });
    } else if (dateRange === "Last 30 days") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 29,
      );
      constraints.push({ field: "createdAt", op: ">=", value: start });
    }
    // Agent filter
    if (agentFilter !== "All agents") {
      constraints.push({ field: "agentName", op: "==", value: agentFilter });
    }
    // Duration filter
    if (durationFilter === "Under 1 min") {
      constraints.push({ field: "duration", op: "<", value: 60 });
    } else if (durationFilter === "1–3 min") {
      constraints.push({ field: "duration", op: ">=", value: 60 });
      constraints.push({ field: "duration", op: "<=", value: 180 });
    } else if (durationFilter === "Over 3 min") {
      constraints.push({ field: "duration", op: ">", value: 180 });
    }

    // Build Firestore query
    let q = collection(db, "tenants", user.uid, "calls");
    let qArgs: any[] = [];
    constraints.forEach((c) => {
      if (c.field && c.op && c.value !== undefined) {
        const { where } = require("firebase/firestore");
        qArgs.push(where(c.field, c.op, c.value));
      } else {
        qArgs.push(c);
      }
    });
    const finalQuery = query(q, ...qArgs);

    const unsubCalls = onSnapshot(finalQuery, (snapshot) => {
      const callsData = snapshot.docs.map((doc) => {
        const d = doc.data();
        const rawTranscript = d.transcript ?? [];
        const transcript: TranscriptMessage[] = Array.isArray(rawTranscript)
          ? rawTranscript.map((m: any) => ({
              role:
                m.role === "caller" || m.role === "agent"
                  ? m.role
                  : m.role === "user"
                    ? "caller"
                    : "agent",
              text: m.text || m.content || m.message || "",
              time: m.time || "0:00",
            }))
          : [];
        return {
          id: doc.id,
          caller: d.callerNumber || d.caller || "Unknown",
          callerName: d.callerName,
          date: d.createdAt?.toDate
            ? d.createdAt.toDate().toLocaleDateString()
            : "Recent",
          time: d.createdAt?.toDate
            ? d.createdAt
                .toDate()
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          duration: d.duration
            ? `${Math.floor(d.duration / 60)}m ${d.duration % 60}s`
            : "0s",
          durationSec: d.duration || 0,
          outcome: (d.outcome as Outcome) || "unanswered",
          agent: d.agentName || "Agent",
          summary: d.summary || "No summary available",
          transcript,
          recordingUrl: d.recordingUrl || null,
        } as Call;
      });
      setCalls(callsData);
      setLoading(false);
    });

    return () => {
      unsubTenant();
      unsubCalls();
    };
  }, [user, dateRange, agentFilter, durationFilter]);

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      const matchOutcome =
        outcomeFilter === "all" || c.outcome === outcomeFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.caller.includes(q) ||
        (c.callerName?.toLowerCase().includes(q) ?? false) ||
        c.summary.toLowerCase().includes(q);
      return matchOutcome && matchSearch;
    });
  }, [calls, search, outcomeFilter]);

  const outcomes: { value: Outcome | "all"; label: string }[] = [
    { value: "all", label: "All calls" },
    { value: "booked", label: "Booked" },
    { value: "transferred", label: "Transferred" },
    { value: "message", label: "Message" },
    { value: "unanswered", label: "Unanswered" },
  ];

  const exportCSV = () => {
    const header = "Date,Time,Caller,Duration,Outcome,Agent,Summary\n";
    const rows = filtered
      .map(
        (c) =>
          `"${c.date}","${c.time}","${c.callerName ?? c.caller}","${c.duration}","${c.outcome}","${c.agent}","${c.summary.replace(/"/g, '""')}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        Loading call logs...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Call logs
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Browse transcripts, recordings, and outcomes for every call.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          className="gap-2 border-white/[0.06] bg-zinc-900/80 text-zinc-400 hover:text-white"
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <StatsRow tenant={tenant} />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600 z-10" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, name, or summary…"
            className="pl-9 bg-zinc-900/80 border-white/[0.06] text-zinc-200 focus-visible:ring-violet-500/20"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-zinc-900/80 p-1">
          {outcomes.map((o) => (
            <button
              key={o.value}
              onClick={() => setOutcomeFilter(o.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                outcomeFilter === o.value
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className={cn(
            "gap-2 border-white/[0.06] bg-zinc-900/80 text-zinc-400 hover:text-white",
            showFilters
              ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
              : "",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Date Range Filter */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                Date range
              </p>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full bg-zinc-800 border-white/[0.06] text-[13px] text-zinc-300 h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.08] text-zinc-300">
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                  <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agent Filter */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                Agent
              </p>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-full bg-zinc-800 border-white/[0.06] text-[13px] text-zinc-300 h-9">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.08] text-zinc-300">
                  {agentOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Filter */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                Duration
              </p>
              <Select value={durationFilter} onValueChange={setDurationFilter}>
                <SelectTrigger className="w-full bg-zinc-800 border-white/[0.06] text-[13px] text-zinc-300 h-9">
                  <SelectValue placeholder="Any length" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.08] text-zinc-300">
                  <SelectItem value="Any length">Any length</SelectItem>
                  <SelectItem value="Under 1 min">Under 1 min</SelectItem>
                  <SelectItem value="1–3 min">1–3 min</SelectItem>
                  <SelectItem value="Over 3 min">Over 3 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Call list */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 overflow-hidden">
        <div className="hidden border-b border-white/[0.06] px-5 py-3 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4">
          {["Caller", "Date & Time", "Duration", "Outcome", ""].map((h) => (
            <p
              key={h}
              className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600"
            >
              {h}
            </p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <PhoneOff className="mx-auto h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-[14px] font-medium text-zinc-400">
              No calls found
            </p>
            <p className="mt-1 text-[12px] text-zinc-600">
              Try adjusting your search or filters
            </p>
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
                            : "border-white/[0.06] bg-zinc-800",
                        )}
                      >
                        <cfg.icon
                          className={cn(
                            "h-4 w-4",
                            call.outcome === "unanswered"
                              ? "text-red-400"
                              : "text-zinc-400",
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-zinc-200 truncate">
                          {call.callerName ?? call.caller}
                        </p>
                        {call.callerName && (
                          <p className="text-[11px] text-zinc-600">
                            {call.caller}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date & time */}
                    <div className="shrink-0 text-right sm:text-left">
                      <p className="text-[12px] text-zinc-300">{call.date}</p>
                      <p className="text-[11px] text-zinc-600">{call.time}</p>
                    </div>

                    {/* Duration */}
                    <div className="hidden items-center gap-1.5 sm:flex shrink-0">
                      <Clock className="h-3 w-3 text-zinc-600" />
                      <span className="text-[12px] text-zinc-400">
                        {call.duration}
                      </span>
                    </div>

                    {/* Outcome */}
                    <div className="hidden sm:block shrink-0">
                      <OutcomeBadge outcome={call.outcome} />
                    </div>

                    {/* Arrow */}
                    <div className="hidden sm:block shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="hidden sm:block px-5 pb-3 -mt-2">
                    <p className="truncate text-[12px] text-zinc-600 pl-12">
                      {call.summary}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-[12px] text-zinc-600">
              Showing <span className="text-zinc-400">{filtered.length}</span>{" "}
              of {calls.length} calls
            </p>
          </div>
        )}
      </div>

      {/* Transcript drawer */}
      {selectedCall && (
        <TranscriptDrawer
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  );
}
