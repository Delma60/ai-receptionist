import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const to = formData.get('To') as string;

    // 1. Look up the tenant by the phone number called
    const tenantSnap = await adminDb
      .collection("tenants")
      .where("phoneNumber", "==", to)
      .limit(1)
      .get();

    if (tenantSnap.empty) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>We're sorry, this number is not yet configured. Goodbye.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const tenantId = tenantSnap.docs[0].id;

    // 2. Find the active agent for this tenant
    const agentSnap = await adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("agents")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (agentSnap.empty) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>No receptionist is currently online for this business.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const agentData = agentSnap.docs[0].data();
    const assistantId = agentData.vapiAgentId;

    // 3. Return TwiML to connect the call to Vapi
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Assistant assistantId="${assistantId}" />
  </Connect>
</Response>`;

    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("Twilio Webhook Error:", error);
    return new Response("<Response><Reject /></Response>", { headers: { "Content-Type": "text/xml" } });
  }
}
