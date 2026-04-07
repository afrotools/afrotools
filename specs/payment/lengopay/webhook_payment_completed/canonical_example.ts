/**
 * @provider LengoPay
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

type PaymentStatus = "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED";

interface LengoPayWebhookPayload {
  pay_id: string;
  status: "SUCCESS" | "FAILED";
  amount: number;
  message: string;
  Client?: string;
  metadata?: Record<string, unknown>;
}

interface VerifyPaymentResponse {
  pay_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface LengoPayError {
  message: string;
}

async function verifyPayment(payId: string): Promise<VerifyPaymentResponse> {
  const response = await fetch(
    `https://portal.lengopay.com/api/v1/payments/${encodeURIComponent(payId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const error: LengoPayError = await response.json();
    throw new Error(
      `LengoPay verify error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  return response.json() as Promise<VerifyPaymentResponse>;
}

/**
 * Express-style webhook handler for LengoPay payment_completed events.
 * Mount this at the URL you pass as callback_url in create_payment.
 */
export async function handleLengoPayWebhook(
  body: LengoPayWebhookPayload,
  fulfillOrder: (payId: string, amount: number, currency: string) => Promise<void>,
  sendResponse: (status: number) => void
): Promise<void> {
  // Respond 200 immediately — LengoPay retries on failure, which can cause duplicate processing.
  sendResponse(200);

  const { pay_id } = body;
  if (!pay_id) return;

  try {
    // Never trust the webhook payload alone — verify server-side.
    const result = await verifyPayment(pay_id);

    if (result.status === "SUCCESS") {
      // fulfillOrder must be idempotent: LengoPay may deliver the same webhook multiple times.
      await fulfillOrder(result.pay_id, result.amount, result.currency);
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

app.post("/api/lengopay/callback", async (req, res) => {
  await handleLengoPayWebhook(
    req.body,
    async (payId, amount, currency) => {
      // Guard against duplicate delivery
      const alreadyFulfilled = await db.orders.findOne({ pay_id: payId, status: "paid" });
      if (alreadyFulfilled) return;

      await db.orders.update({ pay_id: payId }, { status: "paid", amount, currency });
    },
    (status) => res.sendStatus(status)
  );
});

// Important: register this route WITHOUT authentication middleware.
// LengoPay sends no webhook signature — verify the payment via the API instead.
*/
