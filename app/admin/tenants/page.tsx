import { Users } from "lucide-react";

export default function AdminTenantsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tenants</h1>
          <p className="text-sm text-zinc-500">
            Manage all registered business accounts and subscriptions.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <Users className="h-10 w-10 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-400">
            Tenant Directory
          </h3>
          <p className="text-sm text-zinc-600 mt-1">
            Loading registered organizations...
          </p>
        </div>
      </div>
    </div>
  );
}
