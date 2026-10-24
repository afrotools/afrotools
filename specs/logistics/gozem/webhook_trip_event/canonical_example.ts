/**
 * @provider Gozem
 * @capability webhook_trip_event
 * @atss 1.0
 * @capability_type webhook
 */

import { createHmac, timingSafeEqual } from "crypto";

const GOZEM_WEBHOOK_SECRET = process.env.GOZEM_WEBHOOK_SECRET ?? "";
if (!GOZEM_WEBHOOK_SECRET) throw new Error("Missing env: GOZEM_WEBHOOK_SECRET");

export type GozemWebhookEvent = {
  guid?: string;
  account_guid?: string;
  event_type?: string; // e.g. courier.trip.completed — new types get added
  data?: Record<string, unknown>; // the resource the event is about; not documented further
  environment?: "sandbox" | "production";
};

/** HMAC SHA-256 (hex) of the raw request body with the webhook secret, compared in constant time. */
export function verifySignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
  const expected = Buffer.from(createHmac("sha256", GOZEM_WEBHOOK_SECRET).update(rawBody).digest("hex"));
  const received = Buffer.from(signatureHeader ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Handle one delivery. Returns the HTTP status to answer: 401 on a bad signature, 400 on a malformed payload, 500 when your
 * idempotency store fails (the one case where you want Gozem's retry), 200 otherwise — also for duplicates and unknown event
 * types. Answer before doing slow work: Gozem retries non-2xx deliveries and can disable the webhook.
 */
export async function handleGozemWebhook(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  isNewEvent: (guid: string) => Promise<boolean>, // your idempotency store: false if this guid was already recorded
  onEvent: (event: GozemWebhookEvent) => void,
): Promise<number> {
  if (!verifySignature(rawBody, signatureHeader)) return 401;

  let event: GozemWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString()) as GozemWebhookEvent;
  } catch {
    return 400;
  }
  if (typeof event.guid !== "string" || typeof event.event_type !== "string") return 400;

  try {
    if (!(await isNewEvent(event.guid))) return 200;
  } catch {
    return 500;
  }

  setImmediate(() => onEvent(event)); // acknowledge first, work after
  return 200;
}

/*
Usage example (Express, raw body on this route only):

app.post("/webhooks/gozem", express.raw({ type: "application/json" }), async (req, res) => {
  const status = await handleGozemWebhook(req.body, req.get("X-Webhook-Signature"), recordEvent, (event) => {
    switch (event.event_type) {
      case "courier.trip.completed":
      case "courier.trip.canceled":
      case "courier.trip.expired":
        // read the trip with getTrip() and update the order
        break;
      default:
        // ignore event types you don't handle
    }
  });
  res.sendStatus(status);
});
*/
