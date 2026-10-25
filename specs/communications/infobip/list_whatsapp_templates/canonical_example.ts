/**
 * @provider Infobip
 * @capability list_whatsapp_templates
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

type TemplateStatus =
  | "APPROVED" | "IN_APPEAL" | "PENDING" | "REJECTED" | "PENDING_DELETION" | "DELETED" | "REINSTATED"
  | "FLAGGED" | "FIRST_PAUSED" | "SECOND_PAUSED" | "DISABLED" | "ARCHIVED" | "UNKNOWN";
type TemplateCategory = "MARKETING" | "AUTHENTICATION" | "UTILITY";

export type ListWhatsappTemplatesInput = {
  sender?: string[];
  status?: TemplateStatus[];
  name?: string;
  language?: string[]; // e.g. "fr", "en_US", "fr_CI" — the full list is input_schema's language enum
  category?: TemplateCategory[];
  applicationId?: string;
  entityId?: string;
  page?: number;
  size?: number;
  orderBy?: string;
};

// The fields a sender needs to pick and fill a template. The full shape (every header format,
// button type, carousel, limited-time offer…) is the spec's response_schema.
export type WhatsappTemplate = {
  id?: string;
  businessAccountId?: number;
  name?: string;
  language?: string;
  status?: TemplateStatus;
  category?: TemplateCategory;
  structure: {
    header?: { format: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION"; text?: string } & Record<string, unknown>;
    body: { text: string };
    footer?: { text: string };
    buttons?: Array<{ type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO"; text?: string } & Record<string, unknown>>;
    type?: "TEXT" | "MEDIA" | "UNSUPPORTED";
  } & Record<string, unknown>;
  quality?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  createdAt?: string;
  lastUpdatedAt?: string;
} & Record<string, unknown>;

export type ListWhatsappTemplatesResponse = {
  results: WhatsappTemplate[];
  paging: {
    page: number;
    size: number;
    totalPages: number;
    totalResults: number;
  };
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

export async function listWhatsappTemplates(input: ListWhatsappTemplatesInput): Promise<ListWhatsappTemplatesResponse> {
  const { sender, status, name, language, category, applicationId, entityId, page, size, orderBy } = input;
  const query = new URLSearchParams();
  for (const value of sender ?? []) query.append("sender", String(value));
  for (const value of status ?? []) query.append("status", String(value));
  if (name !== undefined) query.set("name", String(name));
  for (const value of language ?? []) query.append("language", String(value));
  for (const value of category ?? []) query.append("category", String(value));
  if (applicationId !== undefined) query.set("applicationId", String(applicationId));
  if (entityId !== undefined) query.set("entityId", String(entityId));
  if (page !== undefined) query.set("page", String(page));
  if (size !== undefined) query.set("size", String(size));
  if (orderBy !== undefined) query.set("orderBy", String(orderBy));
  const qs = query.toString();
  const url = `${INFOBIP_BASE_URL}/whatsapp/1/templates${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<InfobipError>;
    // 400 bodies use errorCode/description; the documented 401 body uses requestError.serviceException.
    const legacy = (error as { requestError?: { serviceException?: { messageId?: string; text?: string } } }).requestError?.serviceException;
    throw new Error(`Infobip ${response.status} ${error.errorCode ?? legacy?.messageId ?? ""}: ${error.description ?? legacy?.text ?? response.statusText}`);
  }

  return (await response.json()) as ListWhatsappTemplatesResponse;
}

/*
Usage example:

const { results, paging } = await listWhatsappTemplates({ sender: ["2250700000001"], status: ["APPROVED"], size: 50 });
console.log(paging.totalResults, results?.map((t) => `${t.name} (${t.language})`));
*/
