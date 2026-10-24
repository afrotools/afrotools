/**
 * @provider Infobip
 * @capability send_2fa_pin_sms
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

export type Send2faPinSmsInput = {
  ncNeeded?: boolean;
  applicationId: string;
  from?: string;
  messageId: string;
  placeholders?: Record<string, unknown>;
  to: string;
  trackDelivery?: boolean;
};

export type Send2faPinSmsResponse = {
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

export async function send2faPinSms(input: Send2faPinSmsInput): Promise<Send2faPinSmsResponse> {
  const { ncNeeded, ...body } = input;
  const query = new URLSearchParams();
  if (ncNeeded !== undefined) query.set("ncNeeded", String(ncNeeded));
  const qs = query.toString();
  const url = `${INFOBIP_BASE_URL}/2fa/2/pin${qs ? `?${qs}` : ""}`;
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

  return (await response.json()) as Send2faPinSmsResponse;
}

/*
Usage example:

const pin = await send2faPinSms({
  applicationId: "YOUR_2FA_APPLICATION_ID", // from create_2fa_application
  messageId: "YOUR_2FA_MESSAGE_ID", // from create_2fa_message_template
  to: "2250700000000",
});
if (pin.smsStatus !== "MESSAGE_SENT") throw new Error("PIN not sent");
// Keep pin.pinId with the login attempt (session, DB) — never the PIN itself.
*/
