"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Building2,
  Phone,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  RefreshCw,
  Globe,
  MessageSquare,
  Volume2,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
}

interface OnboardingForm {
  // Step 1 — Business
  businessName: string;
  businessType: string;
  timezone: string;
  // Step 2 — Phone
  phoneNumber: string;
  areaCode: string;
  // Step 3 — Agent
  agentName: string;
  greeting: string;
  tone: "friendly" | "professional" | "casual";
  // Step 4 — Plan (just for display; actual checkout is separate)
  selectedPlan: "starter" | "growth" | "pro";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Business",  icon: Building2 },
  { id: 2, label: "Phone",     icon: Phone      },
  { id: 3, label: "Agent",     icon: Bot        },
  { id: 4, label: "Go live",   icon: Zap        },
];

const BUSINESS_TYPES = [
  "Dental / Medical Clinic",
  "Law Firm",
  "Real Estate Agency",
  "Salon & Spa",
  "Auto Repair",
  "Restaurant",
  "Gym / Fitness Studio",
  "Consulting",
  "Other",
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

const TONES = [
  {
    value: "friendly" as const,
    label: "Friendly",
    desc: "Warm & approachable",
    emoji: "😊",
    active: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  },
  {
    value: "professional" as const,
    label: "Professional",
    desc: "Formal & precise",
    emoji: "💼",
    active: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  },
  {
    value: "casual" as const,
    label: "Casual",
    desc: "Relaxed & easy-going",
    emoji: "✌️",
    active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
];

const PLANS = [
  {
    key: "starter" as const,
    label: "Starter",
    price: "$49",
    minutes: "100 min",
    agents: "1 agent",
    color: "border-zinc-700",
    badge: "bg-zinc-800 text-zinc-400",
  },
  {
    key: "growth" as const,
    label: "Growth",
    price: "$149",
    minutes: "500 min",
    agents: "3 agents",
    popular: true,
    color: "border-violet-500/40",
    badge: "bg-violet-600/20 text-violet-300",
  },
  {
    key: "pro" as const,
    label: "Pro",
    price: "$349",
    minutes: "2,000 min",
    agents: "Unlimited",
    color: "border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-400",
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Phone number search state
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [numbersError, setNumbersError] = useState<string | null>(null);

  const [form, setForm] = useState<OnboardingForm>({
    businessName: "",
    businessType: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    phoneNumber: "",
    areaCode: "",
    agentName: "",
    greeting: "",
    tone: "friendly",
    selectedPlan: "growth",
  });

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) { router.replace("/sign-in"); return; }
      setUser(u);
      // Pre-fill business name from tenant doc
      const unsubDoc = onSnapshot(doc(db, "tenants", u.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.onboardingComplete) {
            router.replace("/dashboard");
            return;
          }
          setForm((f) => ({
            ...f,
            businessName: data.name?.replace(/'s Workspace$/, "") || "",
          }));
        }
      });
      return () => unsubDoc();
    });
    return () => unsub();
  }, [router]);

  // Auto-generate a greeting when agent name or business name changes
  useEffect(() => {
    if (form.agentName && form.businessName) {
      setForm((f) => ({
        ...f,
        greeting: `Hello! You've reached ${f.businessName}. I'm ${f.agentName}, your AI receptionist. How can I help you today?`,
      }));
    }
  }, [form.agentName, form.businessName]);

  function set<K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Phone number search ─────────────────────────────────────────────────────
  async function fetchNumbers(ac?: string) {
    setLoadingNumbers(true);
    setNumbersError(null);
    try {
      const qs = ac ? `?areaCode=${ac}&limit=5` : "?limit=5";
      const res = await fetch(`/api/phone${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      setNumbers(data.numbers || []);
    } catch (err: any) {
      setNumbersError(err.message);
    } finally {
      setLoadingNumbers(false);
    }
  }

  useEffect(() => { fetchNumbers(); }, []);

  // ── Final submission ────────────────────────────────────────────────────────
  async function handleFinish() {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Update the tenant document with business profile.
      await updateDoc(doc(db, "tenants", user.uid), {
        name: form.businessName,
        businessType: form.businessType,
        timezone: form.timezone,
        onboardingComplete: true,
      });

      // 2. Create the Vapi agent + optionally provision the phone number.
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.agentName || `${form.businessName} Receptionist`,
          business: form.businessName,
          greeting: form.greeting,
          tone: form.tone,
          language: "English",
          faqs: [],
          phoneNumber: form.phoneNumber || null,
        }),
      });

      if (!agentRes.ok) {
        const { error } = await agentRes.json().catch(() => ({}));
        throw new Error(error || "Failed to create agent.");
      }

      // 3. If the user selected a paid plan, redirect to checkout.
      //    Starter is the free/default plan — no checkout needed.
      if (form.selectedPlan !== "starter") {
        const checkoutRes = await fetch("/api/billing/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: form.selectedPlan }),
        });
        if (checkoutRes.ok) {
          const { url } = await checkoutRes.json();
          if (url) { window.location.href = url; return; }
        }
        // If checkout fails, still proceed to dashboard (they can upgrade later).
      }

      router.push("/dashboard");
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Validation per step ─────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 1) return !!form.businessName.trim() && !!form.businessType;
    if (step === 2) return true; // phone is optional
    if (step === 3) return !!form.agentName.trim();
    return true;
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12 font-[family-name:var(--font-geist-sans)]">
      {/* Background grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }}
      />

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/50">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-[17px] font-semibold text-white tracking-tight">
            Receptionly
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8 space-y-3">
          <div className="h-0.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done = s.id < step;
              const active = s.id === step;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all",
                      done
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                        : active
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                        : "bg-zinc-900 border border-white/[0.06] text-zinc-600"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium hidden sm:block",
                      active ? "text-white" : done ? "text-emerald-400" : "text-zinc-600"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step card */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/80 backdrop-blur p-7 mb-5 shadow-2xl">
          {/* ── Step 1: Business ───────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-[22px] font-semibold text-white tracking-tight">
                  Tell us about your business
                </h1>
                <p className="text-[13px] text-zinc-500">
                  This helps your AI receptionist introduce itself correctly.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Business name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bright Dental"
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-400">
                  Business type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt}
                      onClick={() => set("businessType", bt)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-all",
                        form.businessType === bt
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                          : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
                      )}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Timezone
                </label>
                <select
                  value={form.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2.5 text-[13px] text-white outline-none focus:border-violet-500/50"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className="bg-zinc-900">
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Step 2: Phone ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-[22px] font-semibold text-white tracking-tight">
                  Get your business number
                </h1>
                <p className="text-[13px] text-zinc-500">
                  Callers will reach your AI at this number. You can skip and add one later.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={3}
                  placeholder="Area code (e.g. 415)"
                  value={form.areaCode}
                  onChange={(e) => set("areaCode", e.target.value.replace(/\D/g, ""))}
                  className="w-32 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[13px] text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 transition"
                />
                <button
                  onClick={() => fetchNumbers(form.areaCode || undefined)}
                  disabled={loadingNumbers}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition disabled:opacity-50"
                >
                  {loadingNumbers
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                  Search
                </button>
              </div>

              {numbersError && (
                <p className="text-[12px] text-red-400 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  {numbersError}
                </p>
              )}

              <div className="space-y-2">
                {loadingNumbers ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-zinc-500 text-[13px]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finding numbers…
                  </div>
                ) : numbers.length === 0 ? (
                  <p className="text-center py-4 text-zinc-600 text-[12px]">
                    No numbers found. Try a different area code.
                  </p>
                ) : (
                  numbers.map((num) => (
                    <button
                      key={num.phoneNumber}
                      onClick={() => set("phoneNumber", num.phoneNumber)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                        form.phoneNumber === num.phoneNumber
                          ? "border-violet-500/40 bg-violet-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Phone className={cn("h-4 w-4 shrink-0", form.phoneNumber === num.phoneNumber ? "text-violet-400" : "text-zinc-600")} />
                        <div>
                          <p className={cn("text-[14px] font-semibold font-mono", form.phoneNumber === num.phoneNumber ? "text-white" : "text-zinc-300")}>
                            {num.friendlyName || num.phoneNumber}
                          </p>
                          <p className="text-[11px] text-zinc-600">
                            {[num.locality, num.region].filter(Boolean).join(", ") || "US Local"}
                          </p>
                        </div>
                      </div>
                      {form.phoneNumber === num.phoneNumber && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => set("phoneNumber", "")}
                className="text-[12px] text-zinc-600 hover:text-zinc-400 transition underline underline-offset-2"
              >
                Skip — I'll assign a number later
              </button>
            </div>
          )}

          {/* ── Step 3: Agent ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-[22px] font-semibold text-white tracking-tight">
                  Build your AI receptionist
                </h1>
                <p className="text-[13px] text-zinc-500">
                  Give your agent a name and personality. Callers will hear this.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  Agent name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lisa, Alex, Jordan"
                  value={form.agentName}
                  onChange={(e) => set("agentName", e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" />
                  Tone & personality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => set("tone", t.value)}
                      className={cn(
                        "relative rounded-xl border p-3 text-left transition-all",
                        form.tone === t.value
                          ? t.active
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                      )}
                    >
                      {form.tone === t.value && (
                        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                      <div className="text-lg mb-1">{t.emoji}</div>
                      <p className="text-[12px] font-semibold text-white">{t.label}</p>
                      <p className={cn("text-[10px] mt-0.5", form.tone === t.value ? "opacity-70" : "text-zinc-600")}>
                        {t.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Greeting
                </label>
                <textarea
                  rows={3}
                  value={form.greeting}
                  onChange={(e) => set("greeting", e.target.value)}
                  placeholder={`Hello! You've reached ${form.businessName || "your business"}. I'm ${form.agentName || "your receptionist"}. How can I help?`}
                  className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[13px] text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                />
                <p className="text-[11px] text-zinc-600 italic">
                  Auto-generated from your business name — edit freely.
                </p>
              </div>

              {form.agentName && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-semibold text-lg shadow-lg">
                    {form.agentName[0]}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{form.agentName}</p>
                    <p className="text-[12px] text-zinc-500 capitalize">{form.tone} · AI Receptionist</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Plan ──────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-[22px] font-semibold text-white tracking-tight">
                  Choose your plan
                </h1>
                <p className="text-[13px] text-zinc-500">
                  Start free on Starter, or unlock more minutes and agents right away.
                </p>
              </div>

              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    onClick={() => set("selectedPlan", plan.key)}
                    className={cn(
                      "relative flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all",
                      form.selectedPlan === plan.key
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                    )}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 right-4 rounded-full border border-violet-500/30 bg-violet-600/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-400">
                        POPULAR
                      </span>
                    )}
                    <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", form.selectedPlan === plan.key ? "border-violet-500 bg-violet-600" : "border-zinc-600")}>
                      {form.selectedPlan === plan.key && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[14px] font-semibold text-white">{plan.label}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", plan.badge)}>
                          {plan.minutes}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-500">{plan.agents} · {plan.minutes}/mo included</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[18px] font-bold text-white">{plan.price}</p>
                      <p className="text-[11px] text-zinc-600">/month</p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-zinc-600 text-center">
                {form.selectedPlan === "starter"
                  ? "No credit card needed — go live for free."
                  : "You'll be redirected to checkout after setup."}
              </p>

              {submitError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <p className="text-[12px] text-red-400">{submitError}</p>
                </div>
              )}

              {isSubmitting && (
                <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-3">
                  <Loader2 className="h-4 w-4 text-violet-400 animate-spin shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-violet-300">Setting up your workspace…</p>
                    <p className="text-[11px] text-violet-400/70 mt-0.5">Creating your agent and provisioning your number</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isSubmitting}
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-4 py-2.5 text-[13px] font-medium text-zinc-400 transition-all hover:border-white/[0.1] hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {form.selectedPlan === "starter" ? "Launch my receptionist" : "Go to checkout →"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}