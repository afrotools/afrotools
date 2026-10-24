/**
 * @provider Gozem
 * @capability get_trip_messages
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type GetTripMessagesInput = {
  trip_id: string;
};

export type GetTripMessagesResponse = {
  data: {
    chat_id?: string;
    messages: {
      content: string;
      date: string;
      sender: {
        name: string;
        phone: string;
        sender_id: string;
        type: string;
      };
      status: string;
    }[];
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

export async function getTripMessages(input: GetTripMessagesInput): Promise<GetTripMessagesResponse> {
  const { trip_id } = input;
  const response = await fetch(`${BASE_URL}/trips/${trip_id}/messages`, {
    method: "GET",
    headers: {
      "x-api-key": GOZEM_API_KEY,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetTripMessagesResponse;
}

/*
Usage example:

const { data: chat } = await getTripMessages({ trip_id: tripId });
for (const m of chat.messages) console.log(m.date, m.sender.name, m.content);
*/
