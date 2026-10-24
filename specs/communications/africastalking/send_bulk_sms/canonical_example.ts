/**
 * @provider Africa's Talking
 * @capability send_bulk_sms
 * @atss 1.0
 * @capability_type synchronous
 */

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME;
if (!AFRICASTALKING_API_KEY) throw new Error("Missing env: AFRICASTALKING_API_KEY");
if (!AFRICASTALKING_USERNAME) throw new Error("Missing env: AFRICASTALKING_USERNAME");

// NOTE: The sandbox URL for /messaging/bulk is not yet available.
// Use send_sms (legacy endpoint) for sandbox testing.
const BULK_URL = "https://api.africastalking.com/version1/messaging/bulk";

interface SendBulkSmsInput {
  phoneNumbers: string | string[];
  message: string;
  senderId: string;
  enqueue?: number;
}

interface SmsRecipient {
  statusCode: number;
  number: string;
  status: string;
  cost: string;
  messageId: string;
}

interface SendSmsResponse {
  SMSMessageData: {
    Message: string;
    Recipients: SmsRecipient[];
  };
}

export async function sendBulkSms(input: SendBulkSmsInput): Promise<SendSmsResponse> {
  const phoneNumbers = Array.isArray(input.phoneNumbers)
    ? input.phoneNumbers.join(",")
    : input.phoneNumbers;

  const body: Record<string, string | number> = {
    username: AFRICASTALKING_USERNAME!,
    // IMPORTANT: field is "phoneNumbers" NOT "to" — using "to" silently fails
    phoneNumbers,
    message: input.message,
    // senderId is required for this endpoint (unlike the legacy from field which was optional)
    senderId: input.senderId,
  };
  if (input.enqueue !== undefined) body.enqueue = input.enqueue;

  const response = await fetch(BULK_URL, {
    method: "POST",
    headers: {
      apiKey: AFRICASTALKING_API_KEY!,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Africa's Talking bulk SMS error ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as SendSmsResponse;

  // HTTP 200 does not guarantee delivery — check per-recipient statusCode
  for (const recipient of result.SMSMessageData.Recipients) {
    if (recipient.statusCode !== 101 && recipient.statusCode !== 102 && recipient.statusCode !== 100) {
      console.warn(
        `Recipient ${recipient.number} failed: statusCode=${recipient.statusCode} status=${recipient.status}`
      );
    }
  }

  return result;
}

/*
Usage example:

// Set env vars:
//   AFRICASTALKING_API_KEY=your_production_key
//   AFRICASTALKING_USERNAME=your_username
//
// NOTE: No sandbox support for this endpoint yet.
// Use send_sms (legacy) for sandbox testing.

const result = await sendBulkSms({
  phoneNumbers: ["+254711XXXYYY", "+254733YYYZZZ"],
  message: "Your order has shipped!",
  senderId: "MyBrand",   // required — omitting returns an error
  enqueue: 1,
});

console.log(result.SMSMessageData.Message);
// "Sent to 2/2 Total Cost: KES 1.6000"

for (const r of result.SMSMessageData.Recipients) {
  console.log(`${r.number}: statusCode=${r.statusCode} cost=${r.cost}`);
  // statusCode 101 = Sent (success)
}

// Pitfall: do NOT use field name "to" — this endpoint requires "phoneNumbers"
// Pitfall: senderId is required here; legacy send_sms allows omitting "from"
*/
