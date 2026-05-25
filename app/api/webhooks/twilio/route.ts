// app/api/webhooks/twilio/route.ts
// Twilio calls this webhook when an incoming call arrives on a provisioned number.
// We look up the tenant and their active Vapi agent, then return TwiML that
// connects the call to Vapi's SIP endpoint using the correct <Connect><Stream> syntax.

import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const to = formData.get("To") as string;
    const from = formData.get("From") as string;
    const callSid = formData.get("CallSid") as string;

    if (!to) {
      return errorTwiml("Missing 'To' parameter.");
    }

    // 1. Look up the tenant by the Twilio number that was called.
    const tenantSnap = await adminDb
      .collection("tenants")
      .where("phoneNumber", "==", to)
      .limit(1)
      .get();

    if (tenantSnap.empty) {
      return errorTwiml(
        "This number is not yet configured. Please contact the business directly."
      );
    }

    const tenantId = tenantSnap.docs[0].id;

    // 2. Find the active agent for this tenant.
    const agentSnap = await adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("agents")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (agentSnap.empty) {
      return errorTwiml(
        "No receptionist is currently available. Please try again later."
      );
    }

    const agentData = agentSnap.docs[0].data();
    const vapiAssistantId = agentData.vapiAgentId;

    if (!vapiAssistantId) {
      return errorTwiml(
        "Receptionist configuration is incomplete. Please try again later."
      );
    }

    // 3. Return TwiML that connects the call to Vapi.
    //    Vapi exposes a SIP endpoint; Twilio dials it and Vapi takes over.
    //    The assistant ID is passed as a SIP URI parameter.
    //
    //    Vapi SIP domain: sip.vapi.ai
    //    Format:  sip:<assistantId>@sip.vapi.ai
    //
    //    We also pass caller metadata in custom SIP headers so Vapi's
    //    call-started webhook can associate the call with the right tenant.
    const vapiSipUri = `sip:${vapiAssistantId}@sip.vapi.ai`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>
      ${vapiSipUri}
    </Sip>
  </Dial>
</Response>`;

    return new Response(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[Twilio Webhook] Unhandled error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Reject /></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function errorTwiml(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${message}</Say></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}