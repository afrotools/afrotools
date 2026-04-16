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
}

interface SendMessageResponse {
  id: string;
  status: string;
  to: string[];
  message: string;
  sender_name: string;
  sent_at: string;
  message_cost: number;
}

interface NimbaSMSError {
  detail: string;
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
    throw new Error(`NimbaSMS error ${response.status}: ${error.detail}`);
  }

  return response.json() as Promise<SendMessageResponse>;
}

/*
Usage example:

const message = await sendMessage({
  to: ["622XXXXXX", "628XXXXXX"], // format local sans indicatif pays ni '+' (Guinée: 6XXXXXXXX)
  message: "Votre commande #123 a été confirmée.",
  sender_name: "MonApp", // doit correspondre exactement à un sender name approuvé (case-sensitive)
});

console.log(`Message envoyé : ${message.id} (statut: ${message.status})`);
console.log(`SMS consommés : ${message.message_cost}`); // longueur message × nombre destinataires

// Vérifier le statut de livraison avec get_message après quelques secondes
// sender_name est case-sensitive — utiliser list_sendernames pour récupérer la valeur exacte
// ATTENTION : send_message utilise le format local (6XXXXXXXX), pas E.164 (+224XXXXXXXX)
// send_verification utilise E.164 avec '+' — formats différents selon l'endpoint
*/
