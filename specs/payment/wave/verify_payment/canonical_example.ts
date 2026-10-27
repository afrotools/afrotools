/**
 * @provider Wave
 * @capability verify_payment
 * @atss 1.1
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface CheckoutSession {
  id: string;
  checkout_status: "open" | "complete" | "expired";
  payment_status: "processing" | "cancelled" | "succeeded";
  amount: string;
  currency: string;
  transaction_id?: string;
  client_reference?: string;
  business_name: string;
  when_created: string;
  when_expires: string;
  when_completed?: string;
  last_payment_error?: { code: string; message: string };
}

interface WaveError {
  code: string;
  message: string;
}

export async function verifyPayment(sessionId: string): Promise<CheckoutSession> {
  const response = await fetch(
    `https://api.wave.com/v1/checkout/sessions/${sessionId}`,
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

  return response.json() as Promise<CheckoutSession>;
}

export function isPaymentSucceeded(session: CheckoutSession): boolean {
  return (
    session.checkout_status === "complete" &&
    session.payment_status === "succeeded"
  );
}

/*
Usage example (success_url handler or webhook fallback):

const session = await verifyPayment("cos-abc123");

if (isPaymentSucceeded(session)) {
  // Confirm the order
  await db.orders.update(
    { wave_session_id: session.id },
    { status: "paid", transaction_id: session.transaction_id }
  );
} else {
  // checkout_status can be 'open' (not paid yet) or 'expired'
  // payment_status can be 'processing' (in progress) or 'cancelled'
  console.log("Paiement non complété :", session.checkout_status, session.payment_status);
}

// Always check BOTH fields:
// checkout_status === 'complete' AND payment_status === 'succeeded'
*/
