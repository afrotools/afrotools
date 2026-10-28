/**
 * @provider LengoPay
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

type PaymentStatus = "SUCCESS" | "FAILED" | "PENDING";

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
  date: string;
}

interface LengoPayError {
  message: string;
}

// Same call as verify_payment: POST /api/v1/transaction/status (the GET /api/v1/payments/{payId} it replaced no longer works)
async function verifyPayment(payId: string): Promise<VerifyPaymentResponse> {
  const response = await fetch(
    "https://portal.lengopay.com/api/v1/transaction/status",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pay_id: payId, websiteid: LENGOPAY_WEBSITE_ID! }),
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
  fulfillOrder: (payId: string, amount: number) => Promise<void>,
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
      await fulfillOrder(result.pay_id, result.amount);
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
    async (payId, amount) => {
      const order = await db.orders.findOne({ pay_id: payId });
      // Guard against duplicate delivery
      if (!order || order.status === "paid") return;
      // The verified amount must match what this order charged: compare it, never copy it onto the order.
      if (amount !== order.total) return; // log and alert: paid amount differs from the order

      await db.orders.update({ pay_id: payId }, { status: "paid" });
    },
    (status) => res.sendStatus(status)
  );
});

// Important: register this route WITHOUT authentication middleware.
// LengoPay sends no webhook signature — verify the payment via the API instead.
*/
