// ─────────────────────────────────────────────
// Receptionly — Shared TypeScript Types
// ─────────────────────────────────────────────

import { Timestamp } from "firebase/firestore";

// ── Plans ────────────────────────────────────
export type Plan = "starter" | "growth" | "pro";

// ── Tenant ───────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  phoneNumber: string;         // Twilio number
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  minutesUsed: number;
  createdAt: Timestamp;
}

// ── Agent ────────────────────────────────────
export type AgentTone = "friendly" | "professional" | "casual";

export interface FAQ {
  question: string;
  answer: string;
}

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  greeting: string;
  tone: AgentTone;
  language: string;            // default "en"
  faqs: FAQ[];
  calendarUrl?: string;
  vapiAgentId?: string;        // synced Vapi agent ID
  isActive: boolean;
  createdAt: Timestamp;
}

// ── Call ─────────────────────────────────────
export type CallOutcome = "booked" | "transferred" | "message" | "unanswered";

export interface Call {
  id: string;
  tenantId: string;
  agentId: string;
  callerNumber: string;
  duration: number;            // seconds
  outcome: CallOutcome;
  summary: string;
  transcript: string;
  recordingUrl?: string;
  createdAt: Timestamp;
}

// ── Integration ──────────────────────────────
export type IntegrationService =
  | "google_calendar"
  | "hubspot"
  | "gohighlevel"
  | "calendly";

export interface IntegrationUser extends Integration {
  id: string;
  tenantId: string;
  service: IntegrationService;
  accessToken: string;
  refreshToken: string;
  connectedAt: Timestamp;
}

// ── Vapi Webhook ─────────────────────────────
export type VapiEventType =
  | "call-started"
  | "call-ended"
  | "transcript"
  | "function-call"
  | "hang"
  | "speech-update"
  | "status-update";

export interface VapiWebhookPayload {
  message: {
    type: VapiEventType;
    call?: {
      id: string;
      orgId: string;
      createdAt: string;
      updatedAt: string;
      type: string;
      status: string;
      phoneNumberId?: string;
      assistantId?: string;
      customer?: { number: string };
      endedReason?: string;
      transcript?: string;
      summary?: string;
      recordingUrl?: string;
      stereoRecordingUrl?: string;
      durationSeconds?: number;
    };
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
      stereoRecordingUrl?: string;
    };
    timestamp?: string;
  };
}

// ── Stripe ───────────────────────────────────
export interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// ── Plan limits ──────────────────────────────
export const PLAN_LIMITS: Record<
  Plan,
  { minutes: number; agents: number; numbers: number; price: number }
> = {
  starter: { minutes: 100, agents: 1, numbers: 1, price: 49 },
  growth:  { minutes: 500, agents: 3, numbers: 3, price: 149 },
  pro:     { minutes: 2000, agents: Infinity, numbers: 10, price: 349 },
};

export const OVERAGE_RATE_PER_MIN = 0.08;


export type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing";
export type IntegrationCategory = "calendar" | "crm" | "sms" | "phone" | "analytics" | "webhook" | "communication" | "marketing" | "storage" | "support" | "custom";
export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  iconName?: string;
  iconColor?: string;
  iconBg?: string;
  connectedAccount?: string;
  lastSync?: string;
  features?: string[];
  popular?: boolean;
  comingSoon?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  published?: boolean;
}
