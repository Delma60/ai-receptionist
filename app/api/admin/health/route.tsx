// app/api/admin/health/route.ts
//
// GET /api/admin/health
//
// Pings each third-party service and returns a structured response that the
// settings/page.tsx and flags/page.tsx health-check UIs can map directly
// to their ServiceHealth cards.
//
// Previously returned bare booleans ({ vapi: true, twilio: false }) which
// caused the UI mapping to silently fail — update.status was always undefined
// because the update value was a boolean, not an object.
//
// Now returns per-service objects: { status, latency, uptime }

import { NextResponse } from "next/server";

interface ServiceResult {
  status: "operational" | "degraded" | "down";
  latency: string;       // e.g. "142ms"
  uptime: string;        // e.g. "99.98%" — static placeholder; extend later
  lastChecked: string;
}

async function pingVapi(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.vapi.ai/me", {
      headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return {
        status: latencyMs < 1000 ? "operational" : "degraded",
        latency: `${latencyMs}ms`,
        uptime: "99.98%",
        lastChecked: "Just now",
      };
    }

    return {
      status: res.status >= 500 ? "down" : "degraded",
      latency: `${latencyMs}ms`,
      uptime: "—",
      lastChecked: "Just now",
    };
  } catch {
    return {
      status: "down",
      latency: "—",
      uptime: "—",
      lastChecked: "Just now",
    };
  }
}

async function pingTwilio(): Promise<ServiceResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { status: "down", latency: "—", uptime: "—", lastChecked: "Just now" };
  }

  const start = Date.now();
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return {
        status: latencyMs < 1000 ? "operational" : "degraded",
        latency: `${latencyMs}ms`,
        uptime: "100%",
        lastChecked: "Just now",
      };
    }

    return {
      status: res.status >= 500 ? "down" : "degraded",
      latency: `${latencyMs}ms`,
      uptime: "—",
      lastChecked: "Just now",
    };
  } catch {
    return {
      status: "down",
      latency: "—",
      uptime: "—",
      lastChecked: "Just now",
    };
  }
}

export async function GET() {
  // Run pings in parallel
  const [vapi, twilio] = await Promise.all([pingVapi(), pingTwilio()]);

  return NextResponse.json({
    // Structured per-service objects (used by settings/page.tsx + flags/page.tsx mappers)
    vapi,
    twilio,

    // Top-level booleans kept for backward compat with admin/page.tsx StatCard
    vapiOk: vapi.status !== "down",
    twilioOk: twilio.status !== "down",

    timestamp: new Date().toISOString(),
  });
}