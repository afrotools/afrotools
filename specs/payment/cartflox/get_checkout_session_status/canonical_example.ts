/**
 * @provider Cartflox
 * @capability get_checkout_session_status
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type GetCheckoutSessionStatusInput = {
  id: string;
};

export type GetCheckoutSessionStatusResponse = {
  id: string;
  order_id: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
  paid: boolean;
  amount: number;
  currency: string;
  provider?: string | null;
  provider_reference?: string | null;
  failure_message?: string | null;
  next_action?: {
    type: "otp" | "ussd" | "redirection";
    message?: string | null;
    ussd_code?: string | null;
    url?: string | null;
    application?: string | null;
  } | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  metadata?: Record<string, unknown> | null;
  completed_at?: string | null;
  livemode: boolean;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function getCheckoutSessionStatus(
  input: GetCheckoutSessionStatusInput
): Promise<GetCheckoutSessionStatusResponse> {
  const response = await fetch(`https://cartflox.com/api/v1/checkout/sessions/${input.id}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CARTFLOX_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as GetCheckoutSessionStatusResponse;
}

/*
Usage example:

const status = await getCheckoutSessionStatus({ id: "cmf3k2p1x0001abcd9e8f7g6h" });
if (status.paid && status.livemode) {
  // Payment confirmed by the aggregator: deliver the order.
}
*/
