/**
 * @provider Gozem
 * @capability list_trips
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type ListTripsInput = {
  status?: "pending" | "expired" | "assigned" | "at_pickup" | "started" | "canceled" | "completed";
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type ListTripsResponse = {
  data: {
    assigned_at?: string;
    canceled_at?: string;
    completed_at?: string;
    created_at: string;
    distance_km?: number;
    driver?: {
      name: string;
      phone: string;
      vehicle_plate: string;
      vehicle_type: string;
    };
    duration_minutes?: number;
    fare: {
      amount: number;
      currency_code: string;
    };
    guid: string;
    started_at?: string;
    status: "pending" | "expired" | "assigned" | "at_pickup" | "started" | "canceled" | "completed";
    title?: string;
  }[];
  message: string;
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
  success: true;
};

type GozemError = {
  code: string;
  details?: unknown;
  message: string;
  success?: false;
  error?: string;
};

export async function listTrips(input: ListTripsInput): Promise<ListTripsResponse> {
  const { status, from, to, limit, offset } = input;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ status, from, to, limit, offset })) {
    if (value !== undefined) query.set(key, String(value));
  }
  const response = await fetch(`${BASE_URL}/trips?${query}`, {
    method: "GET",
    headers: {
      "x-api-key": GOZEM_API_KEY,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as ListTripsResponse;
}

/*
Usage example:

const { data: trips, meta } = await listTrips({ status: "canceled", from: new Date(Date.now() - 7 * 864e5).toISOString(), limit: 50 });
console.log(`${trips.length} of ${meta.total}`);
*/
