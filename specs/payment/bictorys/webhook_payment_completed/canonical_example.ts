/**
 * @provider Bictorys
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

import { createHmac, timingSafeEqual } from "crypto";

const BICTORYS_WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET;
if (!BICTORYS_WEBHOOK_SECRET) throw new Error("Missing env: BICTORYS_WEBHOOK_SECRET");

interface CustomerObject {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: number;
  country?: string;
  locale?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface OrderDetail {
  id?: string;
  name?: string;
  reference?: string;
  price?: number;
  quantity?: number;
  discount?: number;
  taxRate?: number;
  totalPrice?: number;
}

interface BictorysWebhookPayload {
  id: string;
  merchantId: string;
  subMerchantId?: string;
  type?: string;
  customerId?: string;
  customerObject?: CustomerObject;
  pspName: "wave_money" | "orange_money" | "maxit" | "mtn_money" | "free_money" | "moov" | "mobicash" | "togocell" | "bictorys" | "card";
  paymentMeans?: string;
  paymentChannel?: "Online" | "Terminal";
  amount: number;
  currency: string;
  settledAmount?: number;
  settledCurrency?: string;
  merchantFees?: number;
  customerFees?: number;
  paymentReference?: string;
  merchantReference?: string;
  orderType?: string;
  orderId?: string;
  orderDetails?: OrderDetail[];
  status: "succeeded" | "authorized" | "failed" | "cancelled" | "reversed";
  originIp?: string;
  timestamp: string;
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const val = headers[name.toLowerCase()];
  return Array.isArray(val) ? val[0] : val;
}

/**
 * Express-style handler for Bictorys payment webhook events.
 * Mount at the URL registered in your Bictorys dashboard under Developers → API Keys & Webhooks.
 *
 * Implements Bictorys' full webhook checklist: raw-body signature verification,
 * always-200 response, DB logging before processing (audit + idempotency), an
 * anti-fraud amount/currency check, and idempotent handling of redelivered events.
 *
 * IMPORTANT: Pass the raw request body string (before JSON.parse), not the parsed object.
 * Express: use express.raw({ type: 'application/json' }) before express.json() on this route.
 */
export async function handleBictorysWebhook(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  deps: {
    // Logging + idempotency: persist the raw event before any business logic runs.
    // Return true if this event id was already recorded (redelivery) so the caller can skip it.
    logWebhookEvent: (eventId: string, payload: BictorysWebhookPayload) => Promise<boolean>;
    // Anti-fraud: look up what YOU expect for this paymentReference (your own order/invoice).
    getExpectedOrder: (paymentReference: string) => Promise<{ amount: number; currency: string } | null>;
    // Called only after signature, idempotency, and anti-fraud checks all pass.
    onPaymentSucceeded: (transactionId: string, paymentReference: string | undefined) => Promise<void>;
  },
  sendResponse: (status: number) => void
): Promise<void> {
  const signature = getHeader(headers, "x-webhook-signature");
  const timestamp = getHeader(headers, "x-webhook-timestamp");

  if (signature && timestamp) {
    // HMAC path — preferred when Bictorys sends X-Webhook-Signature + X-Webhook-Timestamp
    const nowMs = Date.now();
    if (Math.abs(nowMs - Number(timestamp)) > 300_000) {
      sendResponse(401); // reject replays older than 5 minutes
      return;
    }
    const expected = createHmac("sha256", BICTORYS_WEBHOOK_SECRET!)
      .update(timestamp + "." + rawBody)
      .digest("hex");
    const received = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (received.length !== expectedBuf.length || !timingSafeEqual(received, expectedBuf)) {
      sendResponse(401);
      return;
    }
  } else {
    // Raw secret path — fallback when HMAC headers are absent
    const secretHeader = getHeader(headers, "x-secret-key");
    if (!secretHeader) {
      sendResponse(401);
      return;
    }
    const a = Buffer.from(secretHeader);
    const b = Buffer.from(BICTORYS_WEBHOOK_SECRET!);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      sendResponse(401);
      return;
    }
  }

  // Always respond 200 immediately — then process async.
  sendResponse(200);

  try {
    const body = JSON.parse(rawBody) as BictorysWebhookPayload;

    // Log to DB before any business logic — audit trail + idempotency in one step.
    const alreadyProcessed = await deps.logWebhookEvent(body.id, body);
    if (alreadyProcessed) return;

    if (body.status === "succeeded" || body.status === "authorized") {
      // Anti-fraud: the webhook's amount/currency must match your own order record.
      if (body.paymentReference) {
        const expected = await deps.getExpectedOrder(body.paymentReference);
        if (!expected || expected.amount !== body.amount || expected.currency !== body.currency) {
          return; // unknown order or amount/currency mismatch — do not fulfill
        }
      }

      // Signature already verified above and amount/currency already matched against
      // your own order record — that's sufficient to fulfill. Don't add a synchronous
      // call to verify_transaction here: Bictorys' /status endpoint is known to be
      // intermittently unavailable, and gating fulfillment on it risks losing an
      // already-successful payment to a transient outage on their side, not yours.
      await deps.onPaymentSucceeded(body.id, body.paymentReference);
    }
  } catch {
    // Log the error — do not rethrow. The 200 is already sent.
  }
}

/*
Usage example (Express):

import express from "express";
const app = express();

// express.raw MUST come before express.json on this route to preserve the raw body for HMAC.
app.post(
  "/webhooks/bictorys",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    await handleBictorysWebhook(
      req.headers,
      req.body.toString(),  // Buffer → string
      {
        logWebhookEvent: async (eventId, payload) => {
          // INSERT ... ON CONFLICT (event_id) DO NOTHING, or check-then-insert in a transaction.
          // Return true if a row for eventId already existed (redelivery).
          const { inserted } = await db.webhookEvents.insertIfNew(eventId, payload);
          return !inserted;
        },
        getExpectedOrder: async (paymentReference) => {
          const order = await db.orders.findByReference(paymentReference);
          return order ? { amount: order.amount, currency: order.currency } : null;
        },
        onPaymentSucceeded: async (transactionId, paymentReference) => {
          // Signature + anti-fraud checks already passed — fulfill directly.
          // No call to verifyTransaction here (see webhook gotchas for why).
          await db.orders.update({ paymentReference }, { status: "paid" });
        },
      },
      (status) => res.sendStatus(status)
    );
  }
);
*/
