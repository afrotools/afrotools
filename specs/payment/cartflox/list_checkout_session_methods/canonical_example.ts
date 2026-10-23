/**
 * @provider Cartflox
 * @capability list_checkout_session_methods
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type ListCheckoutSessionMethodsInput = {
  id: string;
  country?: string;
};

export type ListCheckoutSessionMethodsResponse = {
  id: string;
  currency: string;
  methods: {
    code: string;
    gatewayId: string;
    name: string;
    provider?: string | null;
    country?: string | null;
    type?: string | null;
    flag?: string | null;
    logo?: string | null;
  }[];
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function listCheckoutSessionMethods(
  input: ListCheckoutSessionMethodsInput
): Promise<ListCheckoutSessionMethodsResponse> {
  const query = new URLSearchParams();
  if (input.country !== undefined) query.set("country", String(input.country));
  const qs = query.toString();
  const response = await fetch(`https://cartflox.com/api/v1/checkout/sessions/${input.id}/methods${qs ? `?${qs}` : ""}`, {
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

  return (await response.json()) as ListCheckoutSessionMethodsResponse;
}

/*
Usage example:

const { methods } = await listCheckoutSessionMethods({ id: "cmf3k2p1x0001abcd9e8f7g6h", country: "ci" });
for (const m of methods) console.log(m.code, m.name, m.provider);
*/
