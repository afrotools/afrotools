/**
 * @provider Notch Pay
 * @capability delete_webhook
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface DeleteWebhookInput {
  endpoint: string;
}

interface DeleteWebhookResponse {
  status: string;
  code: number;
  message: string;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function deleteWebhook(
  input: DeleteWebhookInput
): Promise<DeleteWebhookResponse> {
  const response = await fetch(
    `https://api.notchpay.co/webhooks/${input.endpoint}`,
    {
      method: "DELETE",
      headers: {
        Authorization: NOTCHPAY_PRIVATE_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<DeleteWebhookResponse>;
}

/*
Usage example:

const result = await deleteWebhook({ endpoint: "wh_abc123" });

console.log(result.message); // "Webhook deleted"

// Deletion is immediate and irreversible.
// Notch Pay stops delivering events to the endpoint right away.
// The endpoint parameter is the webhook endpoint ID, not its URL.
// A 404 is returned if the ID does not exist or belongs to a different account.
*/
