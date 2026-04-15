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
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key] = value;
  }

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  // Rejeter les requêtes de plus de 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const payload = timestamp + rawBody;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  // timingSafeEqual throws si les buffers n'ont pas la même longueur.
  // Vérifier d'abord la longueur pour éviter une exception sur signature malformée.
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return timingSafeEqual(sigBuf, expBuf);
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
 * Express-style webhook handler pour checkout.session.completed.
 * Monter à l'URL configurée dans le Wave Business Portal.
 */
export async function handleWaveWebhook(
  rawBody: string,
  signatureHeader: string,
  fulfillOrder: (sessionId: string, clientReference: string | undefined, currency: string) => Promise<void>,
  sendResponse: (status: number) => void
): Promise<void> {
  // Répondre 200 immédiatement — Wave retry 3 jours si pas de réponse dans 5s
  sendResponse(200);

  if (!verifyWaveSignature(rawBody, signatureHeader, WAVE_WEBHOOK_SECRET!)) {
    // Signature invalide — ignorer silencieusement (déjà répondu 200)
    return;
  }

  let payload: WaveWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WaveWebhookPayload;
  } catch {
    return;
  }

  if (payload.type !== "checkout.session.completed") return;

  const sessionId = payload.data.id;
  const eventId = payload.id;

  try {
    // Vérifier côté serveur — ne jamais se fier au payload seul
    const session = await verifyPaymentServerSide(sessionId);

    if (
      session.checkout_status === "complete" &&
      session.payment_status === "succeeded"
    ) {
      // fulfillOrder doit être idempotent via eventId ou sessionId
      await fulfillOrder(session.id, session.client_reference, session.currency);
    }
  } catch {
    // Logger l'erreur — ne pas rethrow (200 déjà envoyé)
    // Le webhook sera retenté par Wave
  }
}

/*
Usage example (Express) :

import express from "express";
const app = express();

// IMPORTANT: utiliser express.raw() — ne pas parser en JSON avant la vérification de signature
app.post("/api/wave/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  await handleWaveWebhook(
    req.body.toString(),
    req.headers["wave-signature"] as string ?? "",
    async (sessionId, clientReference, currency) => {
      // Guard idempotence via l'event id ou le sessionId
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

// Ne pas mettre de middleware d'authentification sur cette route.
// La vérification se fait via Wave-Signature.
*/
