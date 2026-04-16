/**
 * @provider NimbaSMS
 * @capability webhook_sms_status
 * @atss 1.0
 * @capability_type webhook
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");

interface WebhookMetadata {
  message_type: "API";
}

interface SmsStatusWebhookPayload {
  messageid: string;
  status: "received" | "failed";
  contact: string;
  metadata: WebhookMetadata;
}

interface WebhookAck {
  status: "OK";
}

export async function handleSmsStatusWebhook(
  payload: SmsStatusWebhookPayload
): Promise<WebhookAck> {
  // Valider que le message existe dans votre système
  // avant tout traitement (NimbaSMS ne signe pas les requêtes)
  const { messageid, status, contact } = payload;

  // Traitement asynchrone recommandé — retourner 200 immédiatement
  // pour éviter un retry de NimbaSMS (max 3 tentatives)
  setImmediate(async () => {
    if (status === "received") {
      // Marquer la livraison confirmée pour ce contact
      console.log(`SMS ${messageid} livré à ${contact}`);
    } else if (status === "failed") {
      // Gérer l'échec de livraison
      console.log(`SMS ${messageid} en échec pour ${contact}`);
    }
  });

  return { status: "OK" };
}

/*
Usage example (Express.js handler):

import express from "express";
const app = express();
app.use(express.json());

app.post("/webhooks/sms-status", async (req, res) => {
  // Retourner 200 immédiatement — NimbaSMS retry jusqu'à 3x si pas de 200
  res.json({ status: "OK" });

  const payload = req.body as SmsStatusWebhookPayload;

  // Valider que le messageid est connu
  const message = await db.messages.findOne({ messageid: payload.messageid });
  if (!message) return; // requête frauduleuse ou doublon

  if (payload.status === "received") {
    await db.messages.updateDeliveryStatus(payload.messageid, payload.contact, "delivered");
  } else {
    await db.messages.updateDeliveryStatus(payload.messageid, payload.contact, "failed");
  }
});

// Configuration : dashboard NimbaSMS > API KEYS > Webhooks
// Entrer l'URL de votre endpoint (ex: https://votre-app.com/webhooks/sms-status)
// Un seul webhook URL par compte
// NimbaSMS envoie un événement par destinataire (contact)
*/
