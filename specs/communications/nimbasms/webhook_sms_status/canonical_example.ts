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
  // Validate that the message exists in your system
  // before any processing (NimbaSMS does not sign requests)
  const { messageid, status, contact } = payload;

  // Asynchronous processing recommended — return 200 immediately
  // to avoid a retry from NimbaSMS (max 3 attempts)
  setImmediate(async () => {
    if (status === "received") {
      // Mark the delivery as confirmed for this contact
      console.log(`SMS ${messageid} livré à ${contact}`);
    } else if (status === "failed") {
      // Handle the delivery failure
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
  // Return 200 immediately — NimbaSMS retries up to 3x if no 200
  res.json({ status: "OK" });

  const payload = req.body as SmsStatusWebhookPayload;

  // Validate that the messageid is known
  const message = await db.messages.findOne({ messageid: payload.messageid });
  if (!message) return; // fraudulent request or duplicate

  if (payload.status === "received") {
    await db.messages.updateDeliveryStatus(payload.messageid, payload.contact, "delivered");
  } else {
    await db.messages.updateDeliveryStatus(payload.messageid, payload.contact, "failed");
  }
});

// Configuration: NimbaSMS dashboard > API KEYS > Webhooks
// Enter your endpoint URL (e.g. https://votre-app.com/webhooks/sms-status)
// Only one webhook URL per account
// NimbaSMS sends one event per recipient (contact)
*/
