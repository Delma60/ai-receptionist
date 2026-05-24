const FLUTTERWAVE_URL = "https://api.flutterwave.com/v3";

/**
 * Utility to create a Flutterwave payment link.
 */
export async function createFlutterwavePaymentLink(data: {
  tx_ref: string;
  amount: number;
  currency: string;
  redirect_url: string;
  customer: {
    email: string;
    name: string;
  };
  meta: {
    tenantId: string;
    plan: string;
  };
}) {
  const res = await fetch(`${FLUTTERWAVE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Flutterwave Error: ${error.message || res.statusText}`);
  }

  return res.json();
}