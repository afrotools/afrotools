/**
 * @provider Djomy
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

const DJOMY_CLIENT_SECRET = process.env.DJOMY_CLIENT_SECRET;
if (!DJOMY_CLIENT_SECRET) throw new Error("Missing env: DJOMY_CLIENT_SECRET");

type WebhookEventType =
  | "payment.created"
  | "payment.redirected"
  | "payment.cancelled"
  | "payment.pending"
  | "payment.timeout"
  | "payment.success"
  | "payment.failed"
  | "payment.refunded"
  | "payout.success"
  | "payout.failed";

// TransactionWebhookEventDto: data.payment in V2, the same fields directly in data in V1.
interface DjomyPayment {
  transactionId: string;
  status: "CREATED" | "AUTHORIZED" | "PENDING" | "SUCCESS" | "CAPTURED" | "FAILED";
  paidAmount: number; // « Montant payé par le client » — fees are taken from it
  receivedAmount: number;
  fees: number;
  currency: "GNF" | "FCFA" | "Dollar" | "Leones";
  merchantPaymentReference?: string; // the reference you sent in create_payment / create_payment_gateway
}

interface WebhookPayload {
  eventType: WebhookEventType;
  eventId: string;
  message: string;
  // V2 (default for new configurations): { payment } or { payout }. V1: the payment fields directly.
  data: { payment?: DjomyPayment; payout?: Record<string, unknown> } & Partial<DjomyPayment>;
  paymentLinkReference?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g)!, (b) => parseInt(b, 16));
}

// HMAC-SHA256 of the raw body with the clientSecret, sent as "v1:<hex>" (webhook.signature).
// Compared with crypto.subtle.verify — never with ===, which stops at the first differing byte.
// Computed on the raw bytes: decoding and re-encoding the body can change what was signed.
async function verifyWebhookSignature(rawBody: Uint8Array<ArrayBuffer>, header: string): Promise<boolean> {
  const signature = header.startsWith("v1:") ? hexToBytes(header.slice(3)) : null;
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(DJOMY_CLIENT_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, signature, rawBody);
}

/**
 * Handles a Djomy webhook: signature, redelivery, then the payment checked against your own
 * order. A signed webhook that matches the order is enough to fulfil it — no verify_payment call
 * here; keep verify_payment for the returnUrl redirect and for orders no webhook confirmed.
 *
 * Covers create_payment and create_payment_gateway payments (payment links: see open_questions).
 * Pass the raw request body bytes (before any decoding or JSON.parse): the signature is computed on them.
 */
export async function handleDjomyWebhook(
  rawBody: Uint8Array<ArrayBuffer>,
  signatureHeader: string | undefined,
  deps: {
    // Persist the raw event before any business logic (audit trail). Return true if this
    // eventId was already recorded (a redelivery), so it is not processed twice.
    logWebhookEvent: (eventId: string, payload: WebhookPayload) => Promise<boolean>;
    // What YOU expect for this reference: your own order record, or null if unknown.
    getExpectedOrder: (merchantPaymentReference: string) => Promise<{ amount: number; currency: string } | null>;
    // Fulfils the order once: the signature has no timestamp, so a captured webhook can be
    // replayed. An already-paid order with another transactionId is a second payment: alert.
    onPaymentSucceeded: (transactionId: string, merchantPaymentReference: string) => Promise<void>;
  },
  sendResponse: (status: number) => void
): Promise<void> {
  if (!signatureHeader || !(await verifyWebhookSignature(rawBody, signatureHeader))) {
    // Not seen passing on a real webhook yet (see open_questions): log the failure and report
    // it, never skip the check. Orders left unpaid are reconciled with verify_payment.
    console.error("Djomy webhook: invalid signature");
    sendResponse(400);
    return;
  }

  // Answer 200 quickly, then process.
  sendResponse(200);

  try {
    const payload = JSON.parse(new TextDecoder().decode(rawBody)) as WebhookPayload;
    if (await deps.logWebhookEvent(payload.eventId, payload)) return;

    // Only payment.success fulfils an order; other events are acknowledged.
    if (payload.eventType !== "payment.success") return;

    const payment = (payload.data.payment ?? payload.data) as DjomyPayment;
    const reference = payment.merchantPaymentReference;
    if (payment.status !== "SUCCESS" || !reference) {
      // CAPTURED, or no reference (a payment link?): see open_questions. Not fulfilled, reconcile it.
      console.error(`Djomy webhook: payment ${payment.transactionId} not fulfilled (status ${payment.status}, reference ${reference ?? "none"})`);
      return;
    }

    // Anti-fraud: the payment must be the one you expect for this order. currency is Djomy's
    // string (GNF, FCFA, Dollar, Leones): store the order's the same way, or map both alike.
    const expected = await deps.getExpectedOrder(reference);
    if (!expected || expected.amount !== payment.paidAmount || expected.currency !== payment.currency) {
      console.error(`Djomy webhook: payment ${payment.transactionId} does not match order ${reference}`);
      return; // unknown order or amount/currency mismatch — do not fulfil
    }

    await deps.onPaymentSucceeded(payment.transactionId, reference);
  } catch (err) {
    // The 200 is already sent: log for investigation.
    console.error("Djomy webhook processing failed:", err);
  }
}

/*
Usage example (Express):

import express from "express";
const app = express();

// express.raw keeps the raw body bytes the signature is computed on.
app.post("/webhooks/djomy", express.raw({ type: "application/json" }), async (req, res) => {
  await handleDjomyWebhook(
    new Uint8Array(req.body),
    req.headers["x-webhook-signature"] as string | undefined,
    {
      logWebhookEvent: async (eventId, payload) => {
        // INSERT ... ON CONFLICT (event_id) DO NOTHING; true if the row already existed.
        const { inserted } = await db.webhookEvents.insertIfNew(eventId, payload);
        return !inserted;
      },
      getExpectedOrder: async (reference) => {
        const order = await db.orders.findByReference(reference);
        return order ? { amount: order.amount, currency: order.currency } : null;
      },
      onPaymentSucceeded: async (transactionId, reference) => {
        // UPDATE ... WHERE status = 'pending': a replayed webhook changes nothing.
        const { updated, paidWith } = await db.orders.markPaidIfPending(reference, transactionId);
        if (!updated && paidWith !== transactionId) alertSecondPayment(reference, transactionId);
      },
    },
    (status) => res.sendStatus(status)
  );
});
*/
