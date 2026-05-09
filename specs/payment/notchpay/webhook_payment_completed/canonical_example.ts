/**
 * @provider Notch Pay
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

import { createHmac, timingSafeEqual } from "crypto";

const NOTCHPAY_WEBHOOK_SECRET = process.env.NOTCHPAY_WEBHOOK_SECRET;
if (!NOTCHPAY_WEBHOOK_SECRET)
  throw new Error("Missing env: NOTCHPAY_WEBHOOK_SECRET");

interface NotchPayTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer: string;
  created_at: string;
  completed_at: string;
}

interface NotchPayWebhookPayload {
  event: string;
  data: NotchPayTransaction;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const expected = createHmac("sha256", NOTCHPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export function handleWebhook(payload: NotchPayWebhookPayload): void {
  if (payload.event !== "payment.complete") return;

  const transaction = payload.data;
  // Persist the reference and trigger async order fulfillment.
  // Do NOT fulfill here — call verify_payment server-side first.
  console.log("Payment complete event received:", transaction.reference);
}

/*
Usage example (Express):

app.post("/webhooks/notchpay", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-notch-signature"] as string;
  const rawBody = req.body.toString();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  // Respond 200 immediately to prevent retries
  res.sendStatus(200);

  const payload: NotchPayWebhookPayload = JSON.parse(rawBody);

  if (payload.event === "payment.complete") {
    // Always verify server-side before fulfilling
    const verification = await verifyPayment(payload.data.reference);
    if (verification.transaction.status === "complete") {
      await fulfillOrder(payload.data.reference);
    }
  }
});
*/
