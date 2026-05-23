import { LayoutDashboard } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Platform-wide overview and performance metrics.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Scaffolding for metrics/charts */}
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] py-20 flex flex-col items-center justify-center text-center">
          <LayoutDashboard className="h-10 w-10 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-400">
            Overview Metrics
          </h3>
          <p className="text-sm text-zinc-600 mt-1 max-w-xs">
            Aggregating platform data for tenants, calls, and usage minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
