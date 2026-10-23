/**
 * @provider Cartflox
 * @capability get_routing_options
 * @atss 1.0
 * @capability_type synchronous
 */

export type GetRoutingOptionsInput = {
  country: string;
  providers?: string;
  currency?: string;
};

export type GetRoutingOptionsResponse = {
  country: string;
  currency?: string | null;
  availableMethods: {
    method: "card" | "orange-money" | "wave" | "djamo" | "mtn" | "moov" | "airtel" | "free-money" | "expresso" | "wizall" | "t-money" | "mpesa" | "mobile-money" | "crypto";
    providers: string[];
  }[];
  rankedProviders: {
    provider: string;
    score: number;
  }[];
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function getRoutingOptions(
  input: GetRoutingOptionsInput
): Promise<GetRoutingOptionsResponse> {
  const query = new URLSearchParams();
  if (input.country !== undefined) query.set("country", String(input.country));
  if (input.providers !== undefined) query.set("providers", String(input.providers));
  if (input.currency !== undefined) query.set("currency", String(input.currency));
  const qs = query.toString();
  const response = await fetch(`https://cartflox.com/api/v1/route${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as GetRoutingOptionsResponse;
}

/*
Usage example:

const options = await getRoutingOptions({ country: "SN", providers: "paydunya,cinetpay", currency: "XOF" });
console.log(options.availableMethods, options.rankedProviders);
*/
