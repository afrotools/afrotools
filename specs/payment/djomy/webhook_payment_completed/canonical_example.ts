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
  | "payment.pending"
  | "payment.success"
  | "payment.failed";

interface WebhookPayload {
  eventType: WebhookEventType;
  eventId: string;
  message: string;
  data: Record<string, unknown>;
  paymentLinkReference?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

async function computeHmacHex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string
): Promise<boolean> {
  const expectedSignature = await computeHmacHex(rawBody, DJOMY_CLIENT_SECRET!);
  return expectedSignature === receivedSignature;
}

export async function handleDjomyWebhook(
  rawBody: string,
  signatureHeader: string
): Promise<{ processed: boolean; eventType: WebhookEventType }> {
  const isValid = await verifyWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    throw new Error("Invalid webhook signature — request rejected");
  }

  const payload: WebhookPayload = JSON.parse(rawBody);

  // Only act on success events for order fulfillment.
  // For other event types, acknowledge and return without processing.
  if (payload.eventType === "payment.success") {
    // Extract transactionId from data and call verify_payment server-side
    // before fulfilling the order. Never trust the webhook payload alone.
    const transactionId = payload.data?.transactionId as string | undefined;
    if (transactionId) {
      // TODO: call verifyPayment(transactionId) and fulfill only if status === "SUCCESS"
      console.log(`Payment success event for transaction: ${transactionId}`);
    }
  }

  return { processed: true, eventType: payload.eventType };
}

/*
Usage example (Express.js):

import express from "express";
const app = express();

app.post("/webhooks/djomy", express.raw({ type: "application/json" }), async (req, res) => {
  // Return 200 immediately to acknowledge receipt
  res.status(200).send("OK");

  const signature = req.headers["x-webhook-signature"] as string;
  if (!signature) return;

  try {
    const rawBody = req.body.toString();
    const { eventType } = await handleDjomyWebhook(rawBody, signature);
    console.log(`Processed Djomy event: ${eventType}`);
  } catch (err) {
    console.error("Webhook processing failed:", err);
    // Don't re-throw — 200 already sent. Log for investigation.
  }
});

// Note: Always call verify_payment with the transactionId from the webhook
// data before fulfilling any order. The webhook is a trigger, not a proof.
*/
