"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ShieldAlert,
  UserCircle,
  Activity,
  Loader2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
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

interface AuditLog {
  id: string;
  adminId: string;
  action:
    | "impersonate"
    | "plan_change"
    | "tenant_delete"
    | "feature_flag"
    | string;
  targetTenantId: string;
  metadata: Record<string, any>;
  createdAt: any;
}

const actionStyles: Record<string, string> = {
  impersonate: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  plan_change: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  tenant_delete: "bg-red-500/10 text-red-400 border-red-500/20",
  feature_flag: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const actionLabels: Record<string, string> = {
  impersonate: "Impersonation",
  plan_change: "Plan Updated",
  tenant_delete: "Tenant Deleted",
  feature_flag: "Feature Toggled",
};

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // 1. Fetch tenants to map targetTenantId to human-readable business names
    const tenantsUnsub = onSnapshot(
      collection(db, "tenants"),
      (snap) => {
        const mapping: Record<string, string> = {};
        snap.docs.forEach((d) => {
          mapping[d.id] = d.data().name || "Unknown Business";
        });
        setTenants(mapping);
      },
      (err) => console.error("Error fetching tenants:", err)
    );

    // 2. Listen to the auditLog collection
    const q = query(
      collection(db, "auditLog"),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];

      setLogs(data);
      setLoading(false);
    });

    return () => {
      tenantsUnsub();
      unsub();
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const tenantName = tenants[log.targetTenantId]?.toLowerCase() || "";
    const action = log.action.toLowerCase();
    const admin = log.adminId.toLowerCase();
    const term = search.toLowerCase();

    return (
      tenantName.includes(term) || action.includes(term) || admin.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-emerald-500" />
            Audit & Activity Log
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Immutable ledger of all administrative overrides, impersonations,
            and critical system events.
          </p>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by admin ID, action, or tenant name..."
            className="h-10 border-white/[0.06] bg-zinc-900/40 pl-10 text-sm focus:ring-emerald-500/20"
          />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden backdrop-blur-md">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
              <p className="text-sm text-zinc-500">
                Retrieving security logs...
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <History className="h-10 w-10 text-zinc-800 mb-4" />
              <h3 className="text-lg font-medium text-zinc-500">
                No activity logs found
              </h3>
              <p className="text-sm text-zinc-600 mt-1">
                Platform administrative actions will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-medium w-[200px]">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Admin User
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Action
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Target Tenant
                  </TableHead>
                  <TableHead className="text-right text-zinc-500 font-medium pr-6">
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-white/[0.06] hover:bg-white/[0.02] group"
                  >
                    <TableCell className="font-mono text-xs text-zinc-400">
                      <div className="flex flex-col">
                        <span>
                          {log.createdAt?.toDate
                            ? log.createdAt.toDate().toLocaleDateString()
                            : "Recent"}
                        </span>
                        <span className="text-zinc-600">
                          {log.createdAt?.toDate
                            ? log.createdAt.toDate().toLocaleTimeString()
                            : ""}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-zinc-500" />
                        <span
                          className="text-sm font-medium text-zinc-300 truncate max-w-[150px]"
                          title={log.adminId}
                        >
                          {log.adminId}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] uppercase font-bold",
                          actionStyles[log.action] ||
                            "bg-zinc-800 text-zinc-400 border-zinc-700",
                        )}
                      >
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-medium text-zinc-300">
                      {tenants[log.targetTenantId] ? (
                        tenants[log.targetTenantId]
                      ) : (
                        <span
                          className="text-zinc-500 font-mono text-xs"
                          title={log.targetTenantId}
                        >
                          {log.targetTenantId.slice(0, 10)}...
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end">
                        {/* Display a snippet of metadata if available */}
                        {log.metadata ? (
                          <span className="text-xs text-zinc-500 font-mono bg-black/20 px-2 py-1 rounded">
                            {JSON.stringify(log.metadata).length > 30
                              ? JSON.stringify(log.metadata).slice(0, 30) +
                                "..."
                              : JSON.stringify(log.metadata)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
