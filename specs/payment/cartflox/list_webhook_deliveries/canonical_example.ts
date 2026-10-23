/**
 * @provider Cartflox
 * @capability list_webhook_deliveries
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type ListWebhookDeliveriesInput = {
  transaction_id?: string;
  status?: "pending" | "delivered" | "failed";
  event?: "payment.completed" | "payment.failed" | "payment.cancelled" | "payment.updated" | "transfer.succeeded" | "transfer.failed";
  limit?: number;
};

export type ListWebhookDeliveriesResponse = {
  object: "list";
  data: {
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
  }[];
  count: number;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function listWebhookDeliveries(
  input: ListWebhookDeliveriesInput
): Promise<ListWebhookDeliveriesResponse> {
  const query = new URLSearchParams();
  if (input.transaction_id !== undefined) query.set("transaction_id", String(input.transaction_id));
  if (input.status !== undefined) query.set("status", String(input.status));
  if (input.event !== undefined) query.set("event", String(input.event));
  if (input.limit !== undefined) query.set("limit", String(input.limit));
  const qs = query.toString();
  const response = await fetch(`https://cartflox.com/api/v1/webhooks/deliveries${qs ? `?${qs}` : ""}`, {
    method: "GET",
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

  return (await response.json()) as ListWebhookDeliveriesResponse;
}

/*
Usage example:

const { data } = await listWebhookDeliveries({ transaction_id: "cmf3k2p1x0001abcd9e8f7g6h", status: "failed" });
for (const d of data) console.log(d.id, d.event, d.last_status_code, d.last_error);
*/
