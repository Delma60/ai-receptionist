"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  collectionGroup,
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
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Invoice {
  id: string;
  tenantId: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "void";
  invoiceNumber: string;
  createdAt: any;
}

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  void: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // 1. Fetch tenants purely to map IDs to business names in the table
    const tenantsUnsub = onSnapshot(
      collection(db, "tenants"),
      (snap) => {
        const mapping: Record<string, string> = {};
        snap.docs.forEach((d) => {
          mapping[d.id] = d.data().name || "Unknown Business";
        });
        setTenants(mapping);
      },
      (err) => console.error("Error fetching tenants:", err),
    );

    // 2. Listen to all invoices platform-wide
    const q = query(
      collectionGroup(db, "invoices"),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const tenantId = doc.ref.parent.parent?.id || "unknown";
        return {
          id: doc.id,
          tenantId,
          ...doc.data(),
        } as Invoice;
      });
      setInvoices(data);
      setLoading(false);
    });

    return () => {
      tenantsUnsub();
      unsub();
    };
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const name = tenants[inv.tenantId]?.toLowerCase() || "";
    const num = inv.invoiceNumber?.toLowerCase() || "";
    return (
      name.includes(search.toLowerCase()) || num.includes(search.toLowerCase())
    );
  });

  const failedPaymentsCount = invoices.filter(
    (i) => i.status === "failed",
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Billing Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Oversee platform transactions, invoices, and failed payments.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white"
        >
          <Download className="mr-2 h-4 w-4" /> Export Ledger
        </Button>
      </div>

      {/* ── Billing Stats Alerts ── */}
      {failedPaymentsCount > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">
                Action Required
              </p>
              <p className="text-xs text-red-400/80 mt-0.5">
                There are {failedPaymentsCount} failed invoice payments that
                require attention.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-red-500/20 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            Review Failures
          </Button>
        </div>
      )}

      {/* ── Transaction Table ── */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name or invoice number..."
            className="h-10 border-white/[0.06] bg-zinc-900/40 pl-10 text-sm focus:ring-emerald-500/20"
          />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden backdrop-blur-md">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
              <p className="text-sm text-zinc-500">
                Querying transaction records...
              </p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Receipt className="h-10 w-10 text-zinc-800 mb-4" />
              <h3 className="text-lg font-medium text-zinc-500">
                No transactions found
              </h3>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-medium">
                    Invoice
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Tenant
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Status
                  </TableHead>
                  <TableHead className="text-zinc-500 font-medium">
                    Amount
                  </TableHead>
                  <TableHead className="text-right text-zinc-500 font-medium pr-6">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="border-white/[0.06] hover:bg-white/[0.02] group"
                  >
                    <TableCell className="font-mono text-xs text-zinc-200">
                      #{inv.invoiceNumber || inv.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/tenants/${inv.tenantId}`}
                        className="flex items-center gap-1.5 font-medium text-zinc-300 hover:text-emerald-400 transition-colors"
                      >
                        {tenants[inv.tenantId] || "Loading..."}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] uppercase font-bold",
                          statusStyles[inv.status || "paid"],
                        )}
                      >
                        {inv.status || "paid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-200">
                      ${inv.amount?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-zinc-500 pr-6">
                      {inv.createdAt?.toDate
                        ? inv.createdAt.toDate().toLocaleDateString()
                        : "Recent"}
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
