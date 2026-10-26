/**
 * @provider Infobip
 * @capability verify_2fa_pin
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

export type Verify2faPinInput = {
  pinId: string;
  pin: string;
};

export type Verify2faPinResponse = {
  attemptsRemaining?: number;
  msisdn?: string;
  pinError?: "TTL_EXPIRED" | "WRONG_PIN" | "NO_MORE_PIN_ATTEMPTS";
  pinId?: string;
  verified?: boolean;
};

type InfobipError = {
  requestError?: {
    serviceException?: {
      messageId?: string;
      text?: string;
    };
  };
};

export async function verify2faPin(input: Verify2faPinInput): Promise<Verify2faPinResponse> {
  const { pinId, ...body } = input;
  const url = `${INFOBIP_BASE_URL}/2fa/2/pin/${pinId}/verify`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<InfobipError>;
    const detail = error.requestError?.serviceException;
    throw new Error(`Infobip ${response.status} ${detail?.messageId ?? ""}: ${detail?.text ?? response.statusText}`);
  }

  return (await response.json()) as Verify2faPinResponse;
}

/*
Usage example:

const check = await verify2faPin({ pinId: "9C817C6F8AF3D48F9FE553282AFA2B67", pin: "123456" });
if (check.verified) {
  // log the user in
} else {
  console.log("wrong PIN", check.pinError, check.attemptsRemaining);
}
*/
