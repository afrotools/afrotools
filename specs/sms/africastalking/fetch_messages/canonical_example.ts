/**
 * @provider Africa's Talking
 * @capability fetch_messages
 * @atss 1.0
 * @capability_type synchronous
 */

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME;
if (!AFRICASTALKING_API_KEY) throw new Error("Missing env: AFRICASTALKING_API_KEY");
if (!AFRICASTALKING_USERNAME) throw new Error("Missing env: AFRICASTALKING_USERNAME");

const isSandbox = process.env.AFRICASTALKING_SANDBOX === "true";
const MESSAGING_BASE = isSandbox
  ? "https://api.sandbox.africastalking.com"
  : "https://api.africastalking.com";

interface SMSMessage {
  linkId: string;
  text: string;
  to: string;
  id: number;
  date: string;
  from: string;
}

interface FetchMessagesResponse {
  SMSMessageData: {
    Messages: SMSMessage[];
  };
}

interface AfricasTalkingFetchError {
  message: string;
}

export async function fetchMessages(
  lastReceivedId?: string
): Promise<FetchMessagesResponse> {
  const params = new URLSearchParams();
  params.set("username", AFRICASTALKING_USERNAME!);
  if (lastReceivedId !== undefined) {
    params.set("lastReceivedId", lastReceivedId);
  }

  const url = `${MESSAGING_BASE}/version1/messaging?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      apiKey: AFRICASTALKING_API_KEY!,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error: AfricasTalkingFetchError = await response.json();
    throw new Error(
      `Africa's Talking fetch_messages error ${response.status}: ${error.message}`
    );
  }

  return response.json() as Promise<FetchMessagesResponse>;
}

/*
Usage example:

// First call — fetch from the beginning (no lastReceivedId)
const first = await fetchMessages();
const messages = first.SMSMessageData.Messages;
console.log(`Fetched ${messages.length} messages`);

// Store the last id as the cursor for the next call
let cursor: string | undefined;
if (messages.length > 0) {
  cursor = String(messages[messages.length - 1].id);
}

// Subsequent calls — pass cursor to avoid re-processing old messages
if (cursor) {
  const next = await fetchMessages(cursor);
  const newMessages = next.SMSMessageData.Messages;
  console.log(`Fetched ${newMessages.length} new messages since id=${cursor}`);

  for (const msg of newMessages) {
    console.log(`From ${msg.from}: ${msg.text} (received ${msg.date})`);
    cursor = String(msg.id); // advance cursor
  }
}

// Prefer webhook_incoming_sms over polling for real-time delivery.
// Configure the callback URL in the AT dashboard:
// SMS → SMS Callback URLs → Incoming Messages
*/
