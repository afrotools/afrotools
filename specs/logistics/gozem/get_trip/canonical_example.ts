/**
 * @provider Gozem
 * @capability get_trip
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type GetTripInput = {
  trip_id: string;
};

export type GetTripResponse = {
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
    dropoffs: {
      completed_at?: string;
      contact_name?: string;
      contact_phone?: string;
      label: string;
      lat: number;
      lon: number;
      note?: string;
    }[];
    duration_minutes?: number;
    fare?: {
      amount: number;
      breakdown: {
        amount: number;
        label: string;
        sub_label?: string;
      }[];
      currency_code: string;
    };
    guid: string;
    pickup: {
      completed_at?: string;
      contact_name?: string;
      contact_phone?: string;
      label: string;
      lat: number;
      lon: number;
      note?: string;
    };
    started_at?: string;
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

export async function getTrip(input: GetTripInput): Promise<GetTripResponse> {
  const { trip_id } = input;
  const response = await fetch(`${BASE_URL}/trips/${trip_id}`, {
    method: "GET",
    headers: {
      "x-api-key": GOZEM_API_KEY,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetTripResponse;
}

/*
Usage example:

const { data: trip } = await getTrip({ trip_id: tripId });
console.log(trip.status, trip.driver?.name ?? "no driver yet");
*/
