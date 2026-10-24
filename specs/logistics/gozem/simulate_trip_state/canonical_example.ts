/**
 * @provider Gozem
 * @capability simulate_trip_state
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Sandbox only: this endpoint does not exist in production.
const BASE_URL = "https://sandbox-api.gozem.co/courier/v1";

export type SimulateTripStateInput = {
  trip_id: string;
  action: "assign" | "arrive-pickup" | "start" | "update-location" | "complete" | "cancel" | "expire" | "stop-start" | "stop-complete" | "message";
  lat?: number;
  lon?: number;
  reason?: string;
  sender_type?: string;
  text?: string;
};

export type SimulateTripStateResponse = {
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

export async function simulateTripState(input: SimulateTripStateInput): Promise<SimulateTripStateResponse> {
  const { trip_id, ...body } = input;
  const response = await fetch(`${BASE_URL}/trips/${trip_id}/simulation/state`, {
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

  return (await response.json()) as SimulateTripStateResponse;
}

/*
Usage example:

for (const action of ["assign", "arrive-pickup", "start", "stop-start", "stop-complete", "complete"] as const) {
  const { data: trip } = await simulateTripState({ trip_id: tripId, action });
  console.log(action, "→", trip.status); // check your webhook handler received the matching event
}
*/
