"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PhoneCall,
  Clock,
  Building2,
  Shield,
  CreditCard,
  Bot,
  ExternalLink,
  MoreHorizontal,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  PhoneOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: "starter" | "growth" | "pro";
  phoneNumber?: string;
  createdAt: any;
  minutesUsed?: number;
  minutesLimit?: number;
  address?: string;
  supportPhone?: string;
  totalCalls?: number;
  totalBookings?: number;
  avgDuration?: string;
}

interface Agent {
  id: string;
  name: string;
  status: string;
  vapiAgentId?: string;
}

interface Call {
  id: string;
  caller: string;
  createdAt: any;
  duration: number;
  outcome: string;
  agentName: string;
}

const planConfig = {
  starter: {
    label: "Starter",
    class: "border-zinc-500/20 text-zinc-400 bg-zinc-500/5",
  },
  growth: {
    label: "Growth",
    class: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10",
  },
  pro: {
    label: "Pro",
    class: "border-violet-500/20 text-violet-400 bg-violet-500/10",
  },
};

const outcomeStyles: Record<string, string> = {
  booked: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  transferred: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  message: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  unanswered: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminTenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    // Listen to tenant data
    const unsubTenant = onSnapshot(doc(db, "tenants", tenantId), (doc) => {
      if (doc.exists()) {
        setTenant({ id: doc.id, ...doc.data() } as Tenant);
      }
      setLoading(false);
    });

    // Listen to agents subcollection
    const unsubAgents = onSnapshot(
      collection(db, "tenants", tenantId, "agents"),
      (snapshot) => {
        setAgents(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Agent[],
        );
      },
    );

    // Listen to recent calls for this tenant
    const qCalls = query(
      collection(db, "tenants", tenantId, "calls"),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsubCalls = onSnapshot(qCalls, (snapshot) => {
      setCalls(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Call[]);
    });

    return () => {
      unsubTenant();
      unsubAgents();
      unsubCalls();
    };
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-zinc-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p>Loading tenant details...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold text-white">Tenant Not Found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Link
                href="/admin/tenants"
                className="hover:text-emerald-400 transition-colors"
              >
                Tenants
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-zinc-300">{tenant.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ImpersonateButton
            tenantId={tenant.id}
            tenantName={tenant.name}
            variant="default"
            size="default"
          />
          <Link href={`/admin/tenants/${tenant.id}/edit`}>
            <Button className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white">
              Update Account
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-2xl border border-white/[0.1] bg-zinc-900 shadow-xl">
            <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xl font-bold uppercase">
              {tenant.name.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {tenant.name}
              </h1>
              <Badge
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] uppercase font-bold",
                  planConfig[tenant.plan]?.class,
                )}
              >
                {planConfig[tenant.plan]?.label}
              </Badge>
            </div>
            <p className="text-zinc-500 text-sm font-mono mt-1 flex items-center gap-2 uppercase tracking-tight">
              TENANT ID: {tenant.id}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Minutes Used",
            value: `${tenant.minutesUsed || 0} / ${tenant.minutesLimit || 500}`,
            icon: Clock,
            color: "text-emerald-400",
          },
          {
            label: "Total Calls",
            value: tenant.totalCalls || calls.length,
            icon: PhoneCall,
            color: "text-violet-400",
          },
          {
            label: "Agents",
            value: agents.length,
            icon: Bot,
            color: "text-sky-400",
          },
          {
            label: "MRR",
            value:
              tenant.plan === "pro"
                ? "$349.00"
                : tenant.plan === "growth"
                  ? "$149.00"
                  : "$49.00",
            icon: CreditCard,
            color: "text-amber-400",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm"
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-zinc-900/60 border border-white/[0.06] p-1 h-11 backdrop-blur-sm">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-white/[0.08] px-6"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="agents"
            className="data-[state=active]:bg-white/[0.08] px-6"
          >
            Agents
          </TabsTrigger>
          <TabsTrigger
            value="calls"
            className="data-[state=active]:bg-white/[0.08] px-6"
          >
            Recent Calls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 md:grid-cols-2">
          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader className="border-b border-white/[0.06] py-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                <span className="text-sm text-zinc-500">Contact Email</span>
                <span className="text-sm text-zinc-200">{tenant.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                <span className="text-sm text-zinc-500">Support Phone</span>
                <span className="text-sm text-zinc-200 font-mono">
                  {tenant.supportPhone || tenant.phoneNumber || "—"}
                </span>
              </div>
              <div className="flex justify-between items-start py-2">
                <span className="text-sm text-zinc-500">Business Address</span>
                <span className="text-sm text-zinc-200 max-w-[200px] text-right leading-tight">
                  {tenant.address || "No address provided"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/[0.06] bg-zinc-900/80">
            <CardHeader className="border-b border-white/[0.06] py-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                System Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                <span className="text-sm text-zinc-500">Account Status</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Healthy
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                <span className="text-sm text-zinc-500">Joined Date</span>
                <span className="text-sm text-zinc-200">
                  {tenant.createdAt?.toDate
                    ? tenant.createdAt.toDate().toLocaleDateString()
                    : "Recent"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-zinc-500">
                  Active Subscriptions
                </span>
                <span className="text-sm text-zinc-200">Stripe Live</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card className="border-white/[0.06] bg-zinc-900/40 overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-medium">
                    Agent Name
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Vapi ID
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-zinc-500 font-medium pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length > 0 ? (
                  agents.map((agent) => (
                    <TableRow
                      key={agent.id}
                      className="border-white/[0.06] hover:bg-white/[0.01] transition-colors"
                    >
                      <TableCell className="font-medium text-zinc-200">
                        {agent.name}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-zinc-500">
                        {agent.vapiAgentId || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] uppercase font-bold",
                            agent.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-500",
                          )}
                        >
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-600 hover:text-white transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-zinc-500"
                    >
                      No agents configured for this tenant.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card className="border-white/[0.06] bg-zinc-900/40 overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-medium">
                    Caller
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Agent
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Outcome
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Duration
                  </TableHead>
                  <TableHead className="text-right text-zinc-500 font-medium pr-6">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.length > 0 ? (
                  calls.map((call) => (
                    <TableRow
                      key={call.id}
                      className="border-white/[0.06] hover:bg-white/[0.01] transition-colors"
                    >
                      <TableCell className="font-medium text-zinc-200">
                        {call.caller}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-400">
                        {call.agentName || "Agent"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] uppercase font-bold",
                            outcomeStyles[call.outcome] ||
                              "bg-zinc-800 text-zinc-500",
                          )}
                        >
                          {call.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {call.duration
                          ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                          : "0s"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-zinc-500 pr-6">
                        {call.createdAt?.toDate
                          ? call.createdAt.toDate().toLocaleDateString()
                          : "Recent"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-zinc-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <PhoneOff className="h-8 w-8 text-zinc-800" />
                        No calls found for this tenant.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
