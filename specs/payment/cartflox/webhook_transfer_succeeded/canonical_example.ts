/**
 * @provider Cartflox
 * @capability webhook_transfer_succeeded
 * @atss 1.0
 * @capability_type webhook
 */

import { createHmac, timingSafeEqual } from "crypto";

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");
// Test events (livemode: false) are signed with the test secret key. Set CARTFLOX_TEST_SECRET_KEY on every endpoint
// that receives them (the production one too when no test webhook URL is set); unset, CARTFLOX_SECRET_KEY is used.
const CARTFLOX_TEST_SECRET_KEY = process.env.CARTFLOX_TEST_SECRET_KEY;

const TOLERANCE_SECONDS = 300; // reject when |now - ts| exceeds 5 minutes

export type WebhookTransferSucceededPayload = {
  event: "transfer.succeeded" | "transfer.failed";
  livemode: boolean;
  data: {
    id: string;
    reference: string;
    status: "pending" | "processing" | "succeeded" | "failed";
    amount: number;
    currency: string;
    fee: number;
    country: string;
    operator: string;
    provider_operator?: string | null;
    phone: string;
    recipient_name?: string | null;
    description?: string | null;
    provider?: string | null;
    provider_reference?: string | null;
    failure?: {
      code: string | null;
      message: string | null;
    } | null;
    idempotency_key?: string | null;
    livemode: boolean;
    created: string;
    completed?: string | null;
  };
  timestamp: string;
};

/**
 * X-Afriflow-Signature is `t=<ts>,v1=<hex>`, v1 = HMAC-SHA256 hex of `<ts>.<raw body>` keyed with the secret key,
 * <ts> being the X-Afriflow-Timestamp header. rawBody must be the body exactly as received, never re-serialized JSON.
 */
export function verifyCartfloxSignature(
  rawBody: string,
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
  nowSeconds: number = Date.now() / 1000,
): boolean {
  const v1 = (signatureHeader ?? "").split(",").find((part) => part.startsWith("v1="))?.slice(3);
  const ts = Number(timestampHeader);
  if (!timestampHeader || !v1 || !Number.isFinite(ts)) return false;
  if (Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;
  // Pick the key of the event's mode; a valid signature then also proves livemode was not altered.
  let livemode: unknown;
  try {
    livemode = (JSON.parse(rawBody) as { livemode?: unknown }).livemode;
  } catch {
    return false;
  }
  const secret = livemode === false ? (CARTFLOX_TEST_SECRET_KEY ?? CARTFLOX_SECRET_KEY!) : CARTFLOX_SECRET_KEY!;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestampHeader}.${rawBody}`).digest("hex"));
  const received = Buffer.from(v1);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/*
Usage example (Express): keep the body raw, answer 2xx within 10 seconds, process afterwards.

app.post("/webhooks/cartflox", express.raw({ type: "application/json" }), (req, res) => {
  const rawBody = req.body.toString("utf8");
  const headers = req.headers as Record<string, string | undefined>;
  if (!verifyCartfloxSignature(rawBody, headers["x-afriflow-timestamp"], headers["x-afriflow-signature"])) {
    return res.status(400).send("invalid signature");
  }
  res.sendStatus(200);
  const event = JSON.parse(rawBody) as WebhookTransferSucceededPayload;
  if (event.event === "transfer.succeeded") {
    // Deduplicate on headers["x-afriflow-delivery"] (identical on every retry) before acting on event.data.
  }
});
*/
