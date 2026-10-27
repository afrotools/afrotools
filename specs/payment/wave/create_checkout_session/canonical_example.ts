/**
 * @provider Wave
 * @capability create_checkout_session
 * @atss 1.1
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface CreateCheckoutSessionInput {
  amount: string;
  currency: string;
  error_url: string;
  success_url: string;
  client_reference?: string;
  restrict_payer_mobile?: string;
  aggregated_merchant_id?: string;
}

interface CreateCheckoutSessionResponse {
  id: string;
  wave_launch_url: string;
  checkout_status: "open" | "complete" | "expired";
  payment_status: "processing" | "cancelled" | "succeeded";
  amount: string;
  currency: string;
  client_reference?: string;
  business_name: string;
  transaction_id?: string;
  success_url: string;
  error_url: string;
  restrict_payer_mobile?: string;
  aggregated_merchant_id?: string;
  when_created: string;
  when_expires: string;
  when_completed?: string;
  last_payment_error?: { code: string; message: string };
}

interface WaveError {
  code: string;
  message: string;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CreateCheckoutSessionResponse> {
  const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<CreateCheckoutSessionResponse>;
}

/*
Usage example:

const session = await createCheckoutSession({
  amount: "5000",        // string, not a number — XOF without decimals
  currency: "XOF",
  success_url: "https://myapp.com/payment/success",
  error_url: "https://myapp.com/payment/error",
  client_reference: "order_123",
});

// Store session.id in the database BEFORE redirecting.
// It is the only way to verify the payment server-side.
await db.orders.update({ id: "order_123" }, { wave_session_id: session.id });

// Redirect the user to Wave (native browser, no WebView)
// res.redirect(session.wave_launch_url);
*/
