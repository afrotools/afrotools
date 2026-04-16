/**
 * @provider NimbaSMS
 * @capability get_message
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface DeliveryStatus {
  id: string;
  contact: string;
  status: "tosend" | "sent" | "received" | "failure" | "not_available";
}

interface MessageResponse {
  messageid: string;
  sender_name: string;
  message: string;
  status: "pending" | "sent" | "failure";
  sent_at: number; // Unix timestamp en secondes
  message_cost: number;
  numbers: DeliveryStatus[];
}

interface NimbaSMSError {
  detail: string;
}

export async function getMessage(messageId: string): Promise<MessageResponse> {
  const endpoint = `https://api.nimbasms.com/v1/messages/${messageId}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const error: NimbaSMSError = await response.json();
    throw new Error(`NimbaSMS error ${response.status}: ${error.detail}`);
  }

  return response.json() as Promise<MessageResponse>;
}

/*
Usage example:

// messageId = messageid retourné par send_message
const message = await getMessage("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");

// sent_at est un Unix timestamp (secondes) — pas une date ISO
const sentDate = new Date(message.sent_at * 1000);
console.log(`Envoyé le : ${sentDate.toISOString()}`);

// Statut par destinataire dans numbers[]
for (const delivery of message.numbers) {
  console.log(`${delivery.contact}: ${delivery.status}`);
  // 'received' = livré, 'sent' = envoyé mais non confirmé, 'failure' = échec
}

// Le statut global 'sent' ne signifie pas que tous les destinataires ont reçu le SMS
// Inspecter numbers[] pour le statut individuel
*/
