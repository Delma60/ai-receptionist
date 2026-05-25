"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Phone,
  Globe,
  MessageSquare,
  Sparkles,
  User,
  Volume2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface AgentForm {
  name: string;
  business: string;
  greeting: string;
  tone: "friendly" | "professional" | "casual";
  language: string;
  faqs: FAQ[];
  phoneNumber: string;
  // Fix 7: store locality/region alongside the number
  phoneLocality?: string;
  phoneRegion?: string;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
}

// ── Steps config ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Identity", description: "Name & personality" },
  { id: 2, label: "Knowledge", description: "FAQs & info" },
  { id: 3, label: "Phone", description: "Assign a number" },
  { id: 4, label: "Review", description: "Go live" },
];

// ── Tone options ────────────────────────────────────────────────────────────────
const TONES = [
  {
    value: "friendly",
    label: "Friendly",
    desc: "Warm, approachable, conversational",
    emoji: "😊",
    color: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    check: "bg-sky-500",
  },
  {
    value: "professional",
    label: "Professional",
    desc: "Formal, precise, business-focused",
    emoji: "💼",
    color: "border-violet-500/40 bg-violet-500/10 text-violet-300",
    check: "bg-violet-500",
  },
  {
    value: "casual",
    label: "Casual",
    desc: "Relaxed, fun, easy-going",
    emoji: "✌️",
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    check: "bg-emerald-500",
  },
] as const;

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Mandarin",
  "English / Spanish",
  "English / French",
];

// ── Step: Identity ──────────────────────────────────────────────────────────────
function StepIdentity({
  form,
  onChange,
}: {
  form: AgentForm;
  onChange: (k: keyof AgentForm, v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Give your agent an identity
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          This is how your agent introduces itself to callers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-zinc-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-zinc-500" />
            Agent name
          </label>
          <input
            type="text"
            placeholder="e.g. Lisa, Alex, Jordan"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-500/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-zinc-300 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-zinc-500" />
            Business name
          </label>
          <input
            type="text"
            placeholder="e.g. Bright Dental"
            value={form.business}
            onChange={(e) => onChange("business", e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-500/20"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-zinc-300 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
          Greeting message
        </label>
        <textarea
          rows={3}
          placeholder={`e.g. "Hello! You've reached ${form.business || "Bright Dental"}. I'm ${form.name || "Lisa"}, your AI receptionist. How can I help you today?"`}
          value={form.greeting}
          onChange={(e) => onChange("greeting", e.target.value)}
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-500/20"
        />
        <p className="text-[11px] text-zinc-600">
          This is the first thing callers hear when they call.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-zinc-300 flex items-center gap-1.5">
          <Volume2 className="h-3.5 w-3.5 text-zinc-500" />
          Tone & personality
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TONES.map((tone) => (
            <button
              key={tone.value}
              onClick={() => onChange("tone", tone.value)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-all",
                form.tone === tone.value
                  ? tone.color
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]",
              )}
            >
              {form.tone === tone.value && (
                <span
                  className={cn(
                    "absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full",
                    tone.check,
                  )}
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </span>
              )}
              <div className="text-xl mb-2">{tone.emoji}</div>
              <p
                className={cn(
                  "text-[13px] font-semibold",
                  form.tone === tone.value ? "" : "text-zinc-300",
                )}
              >
                {tone.label}
              </p>
              <p
                className={cn(
                  "text-[11px] mt-0.5",
                  form.tone === tone.value ? "opacity-80" : "text-zinc-600",
                )}
              >
                {tone.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-zinc-300 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-zinc-500" />
          Language
        </label>
        <select
          value={form.language}
          onChange={(e) => onChange("language", e.target.value)}
          className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2.5 text-[14px] text-white outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang} className="bg-zinc-900">
              {lang}
            </option>
          ))}
        </select>
      </div>

      {(form.name || form.business) && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600 mb-3">
            Preview
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-semibold">
              {form.name?.[0] ?? "?"}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white">
                {form.name || "Your agent"}
                {form.business ? ` · ${form.business}` : ""}
              </p>
              <p className={cn("text-[12px] capitalize", toneColor(form.tone))}>
                {form.tone} · {form.language}
              </p>
            </div>
          </div>
          {form.greeting && (
            <div className="mt-3 rounded-lg bg-white/[0.04] px-3 py-2.5">
              <p className="text-[12px] text-zinc-400 italic">
                "{form.greeting}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function toneColor(tone: string) {
  if (tone === "friendly") return "text-sky-400";
  if (tone === "professional") return "text-violet-400";
  return "text-emerald-400";
}

// ── Step: Knowledge ─────────────────────────────────────────────────────────────
function StepKnowledge({
  form,
  onAddFAQ,
  onUpdateFAQ,
  onDeleteFAQ,
}: {
  form: AgentForm;
  onAddFAQ: () => void;
  onUpdateFAQ: (
    id: string,
    field: "question" | "answer",
    value: string,
  ) => void;
  onDeleteFAQ: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Train your agent</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Add frequently asked questions so your agent can answer callers
          accurately.
        </p>
      </div>

      <div className="space-y-3">
        {(form.faqs || []).map((faq, i) => (
          <div
            key={faq.id}
            className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                Q&A #{i + 1}
              </span>
              <button
                onClick={() => onDeleteFAQ(faq.id)}
                className="rounded-md p-1 text-zinc-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Question (e.g. What are your opening hours?)"
              value={faq.question}
              onChange={(e) => onUpdateFAQ(faq.id, "question", e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            />
            <textarea
              rows={2}
              placeholder="Answer (e.g. We're open Mon–Fri 9am–6pm, Sat 10am–4pm.)"
              value={faq.answer}
              onChange={(e) => onUpdateFAQ(faq.id, "answer", e.target.value)}
              className="w-full resize-none rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            />
          </div>
        ))}

        <button
          onClick={onAddFAQ}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] py-3.5 text-[13px] font-medium text-zinc-500 transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-400"
        >
          <Plus className="h-4 w-4" />
          Add FAQ
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-zinc-300">
              Tips for great FAQs
            </p>
            <ul className="mt-1.5 space-y-1 text-[12px] text-zinc-500">
              <li>• Include hours, location, services, and pricing</li>
              <li>• Add common objections and how to handle them</li>
              <li>• Keep answers concise — under 3 sentences</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step: Phone ─────────────────────────────────────────────────────────────────
// Fix 7: When user selects a number, store the full AvailableNumber object
// so locality/region are preserved and passed to the API.
function StepPhone({
  form,
  onSelectNumber,
  onManualEntry,
}: {
  form: AgentForm;
  onSelectNumber: (num: AvailableNumber) => void;
  onManualEntry: (phoneNumber: string) => void;
}) {
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [numbersError, setNumbersError] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState("");
  const [manualInput, setManualInput] = useState("");

  const fetchNumbers = async (ac?: string) => {
    setLoadingNumbers(true);
    setNumbersError(null);
    try {
      const qs = ac ? `?areaCode=${ac}&limit=5` : "?limit=5";
      const res = await fetch(`/api/phone${qs}`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setNumbers(data.numbers || []);
    } catch (err: any) {
      setNumbersError(err.message || "Failed to load numbers");
      setNumbers([]);
    } finally {
      setLoadingNumbers(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  // Is the current selection from the list?
  const selectedFromList = numbers.find(
    (n) => n.phoneNumber === form.phoneNumber,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Assign a phone number
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose an available number. Callers will reach your agent at this
          number.
        </p>
      </div>

      {/* Area code filter */}
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={3}
          placeholder="Area code (e.g. 415)"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ""))}
          className="w-36 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder-zinc-600 outline-none focus:border-violet-500/50"
        />
        <button
          onClick={() => fetchNumbers(areaCode || undefined)}
          disabled={loadingNumbers}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition disabled:opacity-50"
        >
          {loadingNumbers ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {loadingNumbers ? "Loading…" : "Search"}
        </button>
      </div>

      {numbersError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-400">
          {numbersError} — you can still enter a number below or skip for now.
        </div>
      )}

      {loadingNumbers ? (
        <div className="flex items-center justify-center gap-2 py-8 text-zinc-500 text-[13px]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding available numbers…
        </div>
      ) : (
        <div className="space-y-2">
          {numbers.length === 0 && !numbersError && (
            <p className="text-center py-6 text-zinc-600 text-[13px]">
              No numbers found. Try a different area code.
            </p>
          )}
          {numbers.map((num) => (
            <button
              key={num.phoneNumber}
              onClick={() => onSelectNumber(num)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all",
                form.phoneNumber === num.phoneNumber
                  ? "border-violet-500/40 bg-violet-500/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]",
              )}
            >
              <div className="flex items-center gap-3">
                <Phone
                  className={cn(
                    "h-4 w-4 shrink-0",
                    form.phoneNumber === num.phoneNumber
                      ? "text-violet-400"
                      : "text-zinc-600",
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "text-[14px] font-semibold font-mono",
                      form.phoneNumber === num.phoneNumber
                        ? "text-white"
                        : "text-zinc-300",
                    )}
                  >
                    {num.friendlyName || num.phoneNumber}
                  </p>
                  {/* Fix 7: display real locality/region from Twilio */}
                  <p className="text-[11px] text-zinc-600">
                    {[num.locality, num.region].filter(Boolean).join(", ") ||
                      "US Local Number"}
                  </p>
                </div>
              </div>
              {form.phoneNumber === num.phoneNumber && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-zinc-950 px-3 text-zinc-600 tracking-widest">
            or enter manually
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-zinc-300">
          Port your existing number
        </label>
        <input
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={selectedFromList ? "" : manualInput}
          onChange={(e) => {
            setManualInput(e.target.value);
            onManualEntry(e.target.value);
          }}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[14px] font-mono text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-500/20"
        />
        <p className="text-[11px] text-zinc-600">
          Number porting takes 1–3 business days.
        </p>
      </div>

      <button
        onClick={() => {
          onManualEntry("");
          setManualInput("");
        }}
        className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
      >
        Skip for now — assign a number later
      </button>
    </div>
  );
}

// ── Step: Review ────────────────────────────────────────────────────────────────
function StepReview({
  form,
  isLaunching,
  launchError,
}: {
  form: AgentForm;
  isLaunching: boolean;
  launchError: string | null;
}) {
  const checks = [
    { label: "Agent name set", ok: !!form.name },
    { label: "Business name set", ok: !!form.business },
    { label: "Greeting written", ok: !!form.greeting },
    { label: "Tone selected", ok: !!form.tone },
    { label: "FAQs added", ok: form.faqs.some((f) => f.question && f.answer) },
    { label: "Phone number assigned", ok: !!form.phoneNumber },
  ];
  const readyCount = checks.filter((c) => c.ok).length;
  const allGood = readyCount === checks.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Review & launch</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Check everything looks right before going live.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-semibold text-lg shadow-lg shadow-violet-900/40">
            {form.name?.[0] ?? <Bot className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white">
              {form.name || "Unnamed agent"}
            </p>
            <p className="text-[12px] text-zinc-500">
              {form.business || "No business set"}
            </p>
          </div>
        </div>
        <div className="space-y-2.5 text-[13px]">
          {[
            { label: "Tone", value: form.tone, color: toneColor(form.tone) },
            { label: "Language", value: form.language },
            {
              label: "Phone",
              value: form.phoneNumber
                ? [
                    form.phoneNumber,
                    [form.phoneLocality, form.phoneRegion]
                      .filter(Boolean)
                      .join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Not assigned",
            },
            {
              label: "FAQs",
              value: `${form.faqs.filter((f) => f.question).length} questions`,
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-zinc-600">{label}</span>
              <span
                className={cn(
                  "font-medium capitalize",
                  (color as string) ?? "text-zinc-300",
                )}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        {form.greeting && (
          <div className="mt-4 rounded-lg bg-white/[0.04] border border-white/[0.04] px-3 py-2.5">
            <p className="text-[11px] text-zinc-600 mb-1">Greeting</p>
            <p className="text-[12px] text-zinc-400 italic">
              "{form.greeting}"
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-medium text-zinc-300">
            Setup checklist
          </p>
          <span className="text-[12px] text-zinc-500">
            {readyCount}/{checks.length} complete
          </span>
        </div>
        <div className="space-y-2">
          {checks.map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                  ok
                    ? "bg-emerald-500"
                    : "border border-white/[0.1] bg-white/[0.04]",
                )}
              >
                {ok && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span
                className={cn(
                  "text-[12px]",
                  ok ? "text-zinc-300" : "text-zinc-600",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!allGood && !launchError && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-[12px] text-amber-400">
            Some fields are incomplete. You can still launch and update later.
          </p>
        </div>
      )}

      {launchError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-[12px] font-medium text-red-400">
            Launch failed: {launchError}
          </p>
          <p className="text-[11px] text-red-400/70 mt-1">
            Check your Vapi API key and try again.
          </p>
        </div>
      )}

      {isLaunching && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-3">
          <Loader2 className="h-4 w-4 text-violet-400 animate-spin shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-violet-300">
              Launching your agent…
            </p>
            <p className="text-[11px] text-violet-400/70 mt-0.5">
              Creating Vapi assistant and saving configuration
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Wizard ─────────────────────────────────────────────────────────────────
export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const [form, setForm] = useState<AgentForm>({
    name: "",
    business: "",
    greeting: "",
    tone: "friendly",
    language: "English",
    faqs: [{ id: "1", question: "", answer: "" }],
    phoneNumber: "",
    phoneLocality: undefined,
    phoneRegion: undefined,
  });

  function handleChange(key: keyof AgentForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Fix 7: capture full number object (with locality/region) on selection
  function handleSelectNumber(num: AvailableNumber) {
    setForm((prev) => ({
      ...prev,
      phoneNumber: num.phoneNumber,
      phoneLocality: num.locality ?? undefined,
      phoneRegion: num.region ?? undefined,
    }));
  }

  // Manual entry clears locality/region
  function handleManualEntry(phoneNumber: string) {
    setForm((prev) => ({
      ...prev,
      phoneNumber,
      phoneLocality: undefined,
      phoneRegion: undefined,
    }));
  }

  function addFAQ() {
    setForm((prev) => ({
      ...prev,
      faqs: [
        ...prev.faqs,
        { id: Date.now().toString(), question: "", answer: "" },
      ],
    }));
  }

  function updateFAQ(id: string, field: "question" | "answer", value: string) {
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    }));
  }

  function deleteFAQ(id: string) {
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((f) => f.id !== id),
    }));
  }

  async function handleLaunch() {
    setIsLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // Fix 7: include locality/region in payload so the API can persist them
        body: JSON.stringify({
          name: form.name,
          business: form.business,
          greeting: form.greeting,
          tone: form.tone,
          language: form.language,
          faqs: form.faqs,
          phoneNumber: form.phoneNumber,
          phoneLocality: form.phoneLocality,
          phoneRegion: form.phoneRegion,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }
      const { agentId } = await res.json();
      router.push(`/agents/${agentId}`);
    } catch (err: any) {
      setLaunchError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLaunching(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <a
          href="/agents"
          className="flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to agents
        </a>
      </div>

      {/* Step progress */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "flex flex-col items-center gap-1 text-center",
                  s.id < step ? "cursor-pointer" : "cursor-default",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-semibold transition-all",
                    step === s.id
                      ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                      : s.id < step
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                        : "border-white/[0.08] bg-white/[0.04] text-zinc-600",
                  )}
                >
                  {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <div className="hidden sm:block">
                  <p
                    className={cn(
                      "text-[11px] font-medium",
                      step === s.id
                        ? "text-white"
                        : s.id < step
                          ? "text-emerald-400"
                          : "text-zinc-600",
                    )}
                  >
                    {s.label}
                  </p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-2 transition-all",
                    s.id < step ? "bg-emerald-500/30" : "bg-white/[0.06]",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-6 mb-6">
        {step === 1 && <StepIdentity form={form} onChange={handleChange} />}
        {step === 2 && (
          <StepKnowledge
            form={form}
            onAddFAQ={addFAQ}
            onUpdateFAQ={updateFAQ}
            onDeleteFAQ={deleteFAQ}
          />
        )}
        {step === 3 && (
          <StepPhone
            form={form}
            onSelectNumber={handleSelectNumber}
            onManualEntry={handleManualEntry}
          />
        )}
        {step === 4 && (
          <StepReview
            form={form}
            isLaunching={isLaunching}
            launchError={launchError}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || isLaunching}
          className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-4 py-2 text-[13px] font-medium text-zinc-400 transition-all hover:border-white/[0.1] hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={isLaunching}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Launching…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Launch agent
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
