/**
 * @provider Gozem
 * @capability book_trip
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type BookTripInput = {
  quote_id?: string;
  dropoffs?: {
    contact_name?: string;
    contact_phone?: string;
    label: string;
    lat: number;
    lon: number;
    note?: string;
  }[];
  optimize_route?: boolean;
  pickup?: {
    contact_name?: string;
    contact_phone?: string;
    label: string;
    lat: number;
    lon: number;
    note?: string;
  };
  title?: string;
  vehicle?: string;
};

export type BookTripResponse = {
  data: {
    created_at: string;
    fare: {
      amount: number;
      breakdown: {
        amount: number;
        label: string;
        sub_label?: string;
      }[];
      currency_code: "XOF";
    };
    guid: string;
    status: "pending" | "expired" | "assigned" | "at_pickup" | "started" | "canceled" | "completed";
    title?: string;
    tracking_url?: string;
    updated_at: string;
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

export async function bookTrip(input: BookTripInput): Promise<BookTripResponse> {
  const response = await fetch(`${BASE_URL}/trips`, {
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

  return (await response.json()) as BookTripResponse;
}

/*
Usage example:

const { data: trip } = await bookTrip({ quote_id: quote.guid });
// Store trip.guid against your order: every later call uses it.
console.log(trip.guid, trip.status, "Track:", trip.tracking_url);
*/
