// app/api/webhooks/vapi/route.ts
// Handles all Vapi webhook events:
//   - call-started  → creates a call document with pending status
//   - call-ended    → enriches the call with transcript, summary, outcome, duration
//                     and updates tenant usage metrics

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { VapiWebhookPayload } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive a simple outcome label from Vapi's endedReason string.
 */
function deriveOutcome(
  endedReason: string | undefined
): "booked" | "transferred" | "message" | "unanswered" {
  if (!endedReason) return "unanswered";

  const r = endedReason.toLowerCase();

  // Vapi transfers the call to a human → "transferred"
  if (r.includes("transfer") || r.includes("forward")) return "transferred";

  // Caller hung up, silence timeout, or error while talking → "unanswered"
  if (
    r.includes("silence") ||
    r.includes("no-answer") ||
    r.includes("customer-did-not-answer") ||
    r.includes("error") ||
    r.includes("failed")
  )
    return "unanswered";

  // Default for a completed conversation — the AI either booked or took a message.
  // We attempt to infer from the summary; the webhook does a second pass below.
  return "message";
}

/**
 * Very lightweight NLP: does the transcript/summary mention a booking?
 */
function detectBooking(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("appointment") ||
    lower.includes("booked") ||
    lower.includes("scheduled") ||
    lower.includes("reservation") ||
    lower.includes("confirmed for") ||
    lower.includes("set up a time")
  );
}

/**
 * Verify the HMAC-SHA256 signature Vapi attaches to every webhook call.
 * Returns true if no secret is configured (dev mode) or if the sig matches.
 */
async function verifyVapiSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return true; // skip in local dev

  const sig = req.headers.get("x-vapi-signature");
  if (!sig) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // Vapi sends the signature as a hex string
  const sigBytes = Uint8Array.from(
    sig.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  const bodyBytes = encoder.encode(body);

  return crypto.subtle.verify("HMAC", key, sigBytes, bodyBytes);
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const rawBody = await req.text();

  // Verify signature in production.
  const valid = await verifyVapiSignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: VapiWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message } = payload;
  if (!message) {
    return NextResponse.json({ received: true });
  }

  const vapiCall = message.call;
  if (!vapiCall) {
    return NextResponse.json({ received: true });
  }

  // Look up which tenant owns this Vapi assistant.
  // Vapi sends the assistantId; we use it to find the right agent document.
  const assistantId = vapiCall.assistantId;

  let tenantId: string | null = null;
  let agentId: string | null = null;
  let agentName: string = "Agent";

  if (assistantId) {
    // Query across all tenant agent sub-collections using a collection group query.
    const agentSnap = await adminDb
      .collectionGroup("agents")
      .where("vapiAgentId", "==", assistantId)
      .limit(1)
      .get();

    if (!agentSnap.empty) {
      const agentDoc = agentSnap.docs[0];
      agentId = agentDoc.id;
      agentName = agentDoc.data().name || "Agent";
      // Path: tenants/{tenantId}/agents/{agentId}
      tenantId = agentDoc.ref.parent.parent?.id || null;
    }
  }

  // If we still can't resolve a tenant, we can't store the call — log and bail.
  if (!tenantId) {
    console.warn(
      `[vapi webhook] Could not resolve tenant for assistantId=${assistantId}. Event type=${message.type}`
    );
    return NextResponse.json({ received: true });
  }

  const callsRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("calls");

  // ── call-started ──────────────────────────────────────────────────────────
  if (message.type === "call-started") {
    // Create a placeholder call document so the dashboard shows live activity.
    await callsRef.doc(vapiCall.id).set({
      vapiCallId: vapiCall.id,
      agentId,
      agentName,
      tenantId,
      callerNumber: vapiCall.customer?.number || "Unknown",
      outcome: "unanswered", // will be updated when the call ends
      duration: 0,
      summary: "",
      transcript: [],
      recordingUrl: null,
      status: "live",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ received: true });
  }

  // ── call-ended ────────────────────────────────────────────────────────────
  if (message.type === "call-ended") {
    const artifact = message.artifact;
    const rawTranscript = artifact?.transcript || vapiCall.transcript || "";
    const summary = vapiCall.summary || "";
    const duration = Math.round(vapiCall.durationSeconds || 0);
    const recordingUrl =
      artifact?.recordingUrl || vapiCall.recordingUrl || null;

    // Parse the transcript string into structured messages if it's a plain string.
    // Vapi typically returns: "AI: Hello!\nUser: Hi there.\nAI: ..."
    const transcriptMessages = parseTranscript(rawTranscript);

    // Determine the call outcome.
    let outcome = deriveOutcome(vapiCall.endedReason);
    // Upgrade to "booked" if the transcript/summary mentions an appointment.
    if (
      outcome === "message" &&
      (detectBooking(summary) || detectBooking(rawTranscript))
    ) {
      outcome = "booked";
    }

    const durationMinutes = duration / 60;

    // Update the call document.
    const callDocRef = callsRef.doc(vapiCall.id);

    const callData = {
      vapiCallId: vapiCall.id,
      agentId,
      agentName,
      tenantId,
      callerNumber: vapiCall.customer?.number || "Unknown",
      outcome,
      duration,
      summary,
      transcript: transcriptMessages,
      rawTranscript,
      recordingUrl,
      endedReason: vapiCall.endedReason || null,
      status: "completed",
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Use set with merge so this works whether call-started fired or not.
    await callDocRef.set(callData, { merge: true });

    // Also make sure createdAt is set if the call-started event was missed.
    await callDocRef.set({ createdAt: FieldValue.serverTimestamp() }, { merge: true })
      .catch(() => {}); // no-op if it already exists — Firestore ignores serverTimestamp on existing fields when using merge

    // Update tenant-level usage metrics.
    const tenantRef = adminDb.collection("tenants").doc(tenantId);
    const metricsUpdate: Record<string, unknown> = {
      minutesUsed: FieldValue.increment(Math.round(durationMinutes)),
      totalCalls: FieldValue.increment(1),
      callsToday: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (outcome === "booked") {
      metricsUpdate.totalBookings = FieldValue.increment(1);
      metricsUpdate.bookingsToday = FieldValue.increment(1);
    }
    if (outcome === "transferred") {
      metricsUpdate.transfersToday = FieldValue.increment(1);
    }
    if (outcome === "message") {
      metricsUpdate.messagesToday = FieldValue.increment(1);
    }
    if (outcome === "unanswered") {
      metricsUpdate.missedCalls = FieldValue.increment(1);
    }

    await tenantRef.set(metricsUpdate, { merge: true });

    // Update the agent's call stats.
    if (agentId) {
      await adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("agents")
        .doc(agentId)
        .set(
          {
            callsHandled: FieldValue.increment(1),
            lastCallAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    // Update platform-wide metrics.
    await adminDb
      .collection("platform")
      .doc("metrics")
      .set(
        {
          totalCallsToday: FieldValue.increment(1),
          totalMinutesToday: FieldValue.increment(Math.round(durationMinutes)),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ received: true });
  }

  // All other event types — acknowledge without processing.
  return NextResponse.json({ received: true });
}

// ── Transcript parser ─────────────────────────────────────────────────────────

interface TranscriptMessage {
  role: "agent" | "caller";
  text: string;
  time: string;
}

/**
 * Converts Vapi's plain-text transcript into the structured format
 * expected by the TranscriptDrawer component in the Calls UI.
 *
 * Vapi format (may vary):
 *   "AI: Hello, thanks for calling!\nUser: I need an appointment."
 *
 * We also handle Vapi's structured transcript array if it arrives as JSON.
 */
function parseTranscript(raw: string | unknown[]): TranscriptMessage[] {
  // If Vapi sends a pre-structured array, map it directly.
  if (Array.isArray(raw)) {
    return (raw as any[]).map((item, i) => ({
      role: item.role === "user" ? "caller" : "agent",
      text: item.content || item.message || "",
      time: item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : `0:${String(i * 5).padStart(2, "0")}`,
    }));
  }

  if (typeof raw !== "string" || !raw.trim()) return [];

  const lines = raw.trim().split("\n");
  const messages: TranscriptMessage[] = [];
  let msgIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect speaker prefix: "AI:", "Assistant:", "User:", "Human:", "Customer:"
    const aiMatch = trimmed.match(/^(AI|Assistant|Bot):\s*/i);
    const userMatch = trimmed.match(/^(User|Human|Customer|Caller):\s*/i);

    const role: "agent" | "caller" = aiMatch
      ? "agent"
      : userMatch
      ? "caller"
      : "agent";

    const text = trimmed.replace(/^(AI|Assistant|Bot|User|Human|Customer|Caller):\s*/i, "");
    if (!text) continue;

    // Compute a fake timestamp spaced 5 seconds apart for display.
    const totalSeconds = msgIndex * 5;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const time = `${m}:${String(s).padStart(2, "0")}`;

    messages.push({ role, text, time });
    msgIndex++;
  }

  return messages;
}