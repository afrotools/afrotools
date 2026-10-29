/**
 * @provider Infobip
 * @capability create_2fa_message_template
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

export type Create2faMessageTemplateInput = {
  appId: string;
  language?: string;
  messageText: string;
  pinLength?: number;
  pinType: "NUMERIC" | "ALPHA" | "HEX" | "ALPHANUMERIC";
  repeatDTMF?: string;
  senderId?: string;
  speechRate?: number;
  voiceName?: string;
};

export type Create2faMessageTemplateResponse = {
  applicationId?: string;
  language?: string;
  messageId?: string;
  messageText?: string;
  pinLength?: number;
  pinPlaceholder?: string;
  pinType?: "NUMERIC" | "ALPHA" | "HEX" | "ALPHANUMERIC";
  repeatDTMF?: string;
  senderId?: string;
  speechRate?: number;
  voiceName?: string;
};

type InfobipError = {
  requestError?: {
    serviceException?: {
      messageId?: string;
      text?: string;
    };
  };
};

export async function create2faMessageTemplate(input: Create2faMessageTemplateInput): Promise<Create2faMessageTemplateResponse> {
  const { appId, ...body } = input;
  const url = `${INFOBIP_BASE_URL}/2fa/2/applications/${appId}/messages`;
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

  return (await response.json()) as Create2faMessageTemplateResponse;
}

/*
Usage example:

const template = await create2faMessageTemplate({
  appId: "HJ675435E3A6EA43432G5F37A635KJ8B",
  messageText: "Your MyShop code is {{pin}}",
  pinLength: 6,
  pinType: "NUMERIC",
  senderId: process.env.INFOBIP_SMS_SENDER,
});
console.log(template.messageId);
*/
