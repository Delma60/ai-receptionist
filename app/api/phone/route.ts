// app/api/phone/route.ts
// Handles phone number provisioning via Twilio.
//
//  POST /api/phone          — Purchase a new Twilio number and link it to an agent
//  DELETE /api/phone        — Release a Twilio number
//  GET /api/phone/available — Search for available numbers

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getTenantContext } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";
import twilio from "twilio";
import { twilioClient } from "@/lib/twilio";


// ── POST /api/phone ───────────────────────────────────────────────────────────
//
// Body: { agentId: string, phoneNumber?: string, areaCode?: string }
//
// If phoneNumber is provided (e.g. selected from our pre-fetched list),
// we attempt to purchase that exact number.
// If only areaCode is provided, we search and buy the first available.

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    agentId?: string;
    phoneNumber?: string;
    areaCode?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentId, phoneNumber, areaCode } = body;

  // Get the vapiAgentId we need to wire up the webhook.
  let vapiAgentId: string | null = null;
  if (agentId) {
    const agentSnap = await adminDb
      .collection("tenants")
      .doc(ctx.tenantId)
      .collection("agents")
      .doc(agentId)
      .get();

    if (agentSnap.exists) {
      vapiAgentId = agentSnap.data()?.vapiAgentId || null;
    }
  }

  let client: ReturnType<typeof twilio>;
  try {
    client =  twilioClient //getTwilioClient();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }

  const webhookBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://app.receptionly.ai";
  const voiceUrl = `${webhookBaseUrl}/api/webhooks/twilio`;

  let purchasedNumber: string;

  try {
    if (phoneNumber) {
      // Purchase the specific number the user selected.
      const purchased = await client.incomingPhoneNumbers.create({
        phoneNumber,
        voiceUrl,
        voiceMethod: "POST",
        statusCallback: `${webhookBaseUrl}/api/webhooks/twilio/status`,
        statusCallbackMethod: "POST",
        friendlyName: `Receptionly — ${ctx.tenantId}`,
      });
      purchasedNumber = purchased.phoneNumber;
    } else {
      // Search for an available local number and purchase the first result.
      const searchParams: { limit: number; areaCode?: number } = { limit: 1 };
      if (areaCode) searchParams.areaCode = parseInt(areaCode, 10);

      const available = await client
        .availablePhoneNumbers("US")
        .local.list(searchParams);

      if (available.length === 0) {
        return NextResponse.json(
          {
            error:
              "No phone numbers available for this area code. Try a different area code.",
          },
          { status: 422 }
        );
      }

      const purchased = await client.incomingPhoneNumbers.create({
        phoneNumber: available[0].phoneNumber,
        voiceUrl,
        voiceMethod: "POST",
        friendlyName: `Receptionly — ${ctx.tenantId}`,
      });
      purchasedNumber = purchased.phoneNumber;
    }
  } catch (err: any) {
    console.error("[POST /api/phone] Twilio error:", err);
    return NextResponse.json(
      { error: `Twilio error: ${err.message}` },
      { status: 502 }
    );
  }

  // Persist the phone number on the tenant and the specific agent.
  const batch = adminDb.batch();

  batch.set(
    adminDb.collection("tenants").doc(ctx.tenantId),
    { phoneNumber: purchasedNumber, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  if (agentId) {
    batch.set(
      adminDb
        .collection("tenants")
        .doc(ctx.tenantId)
        .collection("agents")
        .doc(agentId),
      { phoneNumber: purchasedNumber, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  await batch.commit();

  return NextResponse.json(
    { success: true, phoneNumber: purchasedNumber },
    { status: 201 }
  );
}

// ── GET /api/phone ─────────────────────────────────────────────────────────────
//
// Query params: ?areaCode=415&country=US&limit=5
// Returns a list of available numbers for the user to choose from.

export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const areaCode = searchParams.get("areaCode") || undefined;
  const country = (searchParams.get("country") || "US").toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 20);

  let client: ReturnType<typeof twilio>;
  try {
    client = twilioClient
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }

  try {
    const searchParams: { limit: number; areaCode?: number } = { limit };
    if (areaCode) searchParams.areaCode = parseInt(areaCode, 10);

    const available = await client
      .availablePhoneNumbers(country)
      .local.list(searchParams);

    const numbers = available.map((n) => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region,
      isoCountry: n.isoCountry,
      capabilities: n.capabilities,
    }));

    return NextResponse.json({ numbers });
  } catch (err: any) {
    console.error("[GET /api/phone] Twilio error:", err);
    return NextResponse.json(
      { error: `Twilio error: ${err.message}` },
      { status: 502 }
    );
  }
}

// ── DELETE /api/phone ──────────────────────────────────────────────────────────
//
// Body: { phoneNumber: string }
// Releases a Twilio number and removes it from the agent/tenant.

export async function DELETE(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phoneNumber: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { phoneNumber } = body;
  if (!phoneNumber) {
    return NextResponse.json(
      { error: "phoneNumber is required" },
      { status: 400 }
    );
  }

  let client: ReturnType<typeof twilio>;
  try {
    client = twilioClient
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }

  try {
    // Find the Twilio SID for this number.
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber,
      limit: 1,
    });

    if (numbers.length > 0) {
      await client.incomingPhoneNumbers(numbers[0].sid).remove();
    }
  } catch (err: any) {
    console.error("[DELETE /api/phone] Twilio error:", err);
    return NextResponse.json(
      { error: `Twilio error: ${err.message}` },
      { status: 502 }
    );
  }

  // Remove phone number from tenant doc.
  await adminDb
    .collection("tenants")
    .doc(ctx.tenantId)
    .set({ phoneNumber: null }, { merge: true });

  return NextResponse.json({ success: true });
}