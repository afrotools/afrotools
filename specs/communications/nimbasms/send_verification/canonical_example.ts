/**
 * @provider NimbaSMS
 * @capability send_verification
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface SendVerificationInput {
  to: string;
  sender_name: string; // obligatoire
  channel?: "sms" | "whatsapp" | "email";
  message?: string;
  expiry_time?: number | null;
  attempts?: number | null;
  code_length?: number;
}

interface SendVerificationResponse {
  verificationid: string;
  code: string;
  message_cost: number;
  url: string;
}

interface NimbaSMSError {
  detail?: string;
}

export async function sendVerification(
  input: SendVerificationInput
): Promise<SendVerificationResponse> {
  const response = await fetch("https://api.nimbasms.com/v1/verifications", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NimbaSMSError = await response.json();
    throw new Error(`NimbaSMS error ${response.status}: ${error.detail ?? JSON.stringify(error)}`);
  }

  return response.json() as Promise<SendVerificationResponse>;
}

/*
Usage example:

const verification = await sendVerification({
  to: "+224623XXXXXX",
  sender_name: "MonApp", // OBLIGATOIRE et case-sensitive (statut 'accepted')
  message: "Votre code de vérification est : <1234>", // <1234> obligatoire
  expiry_time: 10,  // 10 minutes (5-30)
  attempts: 3,      // 3 tentatives max (3-10)
  code_length: 6,   // code à 6 chiffres (4-8)
});

console.log(`verificationid : ${verification.verificationid}`);
// Stocker verificationid côté serveur pour appeler verify_code
// Ne jamais exposer verificationid côté client
// verification.code est retourné dans la réponse — uniquement pour les tests
*/
