"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  MoreHorizontal,
  ExternalLink,
  Mail,
  Phone,
  Calendar,
  Shield,
  Zap,
  CreditCard,
  ChevronRight,
  Filter,
  ArrowUpRight,
  UserCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: "starter" | "growth" | "pro";
  phoneNumber?: string;
  createdAt: any;
  minutesUsed?: number;
  minutesLimit?: number;
}

// PopoverMenu component for More actions
function PopoverMenu({ tenantId }: { tenantId: string }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-8 w-8 text-zinc-500 hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-40 p-2 bg-zinc-900 border-white/[0.08]"
      >
        <div className="flex flex-col gap-1">
          <Link href={`/admin/tenants/${tenantId}/edit`}>
            <Button
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-emerald-400"
            >
              Edit Tenant
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-400 hover:text-red-500"
          >
            Delete Tenant
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const planConfig = {
  starter: {
    label: "Starter",
    variant: "outline" as const,
    class: "border-zinc-500/20 text-zinc-400 bg-zinc-500/5",
  },
  growth: {
    label: "Growth",
    variant: "default" as const,
    class: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10",
  },
  pro: {
    label: "Pro",
    variant: "default" as const,
    class: "border-violet-500/20 text-violet-400 bg-violet-500/10",
  },
};

export default function AdminTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "tenants"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Tenant[];
      setTenants(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = tenants.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tenants</h1>
          <p className="text-sm text-zinc-500">
            Monitor and manage all registered business accounts and
            subscriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white">
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Total Tenants",
            value: tenants.length,
            icon: Users,
            color: "text-emerald-400",
          },
          {
            label: "Active Subscriptions",
            value: tenants.filter((t) => t.plan !== "starter").length,
            icon: CreditCard,
            color: "text-violet-400",
          },
          {
            label: "Growth Rate",
            value: "+12%",
            icon: ArrowUpRight,
            color: "text-sky-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Directory ── */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or ID..."
            className="h-11 border-white/[0.06] bg-zinc-900/40 pl-10 text-sm ring-offset-zinc-950 focus:ring-emerald-500/20"
          />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden backdrop-blur-md">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Users className="h-10 w-10 text-zinc-700 animate-pulse mb-4" />
              <p className="text-sm text-zinc-600">
                Loading registered organizations...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Users className="h-10 w-10 text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-zinc-400">
                No tenants found
              </h3>
              <p className="text-sm text-zinc-600 mt-1">
                Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <div className="w-full">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-zinc-500 font-medium">
                      Tenant
                    </TableHead>
                    <TableHead className="text-zinc-500 font-medium">
                      Status & Plan
                    </TableHead>
                    {/* Hide on small screens */}
                    <TableHead className="hidden md:table-cell text-zinc-500 font-medium">
                      Phone
                    </TableHead>
                    {/* Hide on small/medium screens */}
                    <TableHead className="hidden lg:table-cell text-zinc-500 font-medium">
                      Joined
                    </TableHead>
                    <TableHead className="text-right text-zinc-500 font-medium">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      className="border-white/[0.06] hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                    >
                      {/* Truncate long names/emails on mobile */}
                      <TableCell className="max-w-[150px] sm:max-w-xs">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0 rounded-lg border border-white/[0.06]">
                            <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase rounded-lg">
                              {tenant.name?.substring(0, 2) || "T"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-zinc-200 truncate">
                              {tenant.name}
                            </span>
                            <span className="text-xs text-zinc-500 truncate">
                              {tenant.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] uppercase font-bold",
                            planConfig[tenant.plan]?.class,
                          )}
                        >
                          {planConfig[tenant.plan]?.label || tenant.plan}
                        </Badge>
                      </TableCell>

                      {/* Hide on small screens */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-mono text-zinc-400">
                          {tenant.phoneNumber || "—"}
                        </span>
                      </TableCell>

                      {/* Hide on small/medium screens */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-zinc-500">
                          {tenant.createdAt?.toDate
                            ? tenant.createdAt.toDate().toLocaleDateString()
                            : "Recent"}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        {/* Always show actions on mobile (lg:opacity-0), hover on desktop */}
                        <div
                          className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/admin/tenants/${tenant.id}`}>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="h-8 w-8 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>

                          <ImpersonateButton
                            tenantId={tenant.id}
                            tenantName={tenant.name}
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 text-zinc-500 hover:text-sky-400 hover:bg-sky-500/10"
                          >
                            <UserCheck className="h-4 w-4" />
                          </ImpersonateButton>

                          <div className="relative">
                            <PopoverMenu tenantId={tenant.id} />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
