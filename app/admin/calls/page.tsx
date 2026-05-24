"use client";

import { useState, useEffect } from "react";
import {
  PhoneCall,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collectionGroup,
  query,
  orderBy,
  limit,
  onSnapshot,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface Call {
  id: string;
  tenantId: string;
  tenantName?: string;
  callerNumber: string;
  agentName: string;
  duration: number;
  outcome: "booked" | "transferred" | "message" | "unanswered";
  createdAt: any;
  summary?: string;
}

const outcomeStyles: Record<string, string> = {
  booked: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  transferred: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  message: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  unanswered: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminCallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // 1. Fetch all tenants first to map IDs to names
    const fetchTenants = async () => {
      const snap = await getDocs(collection(db, "tenants"));
      const mapping: Record<string, string> = {};
      snap.docs.forEach((d) => {
        mapping[d.id] = d.data().name || "Unknown Business";
      });
      setTenants(mapping);
    };

    fetchTenants();

    // 2. Listen to all calls across the platform
    const q = query(
      collectionGroup(db, "calls"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        // Extract tenantId from the path: tenants/{tenantId}/calls/{callId}
        const tenantId = doc.ref.parent.parent?.id || "unknown";
        return {
          id: doc.id,
          tenantId,
          ...doc.data(),
        } as Call;
      });
      setCalls(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      c.callerNumber?.toLowerCase().includes(search.toLowerCase()) ||
      tenants[c.tenantId]?.toLowerCase().includes(search.toLowerCase()) ||
      c.agentName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === "all" || c.outcome === filter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Platform Calls</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live monitor of all AI receptionist activity across every registered business.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Live Feed</span>
        </div>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Platform Volume", value: calls.length, icon: PhoneCall, color: "text-blue-400" },
          { label: "Booked", value: calls.filter(c => c.outcome === 'booked').length, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Avg. Duration", value: "2m 14s", icon: Clock, color: "text-violet-400" },
          { label: "Missed/Failed", value: calls.filter(c => c.outcome === 'unanswered').length, icon: XCircle, color: "text-red-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{stat.label}</p>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calls by business, caller, or agent..."
            className="h-10 border-white/[0.06] bg-zinc-900/40 pl-10 text-sm focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex gap-2">
          {["all", "booked", "transferred", "message", "unanswered"].map((o) => (
            <button
              key={o}
              onClick={() => setFilter(o)}
              className={cn(
                "px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all",
                filter === o
                  ? "bg-white/[0.08] border-white/[0.2] text-white"
                  : "bg-zinc-900/40 border-white/[0.06] text-zinc-500 hover:text-zinc-300"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* ── Call Table ── */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-sm text-zinc-500">Connecting to global call stream...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <PhoneCall className="h-10 w-10 text-zinc-800 mb-4" />
            <h3 className="text-lg font-medium text-zinc-500">No calls found</h3>
            <p className="text-sm text-zinc-600 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-zinc-500 font-medium">Business / Tenant</TableHead>
                <TableHead className="text-zinc-500 font-medium">Caller</TableHead>
                <TableHead className="text-zinc-500 font-medium">Agent</TableHead>
                <TableHead className="text-zinc-500 font-medium">Outcome</TableHead>
                <TableHead className="text-zinc-500 font-medium">Duration</TableHead>
                <TableHead className="text-right text-zinc-500 font-medium pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls.map((call) => (
                <TableRow key={call.id} className="border-white/[0.06] hover:bg-white/[0.02] group">
                  <TableCell>
                    <Link 
                      href={`/admin/tenants/${call.tenantId}`}
                      className="flex flex-col min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <span className="font-medium text-zinc-200 truncate flex items-center gap-1.5">
                        {tenants[call.tenantId] || "Loading..."}
                        <ArrowUpRight className="h-3 w-3 text-zinc-600" />
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase">ID: {call.tenantId.slice(0, 8)}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono text-zinc-300">{call.callerNumber || "Anonymous"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-violet-400" />
                      </div>
                      <span className="text-sm text-zinc-400">{call.agentName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-md px-2 py-0.5 text-[10px] uppercase font-bold", outcomeStyles[call.outcome])}>
                      {call.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-500">
                      {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-zinc-300">
                        {call.createdAt?.toDate ? call.createdAt.toDate().toLocaleDateString() : "Recent"}
                      </span>
                      <span className="text-[11px] text-zinc-600">
                        {call.createdAt?.toDate ? call.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
