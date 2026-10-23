/**
 * @provider NimbaSMS
 * @capability send_message
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface SendMessageInput {
  to: string[];
  message: string;
  sender_name: string;
  channel?: "sms" | "whatsapp" | "email";
}

interface SendMessageResponse {
  messageid: string;
  message_cost: number;
  url: string;
}

interface NimbaSMSError {
  detail?: string;
  sender_name?: string;
  solde?: string;
  to?: string;
}

export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResponse> {
  const response = await fetch("https://api.nimbasms.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NimbaSMSError = await response.json();
    const msg = error.detail ?? error.sender_name ?? error.solde ?? error.to ?? "Unknown error";
    throw new Error(`NimbaSMS error ${response.status}: ${msg}`);
  }

  return response.json() as Promise<SendMessageResponse>;
}

/*
Usage example:

// Retourne HTTP 201 Created
const result = await sendMessage({
  to: ["623XXXXXX", "224623XXXXXX", "+224623XXXXXX"], // trois formats acceptés
  message: "Votre commande #123 a été confirmée.",
  sender_name: "MonApp", // case-sensitive, statut 'accepted' requis
});

console.log(`messageid : ${result.messageid}`);
console.log(`SMS consommés : ${result.message_cost}`);

// Utiliser result.messageid avec get_message pour suivre le statut par destinataire
// Maximum 30 destinataires par requête, message max 665 chars (5 SMS)
// sender_name doit avoir statut 'accepted' dans list_sendernames (pas 'pending' ni 'refused')
*/
