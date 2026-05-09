/**
 * @provider Notch Pay
 * @capability get_webhook
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface GetWebhookInput {
  endpoint: string;
}

interface NotchPayWebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description: string;
  created_at: string;
}

interface GetWebhookResponse {
  status: string;
  code: number;
  endpoint: NotchPayWebhookEndpoint;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function getWebhook(
  input: GetWebhookInput
): Promise<GetWebhookResponse> {
  const response = await fetch(
    `https://api.notchpay.co/webhooks/${input.endpoint}`,
    {
      method: "GET",
      headers: {
        Authorization: NOTCHPAY_PRIVATE_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<GetWebhookResponse>;
}

/*
Usage example:

const result = await getWebhook({ endpoint: "wh_abc123" });

console.log("URL:", result.endpoint.url);
console.log("Events:", result.endpoint.events);

// The endpoint parameter is the webhook endpoint ID (e.g. "wh_abc123"),
// not the webhook URL itself.
// A 404 is returned if the ID does not exist or belongs to a different account.
*/
