/**
 * @provider Wave
 * @capability refund_checkout
 * @atss 1.0
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface WaveError {
  code: string;
  message: string;
}

export async function refundCheckout(sessionId: string): Promise<void> {
  const response = await fetch(
    `https://api.wave.com/v1/checkout/sessions/${sessionId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  // HTTP 200 avec corps vide — pas de valeur de retour
}

/*
Usage example :

await refundCheckout("cos-abc123");
// Le montant est recrédité sur le compte Wave du payeur.

// Cet endpoint est idempotent — appeler deux fois ne crée pas un double remboursement.
// Utile pour les retry en cas de timeout réseau.

// Seules les sessions avec payment_status === 'succeeded' peuvent être remboursées.
// Vérifier le statut via verify_payment avant d'appeler refundCheckout si nécessaire.
*/
