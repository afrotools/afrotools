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
  // The amount comes straight from the UNSIGNED webhook and is NOT confirmed by
  // /v2/status (which returns no amount field). Never fulfill based on this value —
  // reconcile against the amount you stored at initiate_payment time, keyed by
  // identifier. Kept here only for logging / comparison.
  untrustedAmount: number;
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
    untrustedAmount: payload.amount,
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
      // The webhook is unsigned and /v2/status returns no amount, so
      // verify the AMOUNT against what you stored when you called initiate_payment.
      const order = await getOrderByIdentifier(payment.identifier);
      if (order && order.amount === payment.untrustedAmount) {
        await fulfillOrder(payment.identifier, payment);
      } else {
        console.warn("Amount mismatch — refusing to fulfill:", payment.identifier);
      }
    }
  } catch (err) {
    console.error("PayGate webhook handler failed:", err);
  }
});

// PayGate webhooks are NOT cryptographically signed — handlePayGateWebhook always
// re-verifies via /v2/status before treating a payment as completed.
// That confirms the payment SUCCEEDED but NOT the amount (no amount field in the
// status response), so always reconcile payment.untrustedAmount against your
// stored order amount before fulfilling.
*/
