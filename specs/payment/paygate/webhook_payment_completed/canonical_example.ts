/**
 * @provider PayGate
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

const PAYGATE_AUTH_TOKEN = process.env.PAYGATE_AUTH_TOKEN;
if (!PAYGATE_AUTH_TOKEN) throw new Error("Missing env: PAYGATE_AUTH_TOKEN");

const PAYGATE_BASE_URL = "https://paygateglobal.com/api";

type PayGatePaymentMethod = "FLOOZ" | "T-Money";

interface PayGateWebhookPayload {
  tx_reference: string;
  identifier: string;
  payment_reference: string;
  amount: number;
  datetime: string;
  payment_method: PayGatePaymentMethod;
  phone_number: string;
}

interface VerifiedPayment {
  identifier: string;
  tx_reference: string;
  payment_reference: string;
  amount: number;
  payment_method: PayGatePaymentMethod;
  datetime: string;
}

async function verifyAgainstApi(identifier: string): Promise<{
  status: number;
  payment_reference?: string;
  tx_reference?: string;
  payment_method?: PayGatePaymentMethod;
  datetime?: string;
}> {
  const response = await fetch(`${PAYGATE_BASE_URL}/v2/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: PAYGATE_AUTH_TOKEN,
      identifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`PayGate /v2/status HTTP error: ${response.status}`);
  }

  return response.json() as Promise<{
    status: number;
    payment_reference?: string;
    tx_reference?: string;
    payment_method?: PayGatePaymentMethod;
    datetime?: string;
  }>;
}

export async function handlePayGateWebhook(
  rawBody: string
): Promise<VerifiedPayment | null> {
  let payload: PayGateWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PayGateWebhookPayload;
  } catch {
    throw new Error("Invalid PayGate webhook payload — not JSON");
  }

  if (!payload.identifier) {
    throw new Error("Missing identifier in PayGate webhook payload");
  }

  const verified = await verifyAgainstApi(payload.identifier);

  if (verified.status !== 0) {
    return null;
  }

  return {
    identifier: payload.identifier,
    tx_reference: String(verified.tx_reference ?? payload.tx_reference),
    payment_reference: String(verified.payment_reference ?? payload.payment_reference),
    amount: payload.amount,
    payment_method: verified.payment_method ?? payload.payment_method,
    datetime: verified.datetime ?? payload.datetime,
  };
}

/*
Usage example (Express-style handler):

app.post("/webhooks/paygate", express.text({ type: "*\/*" }), async (req, res) => {
  res.sendStatus(200); // Always 200 first — process asynchronously
  try {
    const payment = await handlePayGateWebhook(req.body as string);
    if (payment) {
      // payment.status was verified server-side as paid — safe to fulfill the order
      await fulfillOrder(payment.identifier, payment);
    }
  } catch (err) {
    console.error("PayGate webhook handler failed:", err);
  }
});

// Always re-verify with check_payment_status before fulfilling — PayGate webhooks
// are NOT cryptographically signed, so the payload alone is not proof of payment.
*/
