/**
 * @provider SasPay
 * @capability webhook_payment_completed
 * @atss 1.1
 * @capability_type webhook
 */
// Written from SasPay's webhook documentation (signature, tolerance, envelope). Not executed against the live API.

import { createHmac, timingSafeEqual } from "crypto";

const SASPAY_WEBHOOK_SECRET = process.env.SASPAY_WEBHOOK_SECRET;
if (!SASPAY_WEBHOOK_SECRET) throw new Error("Missing env: SASPAY_WEBHOOK_SECRET");

const TOLERANCE_SECONDS = 300;

type SaspayEvent =
  | "transaction.created" | "transaction.success" | "transaction.failed" | "transaction.cancelled"
  | "settlement.requested" | "settlement.approved" | "settlement.success" | "settlement.failed" | "settlement.cancelled"
  | "wallet_transfer.requested" | "wallet_transfer.completed" | "wallet_transfer.rejected"
  | "webhook.test";

interface SaspayTransactionData {
  id: string;
  reference?: string;
  type?: string;
  status?: string;
  amount?: string;
  fee?: string;
  charged?: string;
  net_amount?: string;
  fee_charge_mode?: "ADD_ON" | "DEDUCTED";
  currency?: string;
  country?: string;
  network?: string;
  msisdn?: string;
}

interface SaspayWebhookPayload {
  event: SaspayEvent;
  data: SaspayTransactionData;
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

/** Checks the timestamp tolerance, then the HMAC over `${timestamp}.${rawBody}`, in constant time. */
export function isValidSaspayWebhook(rawBody: string, signature: string, timestamp: string, secret: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(Number(timestamp)) || Math.abs(now - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Handler for SasPay webhook deliveries. Pass the RAW request body (before JSON.parse):
 * with Express, mount express.raw({ type: "application/json" }) on this route.
 * Answer 2xx quickly (15s timeout per attempt) and keep processing idempotent on data.id.
 */
export async function handleSaspayWebhook(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  deps: {
    // Returns true if this transaction id was already processed (a retried delivery).
    alreadyProcessed: (transactionId: string, event: SaspayEvent) => Promise<boolean>;
    onPaymentSucceeded: (data: SaspayTransactionData) => Promise<void>;
  }
): Promise<{ status: number }> {
  const signature = getHeader(headers, "X-Webhook-Signature") ?? "";
  const timestamp = getHeader(headers, "X-Webhook-Timestamp") ?? "";
  if (!isValidSaspayWebhook(rawBody, signature, timestamp, SASPAY_WEBHOOK_SECRET!)) return { status: 403 };

  const payload = JSON.parse(rawBody) as SaspayWebhookPayload;
  if (payload.event !== "transaction.success") return { status: 200 };
  if (await deps.alreadyProcessed(payload.data.id, payload.event)) return { status: 200 };

  // Accounting: data.charged (paid by the customer) and data.net_amount (received), never data.amount alone.
  await deps.onPaymentSucceeded(payload.data);
  return { status: 200 };
}

/*
Usage example (Express):

app.post("/webhooks/saspay", express.raw({ type: "application/json" }), async (req, res) => {
  const { status } = await handleSaspayWebhook(req.headers, req.body.toString("utf8"), {
    alreadyProcessed: (id, event) => db.webhookEvents.existsOrInsert(id, event),
    onPaymentSucceeded: (data) => orders.markPaid(data.reference, data.net_amount),
  });
  res.sendStatus(status);
});
*/
