// app/api/agents/[agentId]/web-token/route.ts
//
// GET /api/agents/[agentId]/web-token
//
// Returns the data the browser needs to initiate a Vapi web call for testing:
//
//   { token: string, publicKey: string }
//
//   token     — the Vapi assistantId for this agent. Passed to vapi.start(token)
//               which the Vapi Web SDK treats as the assistantId and internally
//               calls POST /call/web on Vapi's API using the public key.
//
//   publicKey — VAPI_PUBLIC_KEY (safe to expose to the browser). Used to
//               initialise the Vapi SDK instance: new Vapi(publicKey).
//               Distinct from VAPI_API_KEY which is the secret server-side key.
//
// The route verifies:
//   1. The caller is authenticated (valid session cookie).
//   2. The agent belongs to that tenant (tenant isolation).
//   3. The agent has a vapiAgentId (has been fully provisioned).
//
// Why this route exists instead of putting vapiAgentId in the client:
//   - vapiAgentId is stored in Firestore but Firestore security rules prevent
//     direct client reads of agent sub-documents for non-members.
//   - The public key must never be hardcoded in client bundles; fetching it
//     server-side keeps it in .env.local and out of the JS bundle.
//   - This endpoint is a lightweight auth-gated proxy — no Vapi API call is
//     made here; the Vapi SDK makes the /call/web call itself using the token.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getTenantContext } from "@/app/server/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: { agentId: string } }
) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = params;
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  // ── 2. Public key presence check ─────────────────────────────────────────
  // VAPI_PUBLIC_KEY is the browser-safe key (not VAPI_API_KEY).
  // If it is not configured, fail early with a clear message.
  const publicKey = process.env.VAPI_PUBLIC_KEY;
  if (!publicKey) {
    console.error(
      "[web-token] VAPI_PUBLIC_KEY is not set in environment variables. " +
        "Add it to .env.local — it is the Public Key from your Vapi dashboard, " +
        "distinct from the secret VAPI_API_KEY."
    );
    return NextResponse.json(
      {
        error:
          "VAPI_PUBLIC_KEY is not configured. " +
          "Add it to your .env.local and redeploy.",
      },
      { status: 503 }
    );
  }

  // ── 3. Fetch the agent and verify tenant ownership ────────────────────────
  let agentSnap;
  try {
    agentSnap = await adminDb
      .collection("tenants")
      .doc(ctx.tenantId)
      .collection("agents")
      .doc(agentId)
      .get();
  } catch (err) {
    console.error("[web-token] Firestore error:", err);
    return NextResponse.json(
      { error: "Failed to fetch agent." },
      { status: 500 }
    );
  }

  if (!agentSnap.exists) {
    // Return 404 rather than 403 to avoid leaking existence of other tenants'
    // agents — the agent simply doesn't exist under this tenant's path.
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const agent = agentSnap.data()!;

  // ── 4. Confirm the agent is provisioned on Vapi ───────────────────────────
  const vapiAgentId: string | undefined = agent.vapiAgentId;
  if (!vapiAgentId) {
    return NextResponse.json(
      {
        error:
          "This agent has not been fully provisioned yet. " +
          "vapiAgentId is missing — try recreating the agent.",
      },
      { status: 422 }
    );
  }

  // ── 5. Confirm the agent is active ───────────────────────────────────────
  // Allow test calls even for inactive agents (useful for debugging),
  // but include a flag so the client can show a warning if needed.
  const isActive: boolean = agent.isActive ?? false;

  // ── 6. Return the token payload ───────────────────────────────────────────
  //
  // Client usage (agents/page.tsx and agent detail page):
  //
  //   const { token, publicKey } = await res.json();
  //   const vapi = new Vapi(publicKey);   // initialise with public key
  //   await vapi.start(token);            // token = assistantId
  //
  // OR with the CDN global (existing pattern in dashboard layout):
  //
  //   if ((window as any).Vapi) {
  //     const vapiInstance = new (window as any).Vapi(publicKey);
  //     vapiInstance.start(token);
  //   }
  //
  return NextResponse.json({
    /** The Vapi assistantId — pass directly to vapi.start(token) */
    token: vapiAgentId,
    /** The browser-safe Vapi Public Key — use to construct new Vapi(publicKey) */
    publicKey,
    /** Metadata the client can use to label the test call UI */
    agentName: agent.name ?? "Agent",
    isActive,
  });
}