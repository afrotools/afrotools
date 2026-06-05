/**
 * @provider Bictorys
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

const BICTORYS_WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET;
if (!BICTORYS_WEBHOOK_SECRET) throw new Error("Missing env: BICTORYS_WEBHOOK_SECRET");

interface CustomerObject {
  name?: string;
  email?: string;
  phone?: number;
  country?: string;
  locale?: string;
}

interface BictorysWebhookPayload {
  id: string;
  merchantId: string;
  subMerchantId?: string;
  type?: string;
  customerId?: string;
  customerObject?: CustomerObject;
  pspName: "wave_money" | "orange_money" | "maxit" | "mtn_money" | "free_money" | "moov" | "mobicash" | "togocell" | "bictorys" | "card";
  paymentMeans?: string;
  paymentChannel?: "Online" | "Terminal";
  amount: number;
  currency: string;
  settledAmount?: number;
  settledCurrency?: string;
  merchantFees?: number;
  customerFees?: number;
  transactionFeeAmountHT?: number;
  transactionFeeAmountTax?: number;
  paymentReference?: string;
  merchantReference?: string;
  cashier?: string;
  orderType?: string;
  orderId?: string;
  orderDetails?: object[];
  status: "SUCCEEDED" | "AUTHORIZED" | "FAILED" | "PENDING";
  originIp?: string;
  timestamp: string;
}

/**
 * Express-style handler for Bictorys payment webhook events.
 * Mount at the URL registered in your Bictorys dashboard under Developers → API Keys & Webhooks.
 */
export async function handleBictorysWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: BictorysWebhookPayload,
  onPaymentSucceeded: (transactionId: string, paymentReference: string | undefined) => Promise<void>,
  sendResponse: (status: number) => void
): Promise<void> {
  const secretHeader = headers["x-secret-key"];
  const receivedSecret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;

  if (!receivedSecret || receivedSecret !== BICTORYS_WEBHOOK_SECRET) {
    sendResponse(401);
    return;
  }

  // Always respond 200 immediately — then process async.
  sendResponse(200);

  try {
    if (body.status === "SUCCEEDED") {
      // Never trust the webhook alone — verify server-side before fulfilling.
      // Call verifyTransaction(body.id) from verify_transaction spec and check status === "succeeded".
      await onPaymentSucceeded(body.id, body.paymentReference);
    }
  } catch {
    // Log the error — do not rethrow. The 200 is already sent.
  }
}

/*
Usage example (Express):

import express from "express";
const app = express();
app.use(express.json());

app.post("/webhooks/bictorys", async (req, res) => {
  await handleBictorysWebhook(
    req.headers,
    req.body,
    async (transactionId, paymentReference) => {
      // Always verify server-side before marking the order as paid:
      // const tx = await verifyTransaction(transactionId);
      // if (tx.status === "succeeded") { ... fulfill order ... }
      await db.orders.update({ paymentReference }, { status: "verifying" });
    },
    (status) => res.sendStatus(status)
  );
});
*/
