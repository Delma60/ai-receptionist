"use client";

import React, { useState } from "react";
import { Settings2, Users, Power, Info, Search } from "lucide-react";

// Mock data based on the Admin Data Model in README.md
const MOCK_FLAGS = [
  {
    id: "voice-v2",
    name: "Next-Gen Voice Engine",
    description: "Enables the higher-fidelity Vapi models for testing.",
    enabled: true,
    enabledForTenants: ["tenant_123", "tenant_456"],
    updatedAt: "2024-05-20T10:00:00Z",
    updatedBy: "admin_sarah",
  },
  {
    id: "maintenance-mode",
    name: "Global Maintenance",
    description: "Disables all tenant dashboards for scheduled maintenance.",
    enabled: false,
    enabledForTenants: [],
    updatedAt: "2024-05-15T14:30:00Z",
    updatedBy: "admin_mike",
  },
];

export default function FeatureFlagsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-500 mt-1">
            Manage platform-wide toggles and tenant-specific overrides.
          </p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
          <Settings2 size={18} />
          Create New Flag
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search flags..."
            className="bg-transparent border-none focus:ring-0 text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-6 py-4">Feature</th>
              <th className="px-6 py-4 text-center">Global Status</th>
              <th className="px-6 py-4">Targeting</th>
              <th className="px-6 py-4">Audit Info</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {MOCK_FLAGS.map((flag) => (
              <tr key={flag.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{flag.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Info size={14} />
                    {flag.description}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${flag.enabled ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${flag.enabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 text-sm">
                  {flag.enabledForTenants.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                      <Users size={16} />
                      {flag.enabledForTenants.length} Tenants Overridden
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">None</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  <div>By {flag.updatedBy}</div>
                  <div>{new Date(flag.updatedAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold">
                    Edit Overrides
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex items-center gap-2">
          <Power size={12} />
          Changes take effect instantly. Use with caution during peak hours.
        </div>
      </div>
    </div>
  );
}
