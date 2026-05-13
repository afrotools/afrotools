/**
 * @provider Flutterwave
 * @capability webhook_event
 * @atss 1.0
 * @capability_type webhook
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
if (!FLUTTERWAVE_WEBHOOK_SECRET) {
  throw new Error("Missing env: FLUTTERWAVE_WEBHOOK_SECRET");
}

// ── Event payload types ───────────────────────────────────────────────────────

interface ChargeCompletedData {
  id: string;
  status: "succeeded" | "pending" | "failed" | "voided";
  amount: number;
  currency: string;
  reference: string;
  customer_id: string;
  payment_method_id?: string;
  payment_method?: Record<string, unknown>;
  processor_response?: Record<string, unknown>;
  order_id?: string | null;
  meta?: Record<string, unknown> | null;
  created_datetime: string;
  updated_datetime?: string;
}

interface RefundCompletedData {
  id: string;
  charge_id: string;
  amount_refunded?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer" | "expired_uncaptured_charge";
  status: "pending" | "requires_action" | "succeeded" | "failed" | "cancelled" | "completed" | "new";
  meta?: Record<string, string> | null;
  created_datetime?: string;
}

interface TransferEventData {
  id: string;
  amount?: number;
  currency?: string;
  reference?: string;
  status: string;
  narration?: string;
  meta?: Record<string, unknown> | null;
  created_datetime?: string;
  [key: string]: unknown;
}

interface OrderAuthorizationData {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  reference?: string;
  customer_id?: string;
  meta?: Record<string, unknown> | null;
  created_datetime?: string;
  [key: string]: unknown;
}

// Flutterwave is inconsistent on the top-level id field:
// charge.completed → `id`, others → `webhook_id`. Both are included.
type EventBase = { timestamp: number; id?: string; webhook_id?: string };

export type FlutterwaveEvent =
  | (EventBase & { type: "charge.completed"; data: ChargeCompletedData })
  | (EventBase & { type: "refund.completed"; data: RefundCompletedData })
  | (EventBase & { type: "transfer.disburse"; data: TransferEventData })
  | (EventBase & { type: "transfer.reversal"; data: TransferEventData })
  | (EventBase & { type: "order.authorization"; data: OrderAuthorizationData });

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature of an incoming Flutterwave webhook and
 * return the parsed event. Throws if the signature is missing or invalid.
 *
 * IMPORTANT: pass the RAW request body (string or Buffer) — never re-serialised JSON.
 * Flutterwave signs with base64 digest, not hex.
 */
export function handleWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined
): FlutterwaveEvent {
  if (!signatureHeader) {
    throw new Error("Missing flutterwave-signature header");
  }

  // base64 digest — matches Flutterwave's signing method exactly.
  const expected = createHmac("sha256", FLUTTERWAVE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("base64");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");

  if (
    expectedBuf.length !== receivedBuf.length ||
    !timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    throw new Error("Invalid Flutterwave webhook signature");
  }

  return JSON.parse(rawBody) as FlutterwaveEvent;
}

/*
Usage example (Next.js App Router route handler):

// app/api/webhooks/flutterwave/route.ts
import { handleWebhook } from "./canonical_example";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("flutterwave-signature");

  let event;
  try {
    event = handleWebhook(rawBody, signature);
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  // Offload processing — respond 200 immediately.
  switch (event.type) {
    case "charge.completed":
      if (event.data.status === "succeeded") {
        // Always re-verify: await getCharge({ id: event.data.id })
        // Then fulfil the order, idempotently keyed on event.id
      }
      break;
    case "refund.completed":
      if (event.data.status === "succeeded" || event.data.status === "completed") {
        // await getRefund({ id: event.data.id })
        // Then mark the order as refunded, keyed on event.webhook_id
      }
      break;
    case "transfer.disburse":
    case "transfer.reversal":
      // await getTransfer({ id: event.data.id })
      break;
    case "order.authorization":
      // await getOrder({ id: event.data.id })
      break;
  }

  return new Response(null, { status: 200 });
}


Usage example (Express):

import express from "express";
import { handleWebhook } from "./canonical_example";

const app = express();

app.post(
  "/webhooks/flutterwave",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rawBody = (req.body as Buffer).toString("utf8");
    const signature = req.header("flutterwave-signature");
    let event;
    try {
      event = handleWebhook(rawBody, signature);
    } catch {
      return res.status(401).send("invalid signature");
    }
    // Respond 200 immediately, process asynchronously
    res.status(200).end();
    void event; // dispatch to your job queue
  }
);
*/
