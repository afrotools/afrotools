/**
 * @provider Cartflox
 * @capability create_payment_link
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type CreatePaymentLinkInput = {
  title: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type CreatePaymentLinkResponse = {
  success: true;
  id: string;
  url: string;
  slug: string;
  amount: number;
  currency: string;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<CreatePaymentLinkResponse> {
  const response = await fetch("https://cartflox.com/api/v1/payment-links", {
    method: "POST",
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

  return (await response.json()) as CreatePaymentLinkResponse;
}

/*
Usage example:

const link = await createPaymentLink({ title: "T-shirt Cartflox", amount: 15000, currency: "XOF" });
// Share link.url; keep link.id for checkPaymentLinkStatus.
*/
