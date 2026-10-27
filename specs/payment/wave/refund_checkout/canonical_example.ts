/**
 * @provider Wave
 * @capability refund_checkout
 * @atss 1.1
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

  // HTTP 200 with an empty body — no return value
}

/*
Usage example :

await refundCheckout("cos-abc123");
// The amount is credited back to the payer's Wave account.

// This endpoint is idempotent — calling it twice does not create a double refund.
// Useful for retries on a network timeout.

// Only sessions with payment_status === 'succeeded' can be refunded.
// Check the status via verify_payment before calling refundCheckout if needed.
*/
