/**
 * @provider Orange Money
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

interface OrangeMoneyWebhookPayload {
  status?: string;
  txnid?: string;
  pay_token?: string;
  notif_token?: string;
  order_id?: string;
  amount?: string | number;
  currency?: string;
  reference?: string;
}

interface PendingPaymentRecord {
  orderId: string;
  notifToken: string;
  amount: number;
  currency: string;
}

function isPaid(status: string | undefined | null): boolean {
  return typeof status === "string" && status.toUpperCase() === "SUCCESS";
}

/**
 * Framework-agnostic Orange Money Mali webhook handler.
 *
 * Mount it at the URL you pass as `notif_url` in create_payment.
 *
 * @param body            JSON body POSTed by Orange Money to your notif_url.
 * @param lookupPayment   Returns the pending payment you stored at create_payment time
 *                        (must include the notif_token you persisted), or null if unknown.
 * @param fulfillOrder    Called only after the notif_token matches AND status === 'SUCCESS'.
 * @param sendResponse    Sends the HTTP response back to Orange Money.
 *                        MUST be invoked first with status 200, before any DB work,
 *                        because Orange Money does not retry failed deliveries.
 */
export async function handleOrangeMoneyWebhook(
  body: OrangeMoneyWebhookPayload,
  lookupPayment: (
    orderId: string,
    payToken: string | undefined
  ) => Promise<PendingPaymentRecord | null>,
  fulfillOrder: (orderId: string, amount: number, currency: string) => Promise<void>,
  sendResponse: (status: number) => void
): Promise<void> {
  // 1. Acknowledge IMMEDIATELY — Orange Money does not retry on failure.
  sendResponse(200);

  // 2. Defensive parsing — payload field set may vary across countries/versions.
  const orderId = body.order_id;
  const incomingNotifToken = body.notif_token;
  if (!orderId || !incomingNotifToken) return;

  try {
    const pending = await lookupPayment(orderId, body.pay_token);
    if (!pending) return;

    // 3. Authenticate the webhook by matching the stored notif_token.
    //    This is the ONLY anti-spoofing mechanism Orange Money provides here.
    if (pending.notifToken !== incomingNotifToken) return;

    // 4. Only fulfill on status === 'SUCCESS' (case-insensitive).
    if (!isPaid(body.status)) return;

    // 5. Coerce amount defensively — may arrive as string or number.
    const reportedAmount =
      typeof body.amount === "string" ? Number(body.amount) : body.amount ?? 0;

    // 6. Sanity-check amount and currency against what we created.
    if (reportedAmount !== pending.amount) return;
    if (body.currency && body.currency !== pending.currency) return;

    await fulfillOrder(pending.orderId, pending.amount, pending.currency);
  } catch {
    // Swallow — we already responded 200. Log/alert through your observability stack.
  }
}

/*
Usage example (Express):

import express from "express";
const app = express();
app.use(express.json());

app.post("/api/orange-money/webhook", async (req, res) => {
  await handleOrangeMoneyWebhook(
    req.body,
    async (orderId) => {
      // Look up the record you persisted right after create_payment returned.
      const row = await db.orders.findOne({ id: orderId });
      if (!row) return null;
      return {
        orderId: row.id,
        notifToken: row.om_notif_token,
        amount: row.amount,
        currency: row.currency,
      };
    },
    async (orderId, amount, currency) => {
      await db.orders.update(
        { id: orderId },
        { status: "paid", paid_amount: amount, paid_currency: currency }
      );
    },
    (status) => res.sendStatus(status)
  );
});

// IMPORTANT
// - Mount this route WITHOUT auth middleware (Orange Money is the caller).
// - The notif_token comparison above is the only protection — anyone who
//   guesses the URL can POST to it, but cannot forge a valid notif_token.
// - Orange Money does NOT retry. If your handler is slow or down, the
//   notification is lost; reconcile via your back-office or a polled status
//   check on pay_token.
*/
