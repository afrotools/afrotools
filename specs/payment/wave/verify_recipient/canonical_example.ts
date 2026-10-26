/**
 * @provider Wave
 * @capability verify_recipient
 * @atss 1.1
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface VerifyRecipientInput {
  mobile: string;
  name?: string;
  national_id?: string;
  amount?: string;
  currency?: string;
}

interface VerifyRecipientResponse {
  within_limits: boolean | null;
  name_match: "MATCH" | "NO_MATCH" | "NAME_NOT_KNOWN" | null;
  national_id_match: "MATCH" | "NO_MATCH" | "ID_NOT_KNOWN" | null;
}

interface WaveError {
  code: string;
  message: string;
}

export async function verifyRecipient(
  input: VerifyRecipientInput
): Promise<VerifyRecipientResponse> {
  const response = await fetch("https://api.wave.com/v1/verify_recipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<VerifyRecipientResponse>;
}

/*
Usage example :

const result = await verifyRecipient({
  mobile: "+221700000000",
  name: "Mamadou Diallo",
  amount: "50000",
  currency: "XOF",
});

// Vérifier la capacité à recevoir le montant
if (result.within_limits === false) {
  throw new Error("Le destinataire ne peut pas recevoir ce montant (limite dépassée)");
}

// Vérifier le nom
if (result.name_match === "NO_MATCH") {
  // Avertir l'utilisateur — ne pas bloquer automatiquement
  console.warn("Le nom fourni ne correspond pas au compte Wave");
}

// NAME_NOT_KNOWN = le destinataire n'est pas KYC-2 chez Wave
// Ce n'est pas une erreur — ne pas bloquer le payout sur cette base
if (result.name_match === "NAME_NOT_KNOWN") {
  console.log("Vérification du nom impossible : données KYC insuffisantes");
}

// ATTENTION : max 30 vérifications du même numéro par 5 minutes
// Au-delà, ce numéro est bloqué 60 minutes
*/
