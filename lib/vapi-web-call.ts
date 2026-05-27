// lib/vapi-web-call.ts
//
// Shared helper for initiating a Vapi test call from the browser.
//
// Used by:
//   - app/(dashboard)/agents/page.tsx  → AgentCard "Test call" menu item
//   - app/(dashboard)/agents/[agentId]/page.tsx → "Test call" button
//   - app/(dashboard)/dashboard/page.tsx → Active agent card "Test call"
//
// How the Vapi Web SDK works (CDN version loaded in dashboard layout):
//
//   <Script src="https://cdn.vapi.ai/vapi.js" strategy="afterInteractive" />
//
//   The CDN script exposes the Vapi class on window.Vapi (capital V).
//   An instance must be constructed with the Public Key before start() is called.
//   The instance can be cached on window.vapiInstance to avoid re-initialising
//   on every test call.
//
// Usage:
//   import { startVapiTestCall, stopVapiTestCall } from "@/lib/vapi-web-call";
//
//   // In an onClick handler:
//   await startVapiTestCall(agentId);
//
//   // To stop the call:
//   stopVapiTestCall();

export async function startVapiTestCall(agentId: string): Promise<void> {
  // ── 1. Fetch token from our secure server route ───────────────────────────
  const res = await fetch(`/api/agents/${agentId}/web-token`, {
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error ?? `Failed to get web token (${res.status})`
    );
  }

  const { token, publicKey, agentName } = await res.json();

  // ── 2. Ensure the Vapi CDN class is available ─────────────────────────────
  // The CDN script exposes the constructor as window.Vapi (capital V).
  // It is loaded asynchronously via Next.js Script — it may not be ready on
  // the very first render, but will always be ready after user interaction.
  const VapiClass =
    (window as any).Vapi ??
    // Fallback: some CDN builds expose it as window.vapi (already an instance)
    // In that case we skip construction and call start directly.
    null;

  if (!VapiClass && !(window as any).vapiInstance) {
    throw new Error(
      "Vapi SDK is not loaded yet. The CDN script (vapi.js) may still be " +
        "downloading. Please wait a moment and try again."
    );
  }

  // ── 3. Construct or reuse a Vapi instance ────────────────────────────────
  // Cache the instance on window so we can stop it later and avoid creating
  // multiple instances. Always reinitialise when the public key changes.
  if (
    !((window as any).vapiInstance) ||
    (window as any)._vapiPublicKey !== publicKey
  ) {
    (window as any).vapiInstance = new VapiClass(publicKey);
    (window as any)._vapiPublicKey = publicKey;
  }

  const vapiInstance: any = (window as any).vapiInstance;

  // ── 4. Start the call ─────────────────────────────────────────────────────
  // token = vapiAgentId. The SDK calls POST /call/web on Vapi's servers,
  // gets a Daily.co room URL, and connects the browser microphone.
  await vapiInstance.start(token);

  console.info(`[Vapi] Test call started for agent: ${agentName}`);
}

export function stopVapiTestCall(): void {
  const vapiInstance = (window as any).vapiInstance;
  if (vapiInstance) {
    vapiInstance.stop();
    console.info("[Vapi] Test call stopped.");
  }
}