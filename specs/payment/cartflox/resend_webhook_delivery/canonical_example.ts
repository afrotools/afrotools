/**
 * @provider Cartflox
 * @capability resend_webhook_delivery
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type ResendWebhookDeliveryInput = {
  id: string;
};

export type ResendWebhookDeliveryResponse = {
  id: string;
  object: "webhook.delivery";
  event: "payment.completed" | "payment.failed" | "payment.cancelled" | "payment.updated" | "transfer.succeeded" | "transfer.failed";
  url: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  max_attempts: 10;
  next_attempt_at?: string | null;
  last_status_code?: number | null;
  last_error?: string | null;
  response_ms?: number | null;
  transaction_id?: string | null;
  transfer_id?: string | null;
  livemode: boolean;
  created_at: string;
  delivered_at?: string | null;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function resendWebhookDelivery(
  input: ResendWebhookDeliveryInput
): Promise<ResendWebhookDeliveryResponse> {
  const response = await fetch(`https://cartflox.com/api/v1/webhooks/deliveries/${input.id}/resend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CARTFLOX_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as ResendWebhookDeliveryResponse;
}

/*
Usage example:

const delivery = await resendWebhookDelivery({ id: "cmu8d4e5f0003abc" });
console.log(delivery.status, delivery.last_status_code);
*/
