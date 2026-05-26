// app/api/admin/platform-keys/route.ts
// GET  — return current platform API keys (secrets masked)
// PATCH — update one or more platform API keys in Firestore platform/config
//
// Keys are stored in Firestore under platform/config with a `apiKeys` sub-object.
// The real values are written by the server; the client only ever receives masked versions.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isAdmin, getTenantContext, logAdminAction } from "@/app/server/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";

// The complete set of keys we manage through this endpoint.
// Extend this list when new integrations are added.
const ALLOWED_KEY_NAMES = [
  "vapi_private",
  "twilio_sid",
  "twilio_auth_token",
  "twilio_phone_number",
  "stripe_secret",
  "stripe_webhook_secret",
  "resend_api_key",
] as const;

type AllowedKey = (typeof ALLOWED_KEY_NAMES)[number];

function maskValue(value: string): string {
  if (!value || value.length < 8) return "•••••••••";
  return value.slice(0, 4) + "•".repeat(Math.min(value.length - 6, 12)) + value.slice(-3);
}

// ── GET /api/admin/platform-keys ─────────────────────────────────────────────
// Returns the current keys with secrets masked for safe display in the UI.

export async function GET() {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const snap = await adminDb.collection("platform").doc("config").get();
    const data = snap.data() ?? {};
    const rawKeys: Record<string, string> = data.apiKeys ?? {};

    // Build a masked version for the client
    const masked: Record<string, { masked: string; hasValue: boolean }> = {};
    for (const key of ALLOWED_KEY_NAMES) {
      const raw = rawKeys[key] ?? "";
      masked[key] = {
        masked: raw ? maskValue(raw) : "",
        hasValue: !!raw,
      };
    }

    return NextResponse.json({ keys: masked });
  } catch (err) {
    console.error("[GET /api/admin/platform-keys]", err);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// ── PATCH /api/admin/platform-keys ───────────────────────────────────────────
// Body: { keys: { [keyName]: string } }
// Only fields present in ALLOWED_KEY_NAMES are written; everything else is ignored.
// Empty string values are treated as "delete this key."

export async function PATCH(req: Request) {
  const adminAuthorized = await isAdmin();
  if (!adminAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { keys?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming = body.keys ?? {};
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "keys object is required" }, { status: 422 });
  }

  // Filter to only allowed keys, skip masked/placeholder values from the client
  const updates: Record<string, string | FieldValue> = {};
  const updated: string[] = [];

  for (const key of ALLOWED_KEY_NAMES) {
    if (!(key in incoming)) continue;
    const val = incoming[key];

    // If the client sends back a masked string (all bullets), skip it — the user
    // didn't change that field.
    if (typeof val === "string" && /^[•]+$/.test(val)) continue;

    if (val === "" || val === null) {
      // Empty → delete the field
      updates[`apiKeys.${key}`] = FieldValue.delete();
    } else {
      updates[`apiKeys.${key}`] = val;
    }
    updated.push(key);
  }

  if (updated.length === 0) {
    return NextResponse.json({ success: true, updated: [] });
  }

  try {
    await adminDb.collection("platform").doc("config").set(
      { ...updates, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    const ctx = await getTenantContext();
    await logAdminAction(ctx?.userId ?? "unknown", "feature_flag", "platform", {
      action: "platform_keys_update",
      updatedKeys: updated,
    });

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("[PATCH /api/admin/platform-keys]", err);
    return NextResponse.json({ error: "Failed to save keys" }, { status: 500 });
  }
}