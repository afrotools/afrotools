/**
 * @provider Gozem
 * @capability get_quote
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type GetQuoteInput = {
  quote_id: string;
};

export type GetQuoteResponse = {
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

export async function getQuote(input: GetQuoteInput): Promise<GetQuoteResponse> {
  const { quote_id } = input;
  const response = await fetch(`${BASE_URL}/quotes/${quote_id}`, {
    method: "GET",
    headers: {
      "x-api-key": GOZEM_API_KEY,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetQuoteResponse;
}

/*
Usage example:

const { data: quote } = await getQuote({ quote_id: quoteId });
if (new Date(quote.expires_at) < new Date()) console.log("Expired: create a new quote");
*/
