// app/api/webhooks/vapi/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { VapiWebhookPayload } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveOutcome(
  endedReason: string | undefined
): "booked" | "transferred" | "message" | "unanswered" {
  if (!endedReason) return "unanswered";
  const r = endedReason.toLowerCase();
  if (r.includes("transfer") || r.includes("forward")) return "transferred";
  if (
    r.includes("silence") ||
    r.includes("no-answer") ||
    r.includes("customer-did-not-answer") ||
    r.includes("error") ||
    r.includes("failed")
  )
    return "unanswered";
  return "message";
}

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

async function verifyVapiSignature(req: Request, body: string): Promise<boolean> {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return true;
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
  const sigBytes = Uint8Array.from(sig.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const rawBody = await req.text();

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
  if (!message) return NextResponse.json({ received: true });

  const vapiCall = message.call;
  if (!vapiCall) return NextResponse.json({ received: true });

  // Resolve tenant + agent from the Vapi assistantId
  const assistantId = vapiCall.assistantId;
  let tenantId: string | null = null;
  let agentId: string | null = null;
  let agentName = "Agent";

  if (assistantId) {
    const agentSnap = await adminDb
      .collectionGroup("agents")
      .where("vapiAgentId", "==", assistantId)
      .limit(1)
      .get();

    if (!agentSnap.empty) {
      const agentDoc = agentSnap.docs[0];
      agentId   = agentDoc.id;
      agentName = agentDoc.data().name || "Agent";
      tenantId  = agentDoc.ref.parent.parent?.id || null;
    }
  }

  if (!tenantId) {
    console.warn(`[vapi webhook] Cannot resolve tenant for assistantId=${assistantId}`);
    return NextResponse.json({ received: true });
  }

  const callsRef = adminDb.collection("tenants").doc(tenantId).collection("calls");
  const tenantRef = adminDb.collection("tenants").doc(tenantId);

  // ── call-started ──────────────────────────────────────────────────────────
  if (message.type === "call-started") {
    await callsRef.doc(vapiCall.id).set({
      vapiCallId:   vapiCall.id,
      agentId,
      agentName,
      tenantId,
      callerNumber: vapiCall.customer?.number || "",
      outcome:      "unanswered",
      duration:     0,
      summary:      "",
      transcript:   [],
      recordingUrl: null,
      status:       "live",
      createdAt:    FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ received: true });
  }

  // ── call-ended ────────────────────────────────────────────────────────────
  if (message.type === "call-ended") {
    const artifact      = message.artifact;
    const rawTranscript = artifact?.transcript ?? vapiCall.transcript ?? "";
    const summary       = vapiCall.summary ?? "";
    const duration      = Math.round(vapiCall.durationSeconds ?? 0);
    const recordingUrl  = artifact?.recordingUrl ?? vapiCall.recordingUrl ?? null;
    const transcriptMessages = parseTranscript(rawTranscript);

    let outcome = deriveOutcome(vapiCall.endedReason);
    if (
      outcome === "message" &&
      (detectBooking(summary) || detectBooking(typeof rawTranscript === "string" ? rawTranscript : ""))
    ) {
      outcome = "booked";
    }

    // FIX 10 & 12: Read current tenant metrics to compute accurate aggregates
    const tenantSnap  = await tenantRef.get();
    const current     = tenantSnap.data() ?? {};

    const prevTotal    = (current.totalCalls    ?? 0) as number;
    const prevAvgSecs  = (current.avgDurationSecs ?? 0) as number;
    const prevMissed   = (current.missedCalls   ?? 0) as number;
    const prevBookings = (current.totalBookings  ?? 0) as number;

    // Post-this-call totals
    const newTotal    = prevTotal + 1;
    const newMissed   = outcome === "unanswered" ? prevMissed + 1 : prevMissed;
    const newBookings = outcome === "booked"     ? prevBookings + 1 : prevBookings;

    // FIX 12: Rolling weighted-average duration (seconds)
    // Formula: ((prevAvg * prevTotal) + newDuration) / newTotal
    const newAvgSecs = newTotal > 0
      ? Math.round((prevAvgSecs * prevTotal + duration) / newTotal)
      : duration;

    // FIX 10: Rate fields — integer percentages based on true cumulative counts
    const newBookingRate = newTotal > 0 ? Math.round((newBookings / newTotal) * 100) : 0;
    const newMissRate    = newTotal > 0 ? Math.round((newMissed   / newTotal) * 100) : 0;

    const durationMinutes = duration / 60;

    // ── Write call document ───────────────────────────────────────────────
    await callsRef.doc(vapiCall.id).set(
      {
        vapiCallId:   vapiCall.id,
        agentId,
        agentName,
        tenantId,
        callerNumber: vapiCall.customer?.number || "",
        outcome,
        duration,
        summary,
        transcript:      transcriptMessages,
        rawTranscript,
        recordingUrl,
        endedReason:     vapiCall.endedReason ?? null,
        status:          "completed",
        updatedAt:       FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Ensure createdAt exists (call-started may have been missed)
    await callsRef.doc(vapiCall.id).set(
      { createdAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    // ── Write tenant metrics ──────────────────────────────────────────────
    // All increment operations use FieldValue.increment for atomicity.
    // Computed aggregates (avg, rates) use concrete values derived above
    // from a pre-read snapshot, which is safe for low-concurrency tenants.
    await tenantRef.set(
      {
        // Atomic increments
        minutesUsed:    FieldValue.increment(Math.round(durationMinutes)),
        totalCalls:     FieldValue.increment(1),
        callsToday:     FieldValue.increment(1),

        // Conditional increments — only bump the relevant outcome counter
        ...(outcome === "unanswered"  && { missedCalls:    FieldValue.increment(1) }),
        ...(outcome === "booked"      && { totalBookings:  FieldValue.increment(1), bookingsToday:  FieldValue.increment(1) }),
        ...(outcome === "transferred" && { transfersToday: FieldValue.increment(1) }),
        ...(outcome === "message"     && { messagesToday:  FieldValue.increment(1) }),

        // FIX 10 & 12: Computed / derived metrics — concrete values from snapshot read
        avgDurationSecs: newAvgSecs,
        bookingRate:     newBookingRate,
        missRate:        newMissRate,

        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // ── Update agent stats ────────────────────────────────────────────────
    if (agentId) {
      const agentRef  = adminDb
        .collection("tenants").doc(tenantId)
        .collection("agents").doc(agentId);
      const agentSnap = await agentRef.get();
      const agentData = agentSnap.data() ?? {};

      const prevAgentCalls    = (agentData.callsHandled ?? 0) as number;
      const prevAgentBookings = (agentData.totalBookings ?? 0) as number;
      const newAgentCalls     = prevAgentCalls + 1;
      const newAgentBookings  = outcome === "booked" ? prevAgentBookings + 1 : prevAgentBookings;
      const agentBookingRate  = newAgentCalls > 0
        ? Math.round((newAgentBookings / newAgentCalls) * 100)
        : 0;

      await agentRef.set(
        {
          callsHandled:  FieldValue.increment(1),
          ...(outcome === "booked" && { totalBookings: FieldValue.increment(1) }),
          bookingRate:   agentBookingRate,
          lastCallAt:    FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // ── Platform-wide metrics ─────────────────────────────────────────────
    await adminDb
      .collection("platform")
      .doc("metrics")
      .set(
        {
          totalCallsToday:    FieldValue.increment(1),
          totalMinutesToday:  FieldValue.increment(Math.round(durationMinutes)),
          updatedAt:          FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}

// ── Transcript parser ─────────────────────────────────────────────────────────

interface TranscriptMessage {
  role: "agent" | "caller";
  text: string;
  time: string;
}

function parseTranscript(raw: string | unknown[]): TranscriptMessage[] {
  if (Array.isArray(raw)) {
    return (raw as any[]).map((item, i) => ({
      role: item.role === "user" ? "caller" : "agent",
      text: item.content || item.message || "",
      time: item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : `0:${String(i * 5).padStart(2, "0")}`,
    }));
  }

  if (typeof raw !== "string" || !raw.trim()) return [];

  const messages: TranscriptMessage[] = [];
  let idx = 0;

  for (const line of raw.trim().split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isAgent = /^(AI|Assistant|Bot):/i.test(trimmed);
    const role: "agent" | "caller" = isAgent ? "agent" : "caller";
    const text = trimmed.replace(/^(AI|Assistant|Bot|User|Human|Customer|Caller):\s*/i, "");
    if (!text) continue;

    const secs = idx * 5;
    const m    = Math.floor(secs / 60);
    const s    = secs % 60;
    messages.push({ role, text, time: `${m}:${String(s).padStart(2, "0")}` });
    idx++;
  }

  return messages;
}