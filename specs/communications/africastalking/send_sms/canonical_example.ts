/**
 * @provider Africa's Talking
 * @capability send_sms
 * @atss 1.1
 * @capability_type synchronous
 */

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME;
if (!AFRICASTALKING_API_KEY) throw new Error("Missing env: AFRICASTALKING_API_KEY");
if (!AFRICASTALKING_USERNAME) throw new Error("Missing env: AFRICASTALKING_USERNAME");

// In the sandbox the username is always "sandbox": it also picks the host.
const IS_SANDBOX = AFRICASTALKING_USERNAME === "sandbox";
const BASE_URL = IS_SANDBOX
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

interface SendSmsInput {
  to: string | string[];
  message: string;
  from?: string;
  bulkSMSMode?: number;
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

export async function sendSms(input: SendSmsInput): Promise<SendSmsResponse> {
  const to = Array.isArray(input.to) ? input.to.join(",") : input.to;

  const params = new URLSearchParams();
  params.set("username", AFRICASTALKING_USERNAME!);
  params.set("to", to);
  params.set("message", input.message);
  if (input.from !== undefined) params.set("from", input.from);
  if (input.bulkSMSMode !== undefined) params.set("bulkSMSMode", String(input.bulkSMSMode));
  if (input.enqueue !== undefined) params.set("enqueue", String(input.enqueue));

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      apiKey: AFRICASTALKING_API_KEY!,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  // 409 = DoNotDisturbRejection (Nigeria): "a promotional sender ID outside the allowed time
  // window(8pm-8am)". The body still carries SMSMessageData (messageId "None" for that recipient),
  // so it is parsed like a success.
  if (!response.ok && response.status !== 409) {
    const errorText = await response.text();
    throw new Error(`Africa's Talking error ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as SendSmsResponse;

  // status says whether the SMS was sent, not delivered — check per-recipient statusCode,
  // then wait for the delivery report (webhook_delivery_report).
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
//   AFRICASTALKING_API_KEY=your_key
//   AFRICASTALKING_USERNAME=your_username   ("sandbox" for the sandbox)

const result = await sendSms({
  to: ["+254711XXXYYY", "+254733YYYZZZ"],
  message: "Your order #123 has been confirmed.",
  from: "MyApp",      // optional registered shortcode
  bulkSMSMode: 1,     // required for bulk sends
  enqueue: 1,         // queue without waiting for telco ACK
});

console.log(result.SMSMessageData.Message);
// "Sent to 2/2 Total Cost: KES 1.6000"

for (const r of result.SMSMessageData.Recipients) {
  console.log(`${r.number}: statusCode=${r.statusCode} cost=${r.cost}`);
  // statusCode 101 = Sent (success)
  // statusCode 403 = InvalidPhoneNumber
}

// Always check SMSMessageData.Recipients[].statusCode for each number.
// In sandbox, a DeliveryFailure delivery report means you may not be logged into the simulator.
*/
