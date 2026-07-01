/**
 * @provider Africa's Talking
 * @capability send_premium_sms
 * @atss 1.0
 * @capability_type synchronous
 */

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME;
if (!AFRICASTALKING_API_KEY) throw new Error("Missing env: AFRICASTALKING_API_KEY");
if (!AFRICASTALKING_USERNAME) throw new Error("Missing env: AFRICASTALKING_USERNAME");

const IS_SANDBOX = process.env.AFRICASTALKING_SANDBOX === "true";

// IMPORTANT: Production uses content.africastalking.com, NOT api.africastalking.com.
// Using api.africastalking.com for premium SMS will fail.
// Sandbox uses api.sandbox.africastalking.com (standard sandbox domain).
const PREMIUM_PRODUCTION_HOST = "content.africastalking.com";
const PREMIUM_SANDBOX_HOST = "api.sandbox.africastalking.com";
const PREMIUM_HOST = IS_SANDBOX ? PREMIUM_SANDBOX_HOST : PREMIUM_PRODUCTION_HOST;
const PREMIUM_URL = `https://${PREMIUM_HOST}/version1/messaging`;

interface SendPremiumSmsInput {
  to: string | string[];
  message: string;
  from: string;
  keyword?: string;
  enqueue?: number;
  linkId?: string;
  retryDurationInHours?: number;
  requestId?: string;
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

export async function sendPremiumSms(input: SendPremiumSmsInput): Promise<SendSmsResponse> {
  const to = Array.isArray(input.to) ? input.to.join(",") : input.to;

  const params = new URLSearchParams();
  // In sandbox mode, username must be the literal string "sandbox"
  params.set("username", IS_SANDBOX ? "sandbox" : AFRICASTALKING_USERNAME!);
  params.set("to", to);
  params.set("message", input.message);
  // from (registered shortcode) is required for premium SMS
  params.set("from", input.from);
  if (input.keyword !== undefined) params.set("keyword", input.keyword);
  if (input.enqueue !== undefined) params.set("enqueue", String(input.enqueue));
  if (input.linkId !== undefined) params.set("linkId", input.linkId);
  if (input.retryDurationInHours !== undefined)
    params.set("retryDurationInHours", String(input.retryDurationInHours));
  if (input.requestId !== undefined) params.set("requestId", input.requestId);

  const response = await fetch(PREMIUM_URL, {
    method: "POST",
    headers: {
      apiKey: AFRICASTALKING_API_KEY!,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Africa's Talking premium SMS error ${response.status}: ${errorText}`);
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
//   AFRICASTALKING_API_KEY=your_key
//   AFRICASTALKING_USERNAME=your_username
//   AFRICASTALKING_SANDBOX=true   (omit or set to "false" for production)

const result = await sendPremiumSms({
  to: ["+254711XXXYYY"],
  message: "Your premium subscription is active.",
  from: "12345",           // registered shortcode — required for premium SMS
  requestId: "order-789",  // echoed in DLR callback for correlation
  keyword: "JOIN",
  retryDurationInHours: 12,
});

console.log(result.SMSMessageData.Message);
// "Sent to 1/1 Total Cost: KES 5.0000"

for (const r of result.SMSMessageData.Recipients) {
  console.log(`${r.number}: statusCode=${r.statusCode}`);
  // statusCode 101 = Sent (success)
}

// IMPORTANT: Production uses content.africastalking.com — NOT api.africastalking.com
// The requestId is echoed back in Africa's Talking's HTTP DLR callback
// so you can match delivery reports to your sends.
*/
