// app/api/agents/route.ts
// Creates a Vapi voice assistant, provisions (or skips) a Twilio number,
// and persists the agent document to the tenant's Firestore sub-collection.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getTenantContext } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";
import { createVapiAssistant } from "@/lib/vapi";


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
      faqs: faqs || [],
      businessName: business || name,
    });
  } catch (err: any) {
    console.error("[POST /api/agents] Vapi error:", err);
    return NextResponse.json(
      { error: `Failed to create Vapi assistant: ${err.message}` },
      { status: 502 }
    );
  }

  // 3. Persist the agent to Firestore under the tenant's sub-collection.
  //    Strip the internal `id` from FAQs so the data model stays clean.
  const cleanFaqs = (faqs || [])
    .filter((f) => f.question && f.answer)
    .map(({ question, answer }) => ({ question, answer }));

  const agentRef = adminDb
    .collection("tenants")
    .doc(ctx.tenantId)
    .collection("agents")
    .doc(); // auto-ID

  const agentData = {
    name,
    business,
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

  // 4. If the tenant already has a Twilio number stored on the tenant doc,
  //    update it to point to the new Vapi assistant so calls are routed correctly.
  //    (Full number provisioning is handled by /api/phone separately.)
  if (phoneNumber) {
    await adminDb.collection("tenants").doc(ctx.tenantId).set(
      { phoneNumber },
      { merge: true }
    );
  }

  return NextResponse.json(
    {
      success: true,
      agentId: agentRef.id,
      vapiAgentId: vapiAgent.id,
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