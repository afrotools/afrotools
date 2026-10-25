/**
 * @provider Flutterwave
 * @capability webhook_event
 * @atss 1.0
 * @capability_type webhook
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET; // the secret hash set in Dashboard → Webhooks
if (!FLUTTERWAVE_WEBHOOK_SECRET) throw new Error("Missing env: FLUTTERWAVE_WEBHOOK_SECRET");

export type FlutterwaveWebhook =
  | {
      type: "charge.completed";
      webhook_id?: string;
      id?: string; // the webhooks page sample uses `id` instead of `webhook_id`
      timestamp: number; // epoch milliseconds
      data: {
        id: string; // chg_…
        amount: number;
        currency: string;
        reference: string;
        status: "succeeded" | "pending" | "failed" | "voided";
        customer: { id: string; email: string };
        payment_method: { id: string; type: string };
        processor_response?: { type: string; code: string };
        created_datetime: string | number;
      };
    }
  | {
      type: "refund.completed";
      webhook_id?: string;
      id?: string;
      timestamp: number;
      data: { id: string; charge_id: string; amount_refunded: number; status: string };
    }
  | {
      type: "transfer.disburse" | "transfer.reversal";
      webhook_id?: string;
      id?: string;
      timestamp: number;
      data: {
        id: string; // trf_…
        reference?: string;
        status: "SUCCESSFUL" | "FAILED"; // uppercase, unlike charges
        source_currency: string;
        destination_currency: string;
        amount: number;
        provider_response?: { type: string; code: string; message?: string };
        reversal?: { reversal_datetime: string; initial_status: string; reconciliation_status: string } | null;
      };
    };

/** HMAC-SHA256 of the raw body with the secret hash, base64 — compared in constant time. */
export function verifySignature(rawBody: string | Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha256", FLUTTERWAVE_WEBHOOK_SECRET!).update(rawBody).digest("base64"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

const processed = new Set<string>(); // in-memory for the example: use your database in production

/** Dedupe key: Flutterwave may deliver the same event more than once. */
export function eventKey(event: FlutterwaveWebhook): string {
  return `${event.type}:${event.data.id}:${event.data.status}`;
}

/** Call once the work for an event has succeeded, so a redelivery of a failed attempt is still processed. */
export function markProcessed(event: FlutterwaveWebhook): void {
  processed.add(eventKey(event));
}

/** Returns the HTTP status to send back and, when there is work to do, the event. Respond within 60 s. */
export function handleWebhook(rawBody: string, signature: string | undefined): { status: number; event?: FlutterwaveWebhook } {
  if (!verifySignature(rawBody, signature)) return { status: 401 };
  const event = JSON.parse(rawBody) as FlutterwaveWebhook;
  if (processed.has(eventKey(event))) return { status: 200 };
  // Never fulfil from the payload alone: re-fetch with get_charge / get_transfer / get_refund and compare
  // status, amount, currency and reference with your records, then markProcessed(event).
  return { status: 200, event };
}

/*
Usage (Express — keep the raw body for the HMAC; exempt the route from CSRF):
  app.post("/webhooks/flutterwave", express.raw({ type: "application/json" }), (req, res) => {
    const result = handleWebhook(req.body.toString("utf8"), req.header("flutterwave-signature"));
    res.sendStatus(result.status); // exactly 200 to acknowledge
    if (result.event) queue.push(result.event);
  });
*/
