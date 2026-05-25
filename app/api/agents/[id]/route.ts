// app/api/agents/[agentId]/route.ts
// PATCH  — update agent fields (name, greeting, tone, language, faqs, etc.)
// DELETE — deactivate Vapi assistant and remove Firestore agent document

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getTenantContext } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";

const VAPI_URL = "https://api.vapi.ai";

// ── PATCH /api/agents/[agentId] ──────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = params;
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const agentRef = adminDb
    .collection("tenants")
    .doc(ctx.tenantId)
    .collection("agents")
    .doc(agentId);

  const agentSnap = await agentRef.get();
  if (!agentSnap.exists) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agentData = agentSnap.data()!;

  // Fields an owner can update
  const ALLOWED = [
    "name",
    "greeting",
    "tone",
    "language",
    "faqs",
    "business",
    "calendarUrl",
    "isActive",
    "status",
    "phoneNumber",
  ];

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Keep Vapi assistant in sync if name/greeting/tone/language/faqs changed
  const vapiFields = ["name", "greeting", "tone", "language", "faqs", "business"];
  const needsVapiSync = vapiFields.some((f) => f in body);

  if (needsVapiSync && agentData.vapiAgentId) {
    try {
      const faqText =
        Array.isArray(body.faqs) && body.faqs.length > 0
          ? "\n\nFAQs:\n" +
            (body.faqs as { question: string; answer: string }[])
              .filter((f) => f.question && f.answer)
              .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
              .join("\n\n")
          : "";

      const tone = (body.tone as string) ?? agentData.tone ?? "friendly";
      const toneInstruction =
        tone === "professional"
          ? "Maintain a formal, precise, and business-focused tone."
          : tone === "casual"
          ? "Keep the conversation relaxed and easy-going."
          : "Be warm, approachable, and conversational.";

      const agentName = (body.name as string) ?? agentData.name;
      const systemPrompt = `You are ${agentName}, an AI receptionist. ${toneInstruction}\n\nAnswer questions about the business accurately, help callers book appointments, take messages, and transfer to a human when requested. Always be concise.${faqText}`;

      await fetch(`${VAPI_URL}/assistant/${agentData.vapiAgentId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: agentName,
          firstMessage: (body.greeting as string) ?? agentData.greeting,
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.4,
          },
        }),
      });
    } catch (err) {
      // Vapi sync failure is non-fatal — log and continue
      console.warn("[PATCH /api/agents] Vapi sync failed:", err);
    }
  }

  await agentRef.update(update);

  return NextResponse.json({ success: true });
}

// ── DELETE /api/agents/[agentId] ─────────────────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: { agentId: string } }
) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = params;
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const agentRef = adminDb
    .collection("tenants")
    .doc(ctx.tenantId)
    .collection("agents")
    .doc(agentId);

  const agentSnap = await agentRef.get();
  if (!agentSnap.exists) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { vapiAgentId } = agentSnap.data()!;

  // Delete the Vapi assistant so it stops accepting calls
  if (vapiAgentId) {
    try {
      await fetch(`${VAPI_URL}/assistant/${vapiAgentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        },
      });
    } catch (err) {
      console.warn("[DELETE /api/agents] Vapi delete failed:", err);
    }
  }

  await agentRef.delete();

  return NextResponse.json({ success: true });
}