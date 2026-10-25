/**
 * @provider Infobip
 * @capability create_2fa_application
 * @atss 1.1
 * @capability_type synchronous
 */

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL; // your account's base URL, e.g. https://xxxxx.api.infobip.com
if (!INFOBIP_API_KEY) throw new Error("Missing env: INFOBIP_API_KEY");
// Only ever send the API key to an Infobip host.
if (!INFOBIP_BASE_URL || !/^https:\/\/[\w-]+\.api\.infobip\.com$/.test(INFOBIP_BASE_URL)) {
  throw new Error("INFOBIP_BASE_URL must be your Infobip base URL, https://xxxxx.api.infobip.com");
}

export type Create2faApplicationInput = {
  configuration?: {
    allowMultiplePinVerifications?: boolean;
    pinAttempts?: number;
    pinTimeToLive?: string;
    sendPinPerApplicationLimit?: string;
    sendPinPerPhoneNumberLimit?: string;
    verifyPinLimit?: string;
  };
  enabled?: boolean;
  name: string;
};

export type Create2faApplicationResponse = {
  applicationId?: string;
  configuration?: {
    allowMultiplePinVerifications?: boolean;
    pinAttempts?: number;
    pinTimeToLive?: string;
    sendPinPerApplicationLimit?: string;
    sendPinPerPhoneNumberLimit?: string;
    verifyPinLimit?: string;
  };
  enabled?: boolean;
  name?: string;
};

type InfobipError = {
  requestError?: {
    serviceException?: {
      messageId?: string;
      text?: string;
    };
  };
};

export async function create2faApplication(input: Create2faApplicationInput): Promise<Create2faApplicationResponse> {
  const url = `${INFOBIP_BASE_URL}/2fa/2/applications`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<InfobipError>;
    const detail = error.requestError?.serviceException;
    throw new Error(`Infobip ${response.status} ${detail?.messageId ?? ""}: ${detail?.text ?? response.statusText}`);
  }

  return (await response.json()) as Create2faApplicationResponse;
}

/*
Usage example:

const app = await create2faApplication({
  name: "MyShop login",
  enabled: true,
  configuration: { pinAttempts: 5, pinTimeToLive: "10m", sendPinPerPhoneNumberLimit: "5/1d", verifyPinLimit: "3/1m" },
});
// Store app.applicationId (e.g. in configuration): every PIN send needs it.
console.log(app.applicationId);
*/
