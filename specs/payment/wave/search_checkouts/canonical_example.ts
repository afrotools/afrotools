/**
 * @provider Wave
 * @capability search_checkouts
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
  client_reference?: string;
  transaction_id?: string;
  when_created: string;
  when_expires: string;
  when_completed?: string;
}

interface SearchCheckoutsResponse {
  result: CheckoutSession[];
}

interface WaveError {
  code: string;
  message: string;
}

export async function searchCheckouts(
  clientReference: string
): Promise<CheckoutSession[]> {
  const url = new URL("https://api.wave.com/v1/checkout/sessions/search");
  url.searchParams.set("client_reference", clientReference);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${WAVE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  const data = (await response.json()) as SearchCheckoutsResponse;
  return data.result;
}

/*
Usage example — recovering a lost session (session.id not stored):

const sessions = await searchCheckouts("order_123");

// Find the paid session among the results
const paid = sessions.find(
  (s) => s.checkout_status === "complete" && s.payment_status === "succeeded"
);

if (paid) {
  console.log("Session payée retrouvée :", paid.id, paid.transaction_id);
  await db.orders.update({ client_reference: "order_123" }, { status: "paid", wave_session_id: paid.id });
} else {
  console.log("Aucun paiement réussi pour order_123");
}

// Tip: always use a unique client_reference per order
// so that this search returns exactly one result.
*/
