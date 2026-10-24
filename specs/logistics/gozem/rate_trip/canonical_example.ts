/**
 * @provider Gozem
 * @capability rate_trip
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type RateTripInput = {
  trip_id: string;
  comment?: string;
  rating: number;
};

export type RateTripResponse = {
  data: {
    comment?: string;
    date: string;
    rating: number;
    trip_id: string;
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

export async function rateTrip(input: RateTripInput): Promise<RateTripResponse> {
  const { trip_id, ...body } = input;
  const response = await fetch(`${BASE_URL}/trips/${trip_id}/rating`, {
    method: "POST",
    headers: {
      "x-api-key": GOZEM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as RateTripResponse;
}

/*
Usage example:

await rateTrip({ trip_id: tripId, rating: 5, comment: "On time, careful with the parcel" });
*/
