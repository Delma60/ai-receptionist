import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Global Settings</h1>
        <p className="text-sm text-zinc-500">Configure platform-wide defaults and system parameters.</p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-6">
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Settings className="h-10 w-10 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-400">Platform Config</h3>
          <p className="text-sm text-zinc-600 mt-1">Settings panel initializing...</p>
        </div>
      </div>
    </div>
  );
}