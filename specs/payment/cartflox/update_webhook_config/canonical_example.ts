/**
 * @provider Cartflox
 * @capability update_webhook_config
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type UpdateWebhookConfigInput = {
  webhookUrl?: string;
  mode?: "live" | "test";
  events?: Array<"payment.completed" | "payment.failed" | "payment.cancelled" | "payment.updated" | "transfer.succeeded" | "transfer.failed">;
};

export type UpdateWebhookConfigResponse = {
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

export async function updateWebhookConfig(
  input: UpdateWebhookConfigInput
): Promise<UpdateWebhookConfigResponse> {
  const response = await fetch("https://cartflox.com/api/v1/config/webhook", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CARTFLOX_SECRET_KEY}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as UpdateWebhookConfigResponse;
}

/*
Usage example:

await updateWebhookConfig({
  webhookUrl: "https://example.com/webhooks/cartflox",
  events: ["payment.completed", "payment.failed", "payment.cancelled"],
});
await updateWebhookConfig({ webhookUrl: "https://staging.example.com/webhooks/cartflox", mode: "test" });
*/
