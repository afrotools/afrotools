/**
 * @provider Infobip
 * @capability send_whatsapp_template
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

export type SendWhatsappTemplateInput = {
  messages: {
    from: string;
    to: string;
    messageId?: string;
    content: {
      templateName: string;
      templateData: {
        body: (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>);
        header?: (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>);
        buttons?: Array<((Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) & Record<string, unknown> & Record<string, unknown>) | ((Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown>) & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>) | (Record<string, unknown> & Record<string, unknown> & Record<string, unknown>)>;
        carousel?: Record<string, unknown>;
        limitedTimeOffer?: Record<string, unknown>;
      };
      language: string;
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
    smsFailover?: {
      from: string;
      text: string;
    };
    entityId?: string;
    applicationId?: string;
    context?: {
      replyToMessageId: string;
    };
  }[];
  bulkId?: string;
};

export type SendWhatsappTemplateResponse = {
  messages?: {
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
  }[];
  bulkId?: string;
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

export async function sendWhatsappTemplate(input: SendWhatsappTemplateInput): Promise<SendWhatsappTemplateResponse> {
  const url = `${INFOBIP_BASE_URL}/whatsapp/1/message/template`;
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

  return (await response.json()) as SendWhatsappTemplateResponse;
}

/*
Usage example:

const result = await sendWhatsappTemplate({
  messages: [
    {
      from: "2250700000001",
      to: "2250700000000",
      content: {
        templateName: "order_shipped",
        templateData: { body: { type: "POSITIONAL_PARAMETERS", placeholders: ["Awa", "#1042"] } },
        language: "fr",
      },
    },
  ],
});
console.log(result.bulkId, result.messages?.map((m) => m.status?.groupName));
*/
