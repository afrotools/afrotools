/**
 * @provider Notch Pay
 * @capability create_webhook
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

interface CreateWebhookInput {
  url: string;
  events: NotchPayEventType[];
  description?: string;
}

interface NotchPayWebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description: string;
  created_at: string;
}

interface CreateWebhookResponse {
  status: string;
  code: number;
  message: string;
  endpoint: NotchPayWebhookEndpoint;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function createWebhook(
  input: CreateWebhookInput
): Promise<CreateWebhookResponse> {
  const response = await fetch("https://api.notchpay.co/webhooks", {
    method: "POST",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<CreateWebhookResponse>;
}

/*
Usage example:

const result = await createWebhook({
  url: "https://myapp.com/webhooks/notchpay",
  events: ["payment.complete", "payment.failed"],
  description: "Production payment notifications",
});

// Store result.endpoint.id — required to update or delete this webhook later.
console.log("Webhook registered:", result.endpoint.id);

// The URL must be HTTPS. HTTP URLs are rejected.
// The events array must not be empty.
// To validate incoming payloads, verify the X-Notch-Signature header on your receiving endpoint.
*/
