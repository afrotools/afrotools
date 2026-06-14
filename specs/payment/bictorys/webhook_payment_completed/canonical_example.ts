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
  name?: string;
  email?: string;
  phone?: number;
  country?: string;
  locale?: string;
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
  orderDetails?: object[];
  status: "SUCCEEDED" | "AUTHORIZED" | "FAILED" | "CANCELLED" | "REVERSED" | "PENDING";
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
 * IMPORTANT: Pass the raw request body string (before JSON.parse), not the parsed object.
 * Express: use express.raw({ type: 'application/json' }) before express.json() on this route.
 */
export async function handleBictorysWebhook(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  onPaymentSucceeded: (transactionId: string, paymentReference: string | undefined) => Promise<void>,
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
    if (body.status === "SUCCEEDED") {
      // Never trust the webhook alone — verify server-side before fulfilling.
      // Call verifyTransaction(body.id) from verify_transaction spec and check status === "succeeded".
      await onPaymentSucceeded(body.id, body.paymentReference);
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
      async (transactionId, paymentReference) => {
        // Verify server-side before marking the order as paid:
        // const tx = await verifyTransaction(transactionId);
        // if (tx.status === "succeeded") { ... fulfill order ... }
        await db.orders.update({ paymentReference }, { status: "verifying" });
      },
      (status) => res.sendStatus(status)
    );
  }
);
*/
