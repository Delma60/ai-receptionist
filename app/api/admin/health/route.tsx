import { NextResponse } from "next/server";

export async function GET() {
  let vapiOk = false;
  let twilioOk = false;

  try {
    // Check Vapi health by pinging their 'me' endpoint
    const vapiRes = await fetch("https://api.vapi.ai/me", {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      },
    });
    vapiOk = vapiRes.ok;
  } catch (err) {
    console.error("[Health Check] Vapi ping failed:", err);
  }

  try {
    // Check Twilio health by requesting basic account info
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      },
    );
    twilioOk = twilioRes.ok;
  } catch (err) {
    console.error("[Health Check] Twilio ping failed:", err);
  }

  return NextResponse.json({
    vapi: vapiOk,
    twilio: twilioOk,
    timestamp: new Date().toISOString(),
  });
}
