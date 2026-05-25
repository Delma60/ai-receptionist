// app/(dashboard)/settings/billing-actions.ts
// Client-side helpers for billing actions used in the settings page.

/**
 * Opens the Stripe Customer Portal in a new tab for subscription management.
 * Returns null on success, or an error message string on failure.
 */
export async function openBillingPortal(): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || `Server error ${res.status}`;
    }

    const { url } = await res.json();
    if (!url) return "No portal URL returned.";

    window.location.href = url;
    return null;
  } catch (err: any) {
    return err?.message || "Failed to open billing portal.";
  }
}

/**
 * Starts a Stripe Checkout session for a plan upgrade.
 * Redirects to Stripe on success.
 * Returns null on success (redirect happens), or an error message on failure.
 */
export async function startCheckout(
  plan: "starter" | "growth" | "pro"
): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || `Server error ${res.status}`;
    }

    const { url } = await res.json();
    if (!url) return "No checkout URL returned.";

    window.location.href = url;
    return null;
  } catch (err: any) {
    return err?.message || "Failed to start checkout.";
  }
}

/**
 * Parses the ?checkout= query param that Stripe appends on redirect back.
 */
export function parseCheckoutStatus(
  searchParams: URLSearchParams
): { status: "success" | "cancelled" | "error" | null; plan: string | null } {
  const raw = searchParams.get("checkout");
  const plan = searchParams.get("plan");

  if (!raw) return { status: null, plan: null };

  if (raw === "success") return { status: "success", plan };
  if (raw === "cancelled") return { status: "cancelled", plan: null };
  return { status: "error", plan: null };
}