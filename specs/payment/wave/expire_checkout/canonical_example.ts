/**
 * @provider Wave
 * @capability expire_checkout
 * @atss 1.1
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

  // HTTP 200 with an empty body — no return value
}

/*
Usage example :

// Typical use case: the user cancels their order before paying
await expireCheckout("cos-abc123");

// Warning: returns HTTP 409 if the session is already completed or expired.
// Check the status via verify_payment if you are not sure of the current status.
try {
  await expireCheckout("cos-abc123");
} catch (err) {
  // 409 = already completed or expired — ignore silently if expected
  if (!(err instanceof Error) || !err.message.includes("409")) throw err;
}
*/
