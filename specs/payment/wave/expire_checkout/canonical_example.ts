/**
 * @provider Wave
 * @capability expire_checkout
 * @atss 1.0
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface WaveError {
  code: string;
  message: string;
}

export async function expireCheckout(sessionId: string): Promise<void> {
  const response = await fetch(
    `https://api.wave.com/v1/checkout/sessions/${sessionId}/expire`,
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

// Cas d'usage typique : l'utilisateur annule sa commande avant de payer
await expireCheckout("cos-abc123");

// Attention : retourne HTTP 409 si la session est déjà complétée ou expirée.
// Vérifier le statut via verify_payment si vous n'êtes pas sûr du statut courant.
try {
  await expireCheckout("cos-abc123");
} catch (err) {
  // 409 = déjà complétée ou expirée — ignorer silencieusement si c'est attendu
  if (!(err instanceof Error) || !err.message.includes("409")) throw err;
}
*/
