/**
 * @provider Africa's Talking
 * @capability create_subscription
 * @atss 1.0
 * @capability_type synchronous
 */

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME;
if (!AFRICASTALKING_API_KEY) throw new Error("Missing env: AFRICASTALKING_API_KEY");
if (!AFRICASTALKING_USERNAME) throw new Error("Missing env: AFRICASTALKING_USERNAME");

const isSandbox = process.env.AFRICASTALKING_SANDBOX === "true";
// Production: content.africastalking.com — NOT api.africastalking.com (common mistake)
// Sandbox:    api.sandbox.africastalking.com
const SUBSCRIPTION_BASE = isSandbox
  ? "https://api.sandbox.africastalking.com"
  : "https://content.africastalking.com";

interface CreateSubscriptionInput {
  shortCode: string;
  keyword?: string;
  requestId?: string;
  redirectUrl?: string;
  phoneNumber?: string;
  sourceIP?: string;
  userAgent?: string;
}

interface CreateSubscriptionResponse {
  responseCode: string;
  status: string;
  transactionId: string;
  /** Only present in HE (Header Enrichment) mode. Absent in Subscribe Manage mode. */
  url?: string;
}

interface AfricasTalkingSubscriptionError {
  responseCode: string;
  status: string;
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResponse> {
  const params = new URLSearchParams();
  params.set("username", AFRICASTALKING_USERNAME!);
  params.set("shortCode", input.shortCode);
  if (input.keyword !== undefined) params.set("keyword", input.keyword);
  if (input.requestId !== undefined) params.set("requestId", input.requestId);
  if (input.redirectUrl !== undefined) params.set("redirectUrl", input.redirectUrl);
  if (input.phoneNumber !== undefined) params.set("phoneNumber", input.phoneNumber);
  if (input.sourceIP !== undefined) params.set("sourceIP", input.sourceIP);
  if (input.userAgent !== undefined) params.set("userAgent", input.userAgent);

  const url = `${SUBSCRIPTION_BASE}/version1/subscription/safaricom`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apiKey: AFRICASTALKING_API_KEY!,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data: CreateSubscriptionResponse | AfricasTalkingSubscriptionError =
    await response.json();

  if (!response.ok || (data as CreateSubscriptionResponse).responseCode !== "Success") {
    const err = data as AfricasTalkingSubscriptionError;
    throw new Error(
      `Africa's Talking subscription error: responseCode=${err.responseCode}, status=${err.status}`
    );
  }

  return data as CreateSubscriptionResponse;
}

/*
Usage example:

// HE mode (user on Safaricom mobile data) — response includes url for redirect
// Subscribe Manage mode (user on Wi-Fi or non-Safaricom) — response has no url field
const result = await createSubscription({
  shortCode: "12345",
  keyword: "NEWS",
  phoneNumber: "+254711082282",
  requestId: "req_abc123",
  redirectUrl: "https://myapp.com/subscription-confirmed",
});

console.log(`transactionId: ${result.transactionId}`);
if (result.url) {
  // HE mode: redirect the user to result.url to confirm subscription
  console.log(`Redirect user to: ${result.url}`);
} else {
  // Subscribe Manage mode: user receives a USSD prompt on their device
  console.log("USSD prompt sent to user's device");
}

// Set AFRICASTALKING_SANDBOX=true to use the sandbox environment
// Production URL: content.africastalking.com (NOT api.africastalking.com)
*/
