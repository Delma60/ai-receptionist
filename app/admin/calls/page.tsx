import { PhoneCall } from "lucide-react";

export default function AdminCallsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Platform Calls</h1>
          <p className="text-sm text-zinc-500">
            Monitor all calls occurring across the entire platform.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <PhoneCall className="h-10 w-10 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-400">Live Call Feed</h3>
          <p className="text-sm text-zinc-600 mt-1">
            Connecting to global call stream...
          </p>
        </div>
      </div>
    </div>
  );
}
