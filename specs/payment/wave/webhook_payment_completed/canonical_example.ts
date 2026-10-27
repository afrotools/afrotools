/**
 * @provider Wave
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

import { createHmac, timingSafeEqual } from "crypto";

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET;
if (!WAVE_WEBHOOK_SECRET) throw new Error("Missing env: WAVE_WEBHOOK_SECRET");

interface WaveCheckoutSessionData {
  id: string;
  checkout_status: "complete";
  payment_status: "succeeded";
  amount: string;
  currency: string;
  transaction_id: string;
  client_reference?: string;
  when_completed: string;
}

interface WaveWebhookPayload {
  id: string;
  type: "checkout.session.completed";
  data: WaveCheckoutSessionData;
}

interface CheckoutSession {
  id: string;
  checkout_status: "open" | "complete" | "expired";
  payment_status: "processing" | "cancelled" | "succeeded";
  amount: string;
  currency: string;
  transaction_id?: string;
  client_reference?: string;
}

interface WaveError {
  code: string;
  message: string;
}

function verifyWaveSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  // Format: "t=1234567890,v1=abc123..."
  // During a secret rotation, Wave sends several v1= values in the same header.
  // Use an array to capture all of them — do not overwrite with a simple map.
  let timestamp: string | undefined;
  const signatures: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx);
    const value = part.slice(eqIdx + 1);
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const payload = timestamp + rawBody;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expBuf = Buffer.from(expected);

  // Check whether one of the signatures matches (multi-signature case during a rotation)
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig);
    // timingSafeEqual throws if lengths differ — check first
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  });
}

/**
 * Wave offers two modes, chosen when the webhook is registered:
 * - Signing Secret (recommended): Wave-Signature header, verified by HMAC;
 * - Shared Secret: the secret in plain text in Authorization: Bearer <secret>.
 */
function authenticateWaveWebhook(
  rawBody: string,
  headers: { signature?: string; authorization?: string },
  secret: string
): boolean {
  if (headers.signature) return verifyWaveSignature(rawBody, headers.signature, secret);
  if (headers.authorization) {
    const expected = Buffer.from(`Bearer ${secret}`);
    const received = Buffer.from(headers.authorization);
    return received.length === expected.length && timingSafeEqual(received, expected);
  }
  return false;
}

async function verifyPaymentServerSide(sessionId: string): Promise<CheckoutSession> {
  const response = await fetch(
    `https://api.wave.com/v1/checkout/sessions/${sessionId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${WAVE_API_KEY}` },
    }
  );

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave verify error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<CheckoutSession>;
}

/**
 * Express-style webhook handler for checkout.session.completed.
 * Mount at the URL configured in the Wave Business Portal.
 *
 * Wave retries only deliveries without a 2xx response (for 3 days, 5 s timeout): the event is therefore
 * recorded BEFORE responding 200. Once the 200 is sent, Wave will not retry.
 */
export async function handleWaveWebhook(
  rawBody: string,
  headers: { signature?: string; authorization?: string },
  recordEvent: (payload: WaveWebhookPayload) => Promise<void>,
  fulfillOrder: (sessionId: string, clientReference: string | undefined, currency: string) => Promise<void>,
  sendResponse: (status: number) => void
): Promise<void> {
  if (!authenticateWaveWebhook(rawBody, headers, WAVE_WEBHOOK_SECRET!)) {
    sendResponse(401);
    return;
  }

  let payload: WaveWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WaveWebhookPayload;
  } catch {
    sendResponse(400);
    return;
  }

  try {
    // Persist before responding: this is what allows catch-up if the rest fails
    await recordEvent(payload);
  } catch {
    sendResponse(500); // Wave will retry the delivery
    return;
  }

  // Respond 2xx immediately, process afterwards
  sendResponse(200);

  if (payload.type !== "checkout.session.completed") return;

  const sessionId = payload.data.id;
  const eventId = payload.id;

  try {
    // Verify server-side — never trust the payload alone
    const session = await verifyPaymentServerSide(sessionId);

    if (
      session.checkout_status === "complete" &&
      session.payment_status === "succeeded"
    ) {
      // fulfillOrder must be idempotent via eventId or sessionId
      await fulfillOrder(session.id, session.client_reference, session.currency);
    }
  } catch (error) {
    // Wave will NOT retry: the 200 is already sent. The order stays pending in your storage (recordEvent);
    // a catch-up job must pick it up via verify_payment (or search_checkouts by client_reference).
    console.error(`Wave webhook ${eventId}: verification of ${sessionId} failed`, error);
  }
}

/*
Usage example (Express) :

import express from "express";
const app = express();

// IMPORTANT: use express.raw() — do not parse as JSON before signature verification
app.post("/api/wave/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  await handleWaveWebhook(
    req.body.toString(),
    { signature: req.get("Wave-Signature"), authorization: req.get("Authorization") },
    // Record the event (id + data.id): an error here returns 500 and Wave will retry
    async (event) => {
      await db.waveEvents.upsert({ id: event.id }, { session_id: event.data.id, received_at: new Date() });
    },
    async (sessionId, clientReference, currency) => {
      // Idempotency guard via the event id or the sessionId
      const already = await db.orders.findOne({ wave_session_id: sessionId, status: "paid" });
      if (already) return;

      await db.orders.update(
        { wave_session_id: sessionId },
        { status: "paid", currency }
      );
    },
    (status) => res.sendStatus(status)
  );
});

// Do not put authentication middleware on this route.
// Verification is done via Wave-Signature (Signing Secret) or Authorization (Shared Secret).
*/
