/**
 * @provider Gozem
 * @capability send_trip_message
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type SendTripMessageInput = {
  trip_id: string;
  message: string;
};

export type SendTripMessageResponse = {
  data: {
    chat_id: string;
    content: string;
    date: string;
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

export async function sendTripMessage(input: SendTripMessageInput): Promise<SendTripMessageResponse> {
  const { trip_id, ...body } = input;
  const response = await fetch(`${BASE_URL}/trips/${trip_id}/messages`, {
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

  return (await response.json()) as SendTripMessageResponse;
}

/*
Usage example:

await sendTripMessage({ trip_id: tripId, message: "Please call the customer when you arrive." });
*/
