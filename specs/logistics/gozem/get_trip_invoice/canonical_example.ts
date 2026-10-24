/**
 * @provider Gozem
 * @capability get_trip_invoice
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type GetTripInvoiceInput = {
  trip_id: string;
};

export type GetTripInvoiceResponse = {
  data: {
    completed_at: string;
    driver: {
      name: string;
      phone: string;
      vehicle_plate: string;
      vehicle_type: string;
    };
    fare_breakdown: {
      breakdown: {
        amount: number;
        label: string;
        sub_label?: string;
      }[];
      currency_code: string;
      subtotal: number;
      total: number;
    };
    invoice_number: string;
    issued_at: string;
    payment: {
      method: string;
      paid_at?: string;
      status: string;
    };
    status: "completed";
    trip_details: {
      distance_km: number;
      dropoff_addresses: string[];
      duration_minutes: number;
      pickup_address: string;
      title?: string;
    };
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

export async function getTripInvoice(input: GetTripInvoiceInput): Promise<GetTripInvoiceResponse> {
  const { trip_id } = input;
  const response = await fetch(`${BASE_URL}/trips/${trip_id}/invoice`, {
    method: "GET",
    headers: {
      "x-api-key": GOZEM_API_KEY,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetTripInvoiceResponse;
}

/*
Usage example:

const { data: invoice } = await getTripInvoice({ trip_id: tripId });
for (const line of invoice.fare_breakdown.breakdown) console.log(line.label, line.amount, invoice.fare_breakdown.currency_code);
*/
