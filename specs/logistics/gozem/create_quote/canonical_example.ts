/**
 * @provider Gozem
 * @capability create_quote
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type CreateQuoteInput = {
  dropoffs: {
    contact_name?: string;
    contact_phone?: string;
    label: string;
    lat: number;
    lon: number;
    note?: string;
  }[];
  optimize_route?: boolean;
  pickup: {
    contact_name?: string;
    contact_phone?: string;
    label: string;
    lat: number;
    lon: number;
    note?: string;
  };
  title?: string;
  vehicle: string;
};

export type CreateQuoteResponse = {
  data: {
    created_at: string;
    dropoffs: {
      contact_name?: string;
      contact_phone?: string;
      label: string;
      lat: number;
      lon: number;
      note?: string;
    }[];
    estimated_distance: number;
    estimated_duration: number;
    estimated_fare: {
      amount: number;
      breakdown: {
        amount: number;
        label: string;
        sub_label?: string;
      }[];
      currency_code: string;
    };
    expires_at: string;
    guid: string;
    pickup: {
      contact_name?: string;
      contact_phone?: string;
      label: string;
      lat: number;
      lon: number;
      note?: string;
    };
    title?: string;
  };
  message: string;
  success: true;
};

type GozemError = {
  code: string;
  details?: unknown;
  message: string;
  success?: false;
  error?: string;
};

export async function createQuote(input: CreateQuoteInput): Promise<CreateQuoteResponse> {
  const response = await fetch(`${BASE_URL}/quotes`, {
    method: "POST",
    headers: {
      "x-api-key": GOZEM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as CreateQuoteResponse;
}

/*
Usage example:

const { data: quote } = await createQuote({
  vehicle: "motorcycle", // a name or guid returned by listVehicles
  pickup: { label: "Shop, Zone Aéroport, Lomé", lat: 6.166245, lon: 1.247951, contact_phone: "+22822200011" },
  dropoffs: [{ label: "Customer, Tokoin, Lomé", lat: 6.172834, lon: 1.231456, contact_phone: "+22893112233" }],
});
console.log(quote.estimated_fare.amount, quote.estimated_fare.currency_code, "until", quote.expires_at);
*/
