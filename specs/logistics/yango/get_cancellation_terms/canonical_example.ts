/**
 * @provider Yango Delivery
 * @capability get_cancellation_terms
 * @atss 1.1
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type GetCancellationTermsInput = {
  claim_id: string;
};

export type GetCancellationTermsResponse = {
  cancel_state: "free" | "paid" | "unavailable";
  currency?: string;
  price?: string;
  price_with_vat?: string;
};

type YangoError = {
  code: "bad_request" | "not_found";
  message: string;
};

export async function getCancellationTerms(input: GetCancellationTermsInput): Promise<GetCancellationTermsResponse> {
  const { claim_id } = input;
  const query = new URLSearchParams({ claim_id });
  const response = await fetch(`https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/claims/cancel-info?${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YANGO_DELIVERY_TOKEN}`,
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<YangoError>;
    throw new Error(`Yango Delivery ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetCancellationTermsResponse;
}

/*
Usage example:

const terms = await getCancellationTerms({ claim_id: claimId });
console.log(terms.cancel_state, terms.price, terms.currency);
*/
