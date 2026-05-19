/**
 * @provider PayGate
 * @capability create_payment_page
 * @atss 1.0
 * @capability_type synchronous
 */

const PAYGATE_AUTH_TOKEN = process.env.PAYGATE_AUTH_TOKEN;
if (!PAYGATE_AUTH_TOKEN) throw new Error("Missing env: PAYGATE_AUTH_TOKEN");

const PAYGATE_PAGE_URL = "https://paygateglobal.com/v1/page";

type PayGatePageNetwork = "MOOV" | "TOGOCEL";

interface CreatePaymentPageInput {
  amount: number;
  identifier: string;
  url: string;
  description?: string;
  phone?: string;
  network?: PayGatePageNetwork;
}

interface CreatePaymentPageResponse {
  redirect_url: string;
}

export function createPaymentPage(
  input: CreatePaymentPageInput
): CreatePaymentPageResponse {
  const params = new URLSearchParams({
    token: PAYGATE_AUTH_TOKEN!,
    amount: String(input.amount),
    identifier: input.identifier,
    url: input.url,
  });

  if (input.description) params.set("description", input.description);
  if (input.phone) params.set("phone", input.phone);
  if (input.network) params.set("network", input.network);

  return {
    redirect_url: `${PAYGATE_PAGE_URL}?${params.toString()}`,
  };
}

/*
Usage example:

const { redirect_url } = createPaymentPage({
  amount: 5000,
  identifier: "ORDER-A3B7K9",
  url: "https://myapp.com/checkout/callback",
  description: "Order #ORDER-A3B7K9",
});

// Redirect the customer to redirect_url. After they pay (or cancel) PayGate
// sends them back to your url. The redirect alone is NOT proof of payment —
// call check_payment_status server-side before fulfilling the order.
*/
