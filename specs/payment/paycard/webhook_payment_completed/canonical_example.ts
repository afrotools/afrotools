/**
 * @provider Paycard
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

const PAYCARD_API_KEY = process.env.PAYCARD_API_KEY;
if (!PAYCARD_API_KEY) throw new Error("Missing env: PAYCARD_API_KEY");

interface PaycardWebhookPayload {
  "paycard-operation-reference": string;
}

interface VerifyPaymentResponse {
  code: number;
  "paycard-transaction-date": string;
  "paycard-payment-method": string;
  "paycard-amount": string;
  "paycard-formatted-amount": string;
}

interface PaycardError {
  code: number;
  error_message: string;
}

async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  const url = new URL("https://mapaycard.com/epay/verify/");
  url.searchParams.set("c", PAYCARD_API_KEY!); // guarded at module level above
  url.searchParams.set("ref", reference);

  const response = await fetch(url.toString());
  const data: VerifyPaymentResponse | PaycardError = await response.json();

  if ((data as PaycardError).code !== 0) {
    const err = data as PaycardError;
    throw new Error(`Paycard verify error ${err.code}: ${err.error_message}`);
  }

  return data as VerifyPaymentResponse;
}

/**
 * Express-style webhook handler for Paycard payment_completed events.
 * Mount this at the URL you pass as paycard-callback-url in create_payment.
 */
export async function handlePaycardWebhook(
  body: PaycardWebhookPayload,
  fulfillOrder: (reference: string, amount: string) => Promise<void>,
  sendResponse: (status: number) => void
): Promise<void> {
  // Always respond 200 immediately — Paycard does not retry on failure.
  sendResponse(200);

  const reference = body["paycard-operation-reference"];
  if (!reference) return;

  try {
    // Never trust the webhook payload alone — verify server-side.
    const status = await verifyPayment(reference);

    if (status.code === 0) {
      await fulfillOrder(reference, status["paycard-amount"]);
    }
  } catch {
    // Log and alert — do not rethrow. The 200 is already sent.
  }
}

/*
Usage example (Express):

import express from "express";
const app = express();
app.use(express.json());

app.post("/payment/callback", async (req, res) => {
  await handlePaycardWebhook(
    req.body,
    async (reference, amount) => {
      // Mark order as paid in your database
      await db.orders.update({ reference }, { status: "paid", amount });
    },
    (status) => res.sendStatus(status)
  );
});

// Important: register this route WITHOUT authentication middleware.
// Paycard has no webhook signature — verify the payment via the API instead.
*/
