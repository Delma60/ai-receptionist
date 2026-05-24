"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Plus,
  Phone,
  MoreHorizontal,
  Play,
  Settings2,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  Globe,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";

// ── Types ─────────────────────────────────────────────
type AgentStatus = "active" | "inactive" | "draft";
type AgentTone = "friendly" | "professional" | "casual";

interface Agent {
  id: string;
  name: string;
  business: string;
  tone: AgentTone;
  language: string;
  phoneNumber: string;
  status: AgentStatus;
  callsHandled: number;
  bookingRate: number;
  faqs?: { question: string; answer: string }[];
  createdAt: string;
  lastCallAt: string;
}

// ── Sub-components ────────────────────────────────────
const statusConfig: Record<
  AgentStatus,
  { label: string; dot: string; badge: string }
> = {
  active: {
    label: "Active",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-zinc-500",
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
  draft: {
    label: "Draft",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
};

const toneColors: Record<AgentTone, string> = {
  friendly: "text-sky-400",
  professional: "text-violet-400",
  casual: "text-emerald-400",
};

const avatarGradients: Record<string, string> = {
  "1": "from-violet-600 to-indigo-700",
  "2": "from-blue-600 to-cyan-700",
  "3": "from-pink-600 to-rose-700",
  "4": "from-amber-500 to-orange-600",
};

function AgentCard({ agent }: { agent: Agent }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = statusConfig[agent.status];

  return (
    <div className="group relative rounded-xl border border-white/[0.06] bg-zinc-900/80 p-5 transition-all duration-150 hover:border-white/[0.1] hover:bg-zinc-900">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg text-white font-semibold text-lg",
              avatarGradients[agent.id] ?? "from-violet-600 to-indigo-700",
            )}
          >
            {agent.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-white">
                {agent.name}
              </p>
              {agent.status === "active" && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
              )}
            </div>
            <p className="text-[12px] text-zinc-500">{agent.business}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              status.badge,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md p-1 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-zinc-300"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-white/[0.08] bg-zinc-900 py-1 shadow-xl">
                {[
                  { icon: Play, label: "Test call" },
                  { icon: Settings2, label: "Configure" },
                  { icon: Trash2, label: "Delete", danger: true },
                ].map(({ icon: Icon, label, danger }) => (
                  <button
                    key={label}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors",
                      danger
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info row */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 text-[12px] text-zinc-500">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{agent.phoneNumber}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-zinc-500">
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate">{agent.language}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px]">
          <Bot className="h-3 w-3 shrink-0 text-zinc-600" />
          <span
            className={cn("capitalize font-medium", toneColors[agent.tone])}
          >
            {agent.tone}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-zinc-500">
          <MessageSquare className="h-3 w-3 shrink-0" />
          <span>{agent.faqs ? agent.faqs.length : 0} FAQs</span>
        </div>
      </div>

      {/* Stats */}
      {agent.status !== "draft" ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-3 py-2">
            <p className="text-[11px] text-zinc-600 mb-0.5">Calls handled</p>
            <p className="text-[15px] font-semibold text-white">
              {agent.callsHandled}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-3 py-2">
            <p className="text-[11px] text-zinc-600 mb-0.5">Booking rate</p>
            <p className="text-[15px] font-semibold text-white">
              {agent.bookingRate}%
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-white/[0.08] px-3 py-3 text-center">
          <p className="text-[12px] text-zinc-600">
            Setup incomplete — no phone number assigned
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-600">
          {agent.status !== "draft"
            ? `Last call ${agent.lastCallAt}`
            : `Created ${agent.createdAt}`}
        </p>
        <a
          href={`/agents/${agent.id}`}
          className="flex items-center gap-1 text-[12px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
        >
          {agent.status === "draft" ? "Finish setup" : "Manage"}
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | AgentStatus>("all");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "tenants", user.uid, "agents"));
    const unsub = onSnapshot(q, (snapshot) => {
      const agentsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // faqCount removed; always use faqs length
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleDateString()
            : data.createdAt || "Recently",
          lastCallAt: data.lastCallAt?.toDate
            ? data.lastCallAt.toDate().toLocaleTimeString()
            : data.lastCallAt || "Never",
        } as Agent;
      });
      setAgents(agentsData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const filtered =
    filter === "all" ? agents : agents.filter((a) => a.status === filter);

  const counts = {
    all: agents.length,
    active: agents.filter((a) => a.status === "active").length,
    inactive: agents.filter((a) => a.status === "inactive").length,
    draft: agents.filter((a) => a.status === "draft").length,
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        Loading agents...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Agents
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {counts.active} active · {counts.draft} draft
          </p>
        </div>
        <a
          href="/agents/new"
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:bg-violet-500"
        >
          <Plus className="h-3.5 w-3.5" />
          New agent
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-zinc-900/60 p-1 w-fit">
        {(["all", "active", "inactive", "draft"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium transition-all capitalize",
              filter === tab
                ? "bg-white/[0.08] text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {tab}
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                filter === tab
                  ? "bg-violet-600/80 text-white"
                  : "bg-white/[0.05] text-zinc-600",
              )}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}

          {/* Add agent card */}
          <a
            href="/agents/new"
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.08] bg-transparent p-8 text-center transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] transition-all group-hover:border-violet-500/30 group-hover:bg-violet-500/10">
              <Plus className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-violet-400" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                Add new agent
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Configure an AI receptionist
              </p>
            </div>
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
            <Bot className="h-6 w-6 text-zinc-600" />
          </div>
          <p className="text-[14px] font-medium text-zinc-400">
            No agents found
          </p>
          <p className="mt-1 text-[12px] text-zinc-600">
            Try a different filter or create a new agent
          </p>
        </div>
      )}

      {/* Plan note */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-900/60 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Zap className="h-4 w-4 text-violet-400" />
          <p className="text-[13px] text-zinc-400">
            <span className="text-zinc-200 font-medium">{counts.active}/1</span>{" "}
            active agents on Starter plan
          </p>
        </div>
        <a
          href="/settings"
          className="text-[12px] text-violet-400 hover:text-violet-300 transition-colors font-medium"
        >
          Upgrade →
        </a>
      </div>
    </div>
  );
}
