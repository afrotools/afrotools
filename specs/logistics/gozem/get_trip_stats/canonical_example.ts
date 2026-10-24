/**
 * @provider Gozem
 * @capability get_trip_stats
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type GetTripStatsInput = {
  from?: string;
  to?: string;
};

export type GetTripStatsResponse = {
  data: {
    end_date: string;
    start_date: string;
    stats: {
      canceled_trips: number;
      completed_trips: number;
      total_distance_km: number;
      total_duration_minutes: number;
      total_fare: number;
      total_trips: number;
    };
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

export async function getTripStats(input: GetTripStatsInput): Promise<GetTripStatsResponse> {
  const { from, to } = input;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ from, to })) {
    if (value !== undefined) query.set(key, String(value));
  }
  const response = await fetch(`${BASE_URL}/trips/stats?${query}`, {
    method: "GET",
    headers: {
      "x-api-key": GOZEM_API_KEY,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetTripStatsResponse;
}

/*
Usage example:

const { data } = await getTripStats({ from: "2026-10-01T00:00:00Z", to: new Date().toISOString() });
console.log(data.stats.completed_trips, data.stats.total_fare);
*/
