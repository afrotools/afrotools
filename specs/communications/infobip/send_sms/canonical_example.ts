/**
 * @provider Infobip
 * @capability send_sms
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

export type SendSmsInput = {
  messages: {
    sender?: string;
    destinations: {
      to: string;
      messageId?: string;
      networkId?: number;
    }[];
    content: ({
      text?: string;
      transliteration?: "NONE" | "TURKISH" | "GREEK" | "CYRILLIC" | "SERBIAN_CYRILLIC" | "CENTRAL_EUROPEAN" | "BALTIC" | "NON_UNICODE" | "PORTUGUESE" | "COLOMBIAN" | "BULGARIAN_CYRILLIC" | "ALL";
      language?: {
        languageCode?: "NONE" | "TR" | "ES" | "PT" | "AUTODETECT";
        singleShift?: boolean;
        lockingShift?: boolean;
      };
    }) | ({
      dataCoding?: number;
      esmClass?: number;
      hex?: string;
    });
    options?: {
      platform?: {
        entityId?: string;
        applicationId?: string;
      };
      validityPeriod?: {
        amount: number;
        timeUnit?: "SECONDS" | "MINUTES" | "HOURS";
      };
      deliveryTimeWindow?: {
        days: Array<"MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY">;
        from?: Record<string, unknown>;
        to?: Record<string, unknown>;
      };
      campaignReferenceId?: string;
      regional?: {
        indiaDlt?: Record<string, unknown>;
        turkeyIys?: Record<string, unknown>;
        southKorea?: Record<string, unknown>;
      };
      flash?: boolean;
    };
    webhooks?: {
      delivery?: {
        url?: string;
        intermediateReport?: boolean;
        notify?: boolean;
      };
      contentType?: string;
      callbackData?: string;
    };
  }[];
  options?: {
    schedule?: {
      bulkId?: string;
      sendAt?: string;
      sendingSpeedLimit?: {
        amount: number;
        timeUnit?: "MINUTE" | "HOUR" | "DAY";
      };
    };
    tracking?: {
      shortenUrl?: boolean;
      trackClicks?: boolean;
      trackingUrl?: string;
      removeProtocol?: boolean;
      customDomain?: string;
    };
    includeSmsCountInResponse?: boolean;
    conversionTracking?: {
      useConversionTracking?: boolean;
      conversionTrackingName?: string;
    };
  };
};

export type SendSmsResponse = {
  bulkId?: string;
  messages: {
    messageId?: string;
    status?: {
      groupId?: number;
      groupName?: "ACCEPTED" | "PENDING" | "UNDELIVERABLE" | "DELIVERED" | "EXPIRED" | "REJECTED";
      id?: number;
      name?: string;
      description?: string;
      action?: string;
    };
    destination?: string;
    details?: {
      messageCount?: number;
    };
  }[];
};

type InfobipError = {
  errorCode: string;
  description: string;
  action: string;
  violations: {
    property?: string;
    violation?: string;
  }[];
  resources: {
    name?: string;
    url?: string;
  }[];
};

export async function sendSms(input: SendSmsInput): Promise<SendSmsResponse> {
  const url = `${INFOBIP_BASE_URL}/sms/3/messages`;
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
    // 400 bodies use errorCode/description; the documented 401 body uses requestError.serviceException.
    const legacy = (error as { requestError?: { serviceException?: { messageId?: string; text?: string } } }).requestError?.serviceException;
    throw new Error(`Infobip ${response.status} ${error.errorCode ?? legacy?.messageId ?? ""}: ${error.description ?? legacy?.text ?? response.statusText}`);
  }

  return (await response.json()) as SendSmsResponse;
}

/*
Usage example:

const result = await sendSms({
  messages: [
    {
      sender: "MyShop", // registered alphanumeric sender (ServiceSMS on a free trial)
      destinations: [{ to: "2250700000000" }],
      content: { text: "Your order #1042 has shipped." },
      webhooks: { delivery: { url: "https://example.com/webhooks/infobip/sms" } },
    },
  ],
});
for (const message of result.messages ?? []) {
  // Store message.messageId: the delivery report will carry it.
  console.log(message.messageId, message.status?.groupName);
}
*/
