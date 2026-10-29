/**
 * @provider Africa's Talking
 * @capability send_bulk_sms
 * @atss 1.1
 * @capability_type synchronous
 */

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME;
if (!AFRICASTALKING_API_KEY) throw new Error("Missing env: AFRICASTALKING_API_KEY");
if (!AFRICASTALKING_USERNAME) throw new Error("Missing env: AFRICASTALKING_USERNAME");

// Production only: the docs list this endpoint's sandbox as "coming soon".
// Test with send_sms (legacy endpoint, sandbox available).
const BULK_URL = "https://api.africastalking.com/version1/messaging/bulk";

interface SendBulkSmsInput {
  phoneNumbers: string[]; // international format, e.g. "+254711XXXYYY"
  message: string;
  senderId: string; // your registered short code or alphanumeric
  enqueue?: 0 | 1;
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

const ACCEPTED = new Set([100, 101, 102]); // Processed, Sent, Queued

export async function sendBulkSms(input: SendBulkSmsInput): Promise<SendSmsResponse> {
  const body: Record<string, unknown> = {
    username: AFRICASTALKING_USERNAME!,
    phoneNumbers: input.phoneNumbers, // a JSON list, as in the docs' sample
    message: input.message,
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

  // 409 = DoNotDisturbRejection (Nigeria): the body still carries SMSMessageData.
  if (!response.ok && response.status !== 409) {
    throw new Error(`Africa's Talking bulk SMS error ${response.status}: ${await response.text()}`);
  }

  const result = (await response.json()) as SendSmsResponse;
  // status says whether the SMS was sent, not delivered: wait for webhook_delivery_report.
  for (const r of result.SMSMessageData.Recipients) {
    if (!ACCEPTED.has(r.statusCode)) console.warn(`Not sent to ${r.number}: ${r.statusCode} ${r.status}`);
  }
  return result;
}

/*
Usage example:

const result = await sendBulkSms({
  phoneNumbers: ["+254711XXXYYY", "+254733YYYZZZ"],
  message: "Your order has shipped!",
  senderId: process.env.AFRICASTALKING_SMS_SENDER!,
});
console.log(result.SMSMessageData.Message); // "Sent to 2/2 Total Cost: KES 1.6000"
*/
