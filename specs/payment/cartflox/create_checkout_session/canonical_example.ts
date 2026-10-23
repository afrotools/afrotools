/**
 * @provider Cartflox
 * @capability create_checkout_session
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type CreateCheckoutSessionInput = {
  amount: number;
  currency?: "XOF" | "XAF" | "GHS" | "NGN" | "KES" | "TZS" | "UGX" | "RWF" | "ZMW" | "MWK" | "CDF" | "ETB" | "MZN" | "ZAR" | "EGP" | "MAD" | "GNF" | "SLE" | "LRD" | "GMD" | "MGA" | "MUR" | "USD" | "EUR" | "GBP";
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
  merchant_name?: string;
  merchant_logo?: string;
};

export type CreateCheckoutSessionResponse = {
  id: string;
  object: "checkout.session";
  url: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "cancelled" | "refunded";
  livemode: boolean;
  created: string;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
  // One key per order or transfer, reused unchanged on every retry of it.
  idempotencyKey?: string
): Promise<CreateCheckoutSessionResponse> {
  const response = await fetch("https://cartflox.com/api/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CARTFLOX_SECRET_KEY}`,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as CreateCheckoutSessionResponse;
}

/*
Usage example:

const session = await createCheckoutSession(
  {
    amount: 5000,
    currency: "XOF",
    customer_email: "client@example.com",
    success_url: "https://example.com/merci",
    cancel_url: "https://example.com/panier",
    metadata: { order_id: "1042" },
  },
  "commande-1042",
);
// Redirect the customer to session.url, keep session.id to follow the payment.
*/
