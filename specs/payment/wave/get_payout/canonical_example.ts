/**
 * @provider Wave
 * @capability get_payout
 * @atss 1.0
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface PayoutResponse {
  id: string;
  status: "processing" | "succeeded" | "failed" | "reversed";
  currency: string;
  receive_amount: string;
  fee: string;
  mobile: string;
  name?: string;
  national_id?: string;
  client_reference?: string;
  payment_reason?: string;
  aggregated_merchant_id?: string;
  timestamp: string;
  payout_error?: { error_code: string; error_message?: string };
}

interface WaveError {
  code: string;
  message: string;
}

export async function getPayout(payoutId: string): Promise<PayoutResponse> {
  const response = await fetch(
    `https://api.wave.com/v1/payout/${payoutId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<PayoutResponse>;
}

/*
Usage example — polling d'un payout en status 'processing' :

async function waitForPayout(payoutId: string, maxAttempts = 10): Promise<PayoutResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const payout = await getPayout(payoutId);

    if (payout.status === "succeeded" || payout.status === "failed" || payout.status === "reversed") {
      return payout;
    }

    // Attendre avant de re-interroger (backoff simple)
    await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
  }

  throw new Error(`Payout ${payoutId} toujours en 'processing' après ${maxAttempts} tentatives`);
}

const payout = await waitForPayout("payout-abc123");
if (payout.status === "succeeded") {
  await db.payouts.update({ id: payout.id }, { status: "succeeded" });
} else if (payout.status === "failed") {
  console.error("Payout échoué :", payout.payout_error?.error_code);
}
*/
