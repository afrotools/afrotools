/**
 * @provider Cartflox
 * @capability get_webhook_config
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type GetWebhookConfigResponse = {
  success: true;
  webhookUrl: string | null;
  testWebhookUrl?: string | null;
  events?: Array<"payment.completed" | "payment.failed" | "payment.cancelled" | "payment.updated" | "transfer.succeeded" | "transfer.failed">;
  available_events?: Array<"payment.completed" | "payment.failed" | "payment.cancelled" | "payment.updated" | "transfer.succeeded" | "transfer.failed">;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function getWebhookConfig(): Promise<GetWebhookConfigResponse> {
  const response = await fetch("https://cartflox.com/api/v1/config/webhook", {
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

  return (await response.json()) as GetWebhookConfigResponse;
}

/*
Usage example:

const config = await getWebhookConfig();
console.log(config.webhookUrl, config.testWebhookUrl, config.events);
*/
