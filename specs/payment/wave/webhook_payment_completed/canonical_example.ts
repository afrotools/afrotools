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
  // Pendant une rotation de secret, Wave envoie plusieurs valeurs v1= dans le même header.
  // Utiliser un tableau pour toutes les capturer — ne pas écraser avec un simple map.
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

  // Rejeter les requêtes de plus de 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const payload = timestamp + rawBody;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expBuf = Buffer.from(expected);

  // Vérifier si l'une des signatures correspond (cas multi-signatures lors d'une rotation)
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig);
    // timingSafeEqual throws si longueurs différentes — vérifier d'abord
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  });
}

/**
 * Wave propose deux modes, choisis à l'enregistrement du webhook :
 * - Signing Secret (recommandé) : en-tête Wave-Signature, vérifié par HMAC ;
 * - Shared Secret : le secret en clair dans Authorization: Bearer <secret>.
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
 * Express-style webhook handler pour checkout.session.completed.
 * Monter à l'URL configurée dans le Wave Business Portal.
 *
 * Wave ne retente que les livraisons sans réponse 2xx (pendant 3 jours, timeout 5 s) : l'événement est donc
 * enregistré AVANT de répondre 200. Une fois le 200 envoyé, Wave ne retentera plus.
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
    // Persister avant de répondre : c'est ce qui permet le rattrapage si la suite échoue
    await recordEvent(payload);
  } catch {
    sendResponse(500); // Wave retentera la livraison
    return;
  }

  // Répondre 2xx immédiatement, traiter ensuite
  sendResponse(200);

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
  } catch (error) {
    // Wave ne retentera PAS : le 200 est déjà envoyé. La commande reste en attente dans votre stockage (recordEvent) ;
    // une tâche de rattrapage doit la reprendre via verify_payment (ou search_checkouts par client_reference).
    console.error(`Wave webhook ${eventId}: vérification de ${sessionId} échouée`, error);
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
    { signature: req.get("Wave-Signature"), authorization: req.get("Authorization") },
    // Enregistrer l'événement (id + data.id) : une erreur ici renvoie 500 et Wave retentera
    async (event) => {
      await db.waveEvents.upsert({ id: event.id }, { session_id: event.data.id, received_at: new Date() });
    },
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
// La vérification se fait via Wave-Signature (Signing Secret) ou Authorization (Shared Secret).
*/
