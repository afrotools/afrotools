/**
 * @provider Notch Pay
 * @capability list_webhooks
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface ListWebhooksInput {
  limit?: number;
  page?: number;
}

interface NotchPayWebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description: string;
  created_at: string;
}

interface ListWebhooksResponse {
  status: string;
  code: number;
  items: NotchPayWebhookEndpoint[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listWebhooks(
  input: ListWebhooksInput = {}
): Promise<ListWebhooksResponse> {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.page !== undefined) params.set("page", String(input.page));

  const queryString = params.toString();
  const url = `https://api.notchpay.co/webhooks${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ListWebhooksResponse>;
}

/*
Usage example:

const result = await listWebhooks({ limit: 20, page: 1 });

console.log(`Page ${result.current_page} of ${result.last_page}`);
for (const endpoint of result.items) {
  console.log(endpoint.id, endpoint.url, endpoint.events);
}

// Iterate all pages by incrementing page until current_page === last_page.
// All query parameters are optional — omit them to get the full paginated list.
*/
