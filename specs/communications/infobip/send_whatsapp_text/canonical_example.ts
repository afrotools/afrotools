/**
 * @provider Infobip
 * @capability send_whatsapp_text
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

export type SendWhatsappTextInput = {
  from: string;
  to: string;
  messageId?: string;
  content: {
    text: string;
    previewUrl?: boolean;
  };
  callbackData?: string;
  notifyUrl?: string;
  urlOptions?: {
    shortenUrl?: boolean;
    trackClicks?: boolean;
    trackingUrl?: string;
    removeProtocol?: boolean;
    customDomain?: string;
  };
  entityId?: string;
  applicationId?: string;
  context?: {
    replyToMessageId: string;
  };
};

export type SendWhatsappTextResponse = {
  to?: string;
  messageCount?: number;
  messageId?: string;
  status?: {
    groupId?: number;
    groupName?: string;
    id?: number;
    name?: string;
    description?: string;
    action?: string;
  };
};

type InfobipError = {
  requestError?: {
    serviceException?: {
      messageId?: string;
      text?: string;
      validationErrors?: Record<string, unknown>;
    };
  };
};

export async function sendWhatsappText(input: SendWhatsappTextInput): Promise<SendWhatsappTextResponse> {
  const url = `${INFOBIP_BASE_URL}/whatsapp/1/message/text`;
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

  return (await response.json()) as SendWhatsappTextResponse;
}

/*
Usage example:

const sent = await sendWhatsappText({
  from: "2250700000001", // your registered WhatsApp sender
  to: "2250700000000",
  content: { text: "Hi Awa, your table is ready." },
  notifyUrl: "https://example.com/webhooks/infobip/whatsapp",
});
console.log(sent.messageId, sent.status?.groupName);
*/
