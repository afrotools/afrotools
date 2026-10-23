/**
 * @provider NimbaSMS
 * @capability get_balance
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface AccountResponse {
  sid: string;
  sms_balance: number;
  whatsapp_balance: number;
  webhook_url: string | null;
  balance: number; // deprecated — utiliser sms_balance
}

interface NimbaSMSError {
  detail: string;
}

export async function getBalance(): Promise<AccountResponse> {
  const response = await fetch("https://api.nimbasms.com/v1/accounts", {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const error: NimbaSMSError = await response.json();
    throw new Error(`NimbaSMS error ${response.status}: ${error.detail}`);
  }

  return response.json() as Promise<AccountResponse>;
}

/*
Usage example:

const account = await getBalance();

// Utiliser sms_balance — 'balance' est deprecated
console.log(`Solde SMS : ${account.sms_balance} SMS disponibles`);
console.log(`Solde WhatsApp : ${account.whatsapp_balance}`);

// Vérifier avant envoi groupé
if (account.sms_balance < 100) {
  throw new Error("Solde insuffisant pour l'envoi groupé");
}
*/
