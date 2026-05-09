/**
 * @provider Notch Pay
 * @capability update_webhook
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

type NotchPayEventType =
  | "payment.created"
  | "payment.complete"
  | "payment.failed"
  | "payment.canceled"
  | "payment.expired"
  | "transfer.created"
  | "transfer.complete"
  | "transfer.failed"
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "customer.blocked"
  | "customer.unblocked";

interface UpdateWebhookInput {
  endpoint: string;
  url?: string;
  events?: NotchPayEventType[];
  description?: string;
}

interface NotchPayWebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description: string;
  created_at: string;
}

interface UpdateWebhookResponse {
  status: string;
  code: number;
  message: string;
  endpoint: NotchPayWebhookEndpoint;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function updateWebhook(
  input: UpdateWebhookInput
): Promise<UpdateWebhookResponse> {
  const { endpoint, ...body } = input;

  const response = await fetch(`https://api.notchpay.co/webhooks/${endpoint}`, {
    method: "PUT",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<UpdateWebhookResponse>;
}

/*
Usage example:

// Add a new event type while preserving existing ones:
// 1. Fetch current events first
// const current = await getWebhook({ endpoint: "wh_abc123" });
// 2. Append the new event and update
const result = await updateWebhook({
  endpoint: "wh_abc123",
  events: ["payment.complete", "payment.failed", "transfer.complete"],
  description: "Updated payment and transfer notifications",
});

console.log("Updated webhook:", result.endpoint.id);

// WARNING: The events field replaces the entire list — it is not a merge.
// To add a single event, fetch the current events first, then send the full updated array.
// The new URL must be HTTPS.
*/
