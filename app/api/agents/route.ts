// app/api/agents/route.ts
// POST — Create a Vapi voice assistant, optionally purchase a Twilio number,
//         and persist the agent document to the tenant's Firestore sub-collection.
// GET  — List all agents for the authenticated tenant.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getTenantContext } from "@/app/server/auth-helpers";
import { createVapiAssistant } from "@/lib/vapi";
import { twilioClient } from "@/lib/twilio";
import { FieldValue } from "firebase-admin/firestore";

// ── POST /api/agents ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // 1. Auth — every request must come from a signed-in tenant.
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name: string;
    business: string;
    greeting: string;
    tone: "friendly" | "professional" | "casual";
    language: string;
    faqs: { id: string; question: string; answer: string }[];
    phoneNumber: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, business, greeting, tone, language, faqs, phoneNumber } = body;

  if (!name || !greeting) {
    return NextResponse.json(
      { error: "Agent name and greeting are required." },
      { status: 422 }
    );
  }

  // 2. Create the assistant in Vapi.
  let vapiAgent: { id: string };
  try {
    vapiAgent = await createVapiAssistant({
      name,
      greeting,
      tone: tone || "friendly",
      language: language || "English",
      faqs: (faqs || []).filter((f) => f.question && f.answer),
      businessName: business || name,
    });
  } catch (err: any) {
    console.error("[POST /api/agents] Vapi error:", err);
    return NextResponse.json(
      { error: `Failed to create Vapi assistant: ${err.message}` },
      { status: 502 }
    );
  }

  // 3. Strip the internal `id` from FAQs so the data model stays clean.
  const cleanFaqs = (faqs || [])
    .filter((f) => f.question && f.answer)
    .map(({ question, answer }) => ({ question, answer }));

  // 4. Persist the agent to Firestore under the tenant's sub-collection.
  const agentRef = adminDb
    .collection("tenants")
    .doc(ctx.tenantId)
    .collection("agents")
    .doc(); // auto-ID

  const agentData = {
    name,
    business: business || "",
    greeting,
    tone: tone || "friendly",
    language: language || "English",
    faqs: cleanFaqs,
    phoneNumber: phoneNumber || null,
    vapiAgentId: vapiAgent.id,
    isActive: true,
    status: "active",
    callsHandled: 0,
    bookingRate: 0,
    createdAt: FieldValue.serverTimestamp(),
    tenantId: ctx.tenantId,
  };

  await agentRef.set(agentData);

  // 5. If a phone number was selected in the wizard, purchase it via Twilio
  //    and wire the webhook to point at this tenant + agent.
  let finalPhoneNumber = phoneNumber || null;

  if (phoneNumber) {
    try {
      const webhookBaseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://app.receptionly.ai";
      const voiceUrl = `${webhookBaseUrl}/api/webhooks/twilio`;

      // Buy the specific number the user selected in the StepPhone wizard.
      const purchased = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber,
        voiceUrl,
        voiceMethod: "POST",
        statusCallback: `${webhookBaseUrl}/api/webhooks/twilio/status`,
        statusCallbackMethod: "POST",
        friendlyName: `Receptionly — ${ctx.tenantId.slice(0, 8)}`,
      });

      finalPhoneNumber = purchased.phoneNumber;

      // Update the agent doc with the confirmed number.
      await agentRef.update({
        phoneNumber: finalPhoneNumber,
        twilioPhoneSid: purchased.sid,
      });

      // Also stamp it on the tenant doc so the dashboard sidebar shows it.
      await adminDb
        .collection("tenants")
        .doc(ctx.tenantId)
        .set({ phoneNumber: finalPhoneNumber }, { merge: true });
    } catch (err: any) {
      // Phone provisioning failure is non-fatal — the agent is still created.
      // The user can assign a number later from the agent detail page.
      console.warn("[POST /api/agents] Twilio provisioning failed:", err.message);

      // Still store the user's selected number as-is (it may be a manual entry).
      await adminDb
        .collection("tenants")
        .doc(ctx.tenantId)
        .set({ phoneNumber }, { merge: true });
    }
  }

  return NextResponse.json(
    {
      success: true,
      agentId: agentRef.id,
      vapiAgentId: vapiAgent.id,
      phoneNumber: finalPhoneNumber,
    },
    { status: 201 }
  );
}

// ── GET /api/agents ──────────────────────────────────────────────────────────

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb
    .collection("tenants")
    .doc(ctx.tenantId)
    .collection("agents")
    .orderBy("createdAt", "desc")
    .get();

  const agents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ agents });
}