/**
 * @provider Infobip
 * @capability resend_2fa_pin_sms
 * @atss 1.0
 * @capability_type synchronous
 */

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL; // your account's base URL, e.g. https://xxxxx.api.infobip.com
if (!INFOBIP_API_KEY) throw new Error("Missing env: INFOBIP_API_KEY");
// Only ever send the API key to an Infobip host.
if (!INFOBIP_BASE_URL || !/^https:\/\/[\w-]+\.api\.infobip\.com$/.test(INFOBIP_BASE_URL)) {
  throw new Error("INFOBIP_BASE_URL must be your Infobip base URL, https://xxxxx.api.infobip.com");
}

export type Resend2faPinSmsInput = {
  pinId: string;
  placeholders?: Record<string, unknown>;
  trackDelivery?: boolean;
};

export type Resend2faPinSmsResponse = {
  callStatus?: string;
  externalMessageId?: string;
  ncStatus?: string;
  pinId?: string;
  smsStatus?: string;
  to?: string;
};

type InfobipError = {
  requestError?: {
    serviceException?: {
      messageId?: string;
      text?: string;
    };
  };
};

export async function resend2faPinSms(input: Resend2faPinSmsInput): Promise<Resend2faPinSmsResponse> {
  const { pinId, ...body } = input;
  const url = `${INFOBIP_BASE_URL}/2fa/2/pin/${pinId}/resend`;
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

  return (await response.json()) as Resend2faPinSmsResponse;
}

/*
Usage example:

const again = await resend2faPinSms({ pinId: "9C817C6F8AF3D48F9FE553282AFA2B67" });
console.log(again.smsStatus);
*/
