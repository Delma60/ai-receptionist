"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  ChevronLeft,
  Phone,
  Play,
  Settings2,
  Trash2,
  Globe,
  MessageSquare,
  Calendar,
  Activity,
  Save,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { useParams } from "next/navigation";

// ── Helper: format a Firestore Timestamp or ISO string ───────────────────────
// Fix 6: robust timestamp formatting that handles Firestore Timestamp objects,
// ISO strings, and Date objects without crashing.
function formatDate(value: any): string {
  if (!value) return "Recently";
  try {
    // Firestore Timestamp
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleDateString();
    }
    // ISO string or epoch ms
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  } catch {
    // fall through
  }
  return "Recently";
}

export default function AgentDetailPage() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !agentId) return;

    const unsubAgent = onSnapshot(
      doc(db, "tenants", user.uid, "agents", agentId as string),
      (snap) => {
        if (snap.exists()) setAgent({ id: snap.id, ...snap.data() });
      },
    );

    const unsubCalls = onSnapshot(
      query(
        collection(db, "tenants", user.uid, "calls"),
        where("agentId", "==", agentId),
        orderBy("createdAt", "desc"),
        limit(5),
      ),
      (snapshot) => {
        setRecentCalls(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );

    return () => {
      unsubAgent();
      unsubCalls();
    };
  }, [user, agentId]);

  const handleSave = async () => {
    if (!user || !agentId) return;
    setIsSaving(true);
    try {
      await updateDoc(
        doc(db, "tenants", user.uid, "agents", agentId as string),
        agent,
      );
    } catch (e) {
      console.error("Error saving agent:", e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!agent)
    return (
      <div className="flex h-screen items-center justify-center text-zinc-500">
        Loading agent details...
      </div>
    );

  // Fix 7: build the location label from the stored locality/region fields
  // rather than any hardcoded string.
  const numberLocationLabel =
    [agent.locality, agent.region].filter(Boolean).join(", ") ||
    "US Local Number";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── Breadcrumbs & Actions ────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/agents"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-zinc-900/80 text-zinc-400 transition-colors hover:border-white/[0.1] hover:text-zinc-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {agent.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Active
              </span>
            </div>
            <p className="text-sm text-zinc-500">{agent.business}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 border-white/[0.06] bg-zinc-900/80 text-zinc-400 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-white/[0.06] bg-zinc-900/80 text-zinc-400 hover:text-white"
          >
            <Play className="h-4 w-4" />
            Test call
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-violet-600 hover:bg-violet-500"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Config & Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-zinc-900/60 border border-white/[0.06] p-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white/[0.08]"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="identity"
                className="data-[state=active]:bg-white/[0.08]"
              >
                Identity
              </TabsTrigger>
              <TabsTrigger
                value="knowledge"
                className="data-[state=active]:bg-white/[0.08]"
              >
                Knowledge
              </TabsTrigger>
              <TabsTrigger
                value="phone"
                className="data-[state=active]:bg-white/[0.08]"
              >
                Phone
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatMiniCard
                  label="Total calls"
                  value={agent.callsHandled || 0}
                  icon={Activity}
                  color="text-violet-400"
                />
                <StatMiniCard
                  label="Booking rate"
                  value={`${agent.bookingRate || 0}%`}
                  icon={Calendar}
                  color="text-emerald-400"
                />
                <StatMiniCard
                  label="FAQ accuracy"
                  value="98%"
                  icon={CheckCircle2}
                  color="text-sky-400"
                />
              </div>

              <Card className="border-white/[0.06] bg-zinc-900/80">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-zinc-500" />
                    Activity timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentCalls.length > 0 ? (
                      recentCalls.map((call) => (
                        <div
                          key={call.id}
                          className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                              <Phone className="h-4 w-4 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-zinc-200">
                                {call.callerNumber}
                              </p>
                              <p className="text-[11px] text-zinc-600">
                                Incoming call · {Math.floor(call.duration / 60)}
                                m {call.duration % 60}s
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                              {call.outcome?.charAt(0).toUpperCase() +
                                call.outcome?.slice(1)}
                            </span>
                            <p className="mt-1 text-[11px] text-zinc-600">
                              {/* Fix 6: use formatDate helper for consistent rendering */}
                              {formatDate(call.createdAt)
                                ? new Date(
                                    typeof call.createdAt?.toDate === "function"
                                      ? call.createdAt.toDate()
                                      : call.createdAt,
                                  ).toLocaleTimeString()
                                : "Recent"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-zinc-600 text-sm">
                        No recent calls for this agent.
                      </p>
                    )}
                    <Link
                      href="/calls"
                      className="flex items-center justify-center gap-1.5 py-2 text-[12px] text-violet-400 hover:text-violet-300"
                    >
                      View all call logs
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Identity Tab */}
            <TabsContent value="identity" className="mt-6 space-y-6">
              <Card className="border-white/[0.06] bg-zinc-900/80">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-zinc-400">
                        Agent name
                      </label>
                      <Input
                        value={agent.name}
                        onChange={(e) =>
                          setAgent({ ...agent, name: e.target.value })
                        }
                        className="bg-white/[0.03] border-white/[0.08]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-zinc-400">
                        Business name
                      </label>
                      <Input
                        value={agent.business}
                        onChange={(e) =>
                          setAgent({ ...agent, business: e.target.value })
                        }
                        className="bg-white/[0.03] border-white/[0.08]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-400">
                      Greeting message
                    </label>
                    <Textarea
                      rows={4}
                      value={agent.greeting}
                      onChange={(e) =>
                        setAgent({ ...agent, greeting: e.target.value })
                      }
                      className="bg-white/[0.03] border-white/[0.08] resize-none"
                    />
                    <p className="text-[11px] text-zinc-600 italic">
                      This is the first thing callers hear when the call
                      connects.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-zinc-400">
                        Tone
                      </label>
                      <select
                        value={agent.tone || "friendly"}
                        onChange={(e) =>
                          setAgent({ ...agent, tone: e.target.value })
                        }
                        className="w-full rounded-md border border-white/[0.08] bg-zinc-900 px-3 py-2 text-[13px] text-white focus:border-violet-500 outline-none"
                      >
                        <option value="friendly">Friendly</option>
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-zinc-400">
                        Language
                      </label>
                      <select
                        value={agent.language || "English"}
                        onChange={(e) =>
                          setAgent({ ...agent, language: e.target.value })
                        }
                        className="w-full rounded-md border border-white/[0.08] bg-zinc-900 px-3 py-2 text-[13px] text-white focus:border-violet-500 outline-none"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="English / Spanish">
                          English / Spanish
                        </option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Knowledge Tab */}
            <TabsContent value="knowledge" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-medium text-white">
                  Frequently Asked Questions
                </h3>
                <Button
                  size="sm"
                  className="gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs"
                  onClick={() =>
                    setAgent({
                      ...agent,
                      faqs: [
                        ...(agent.faqs || []),
                        { id: Date.now().toString(), question: "", answer: "" },
                      ],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add FAQ
                </Button>
              </div>
              <div className="space-y-3">
                {(agent.faqs || []).map((faq: any) => (
                  <Card
                    key={faq.id ?? faq.question}
                    className="border-white/[0.06] bg-zinc-900/80"
                  >
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <Input
                          defaultValue={faq.question}
                          className="bg-transparent border-0 p-0 font-medium text-zinc-200 focus-visible:ring-0"
                        />
                        <button
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                          onClick={() =>
                            setAgent({
                              ...agent,
                              faqs: agent.faqs.filter((f: any) => f !== faq),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Textarea
                        defaultValue={faq.answer}
                        className="bg-transparent border-0 p-0 text-[13px] text-zinc-500 focus-visible:ring-0 min-h-[40px] resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Phone Tab */}
            <TabsContent value="phone" className="mt-6 space-y-6">
              <Card className="border-white/[0.06] bg-zinc-900/80">
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10 border border-violet-500/20">
                        <Phone className="h-5 w-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-white">
                          {agent.phoneNumber || "No number assigned"}
                        </p>
                        {/* Fix 7: render real locality/region from Firestore, no hardcoded fallback */}
                        <p className="text-[11px] text-zinc-500">
                          {numberLocationLabel}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/[0.06] text-xs"
                    >
                      Change number
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-white/[0.04] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-zinc-200">
                          Call Forwarding
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          Transfer callers to a human team member
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/[0.06] text-xs"
                      >
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-zinc-200">
                          Voicemail
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          Take messages when office is closed
                        </p>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        Enabled
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Sidebar / Context */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="border-white/[0.06] bg-zinc-900/80 p-5">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-violet-900/40 mb-4">
                {agent.name[0]}
              </div>
              <h2 className="text-lg font-bold text-white">{agent.name}</h2>
              <p className="text-[13px] text-zinc-500">AI Receptionist</p>

              <div className="mt-6 w-full space-y-3">
                <div className="flex items-center justify-between text-[12px] border-b border-white/[0.04] pb-2">
                  <span className="text-zinc-600">Language</span>
                  <span className="text-zinc-300 font-medium">
                    {agent.language || "English"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px] border-b border-white/[0.04] pb-2">
                  <span className="text-zinc-600">Tone</span>
                  <span className="text-sky-400 font-medium capitalize">
                    {agent.tone || "friendly"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px] border-b border-white/[0.04] pb-2">
                  <span className="text-zinc-600">Trained FAQs</span>
                  <span className="text-zinc-300 font-medium">
                    {(agent.faqs || []).length} items
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-zinc-600">Created</span>
                  {/* Fix 6: use the formatDate helper for safe, consistent rendering */}
                  <span className="text-zinc-500">
                    {formatDate(agent.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Voice Preview */}
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Voice configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-violet-400">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-zinc-200">
                    Female Voice 2
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    Natural · Calm · Clear
                  </p>
                </div>
                <button className="h-7 w-7 rounded-full bg-violet-600/10 text-violet-400 flex items-center justify-center hover:bg-violet-600/20 transition-colors">
                  <Play className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 text-xs border-white/[0.06] bg-transparent text-zinc-500"
              >
                Change voice model
              </Button>
            </CardContent>
          </Card>

          {/* Quick Integration */}
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Connected apps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[12px] text-zinc-300 font-medium">
                    Google Calendar
                  </span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-orange-500/10 flex items-center justify-center text-orange-400">
                    <Settings2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[12px] text-zinc-300 font-medium">
                    HubSpot CRM
                  </span>
                </div>
                <button className="text-[10px] text-zinc-600 hover:text-zinc-400">
                  Link
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatMiniCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-4 transition-all hover:border-white/[0.1]">
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            "p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]",
            color,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[12px] font-medium text-zinc-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}
