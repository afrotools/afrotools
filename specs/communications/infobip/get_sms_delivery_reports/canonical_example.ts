/**
 * @provider Infobip
 * @capability get_sms_delivery_reports
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

export type GetSmsDeliveryReportsInput = {
  bulkId?: string;
  messageId?: string;
  limit?: number;
  entityId?: string;
  applicationId?: string;
  campaignReferenceId?: string;
};

export type GetSmsDeliveryReportsResponse = {
  results?: {
    bulkId?: string;
    price?: {
      pricePerMessage?: number;
      currency?: string;
    };
    status?: {
      groupId?: number;
      groupName?: "ACCEPTED" | "PENDING" | "UNDELIVERABLE" | "DELIVERED" | "EXPIRED" | "REJECTED";
      id?: number;
      name?: string;
      description?: string;
      action?: string;
    };
    error?: {
      groupId?: number;
      groupName?: "OK" | "HANDSET_ERRORS" | "USER_ERRORS" | "OPERATOR_ERRORS";
      id?: number;
      name?: string;
      description?: string;
      permanent?: boolean;
    };
    messageId?: string;
    to?: string;
    sender?: string;
    sentAt?: string;
    doneAt?: string;
    messageCount?: number;
    mccMnc?: string;
    callbackData?: string;
    platform?: {
      entityId?: string;
      applicationId?: string;
    };
    campaignReferenceId?: string;
  }[];
};

export async function getSmsDeliveryReports(input: GetSmsDeliveryReportsInput): Promise<GetSmsDeliveryReportsResponse> {
  const { bulkId, messageId, limit, entityId, applicationId, campaignReferenceId } = input;
  const query = new URLSearchParams();
  if (bulkId !== undefined) query.set("bulkId", String(bulkId));
  if (messageId !== undefined) query.set("messageId", String(messageId));
  if (limit !== undefined) query.set("limit", String(limit));
  if (entityId !== undefined) query.set("entityId", String(entityId));
  if (applicationId !== undefined) query.set("applicationId", String(applicationId));
  if (campaignReferenceId !== undefined) query.set("campaignReferenceId", String(campaignReferenceId));
  const qs = query.toString();
  const url = `${INFOBIP_BASE_URL}/sms/3/reports${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    // No error body is documented for this endpoint.
    throw new Error(`Infobip ${response.status}: ${await response.text().catch(() => response.statusText)}`);
  }

  return (await response.json()) as GetSmsDeliveryReportsResponse;
}

/*
Usage example:

const { results } = await getSmsDeliveryReports({ limit: 100 });
for (const report of results ?? []) {
  // Persist now: the same report won't be returned again.
  console.log(report.messageId, report.status?.groupName);
}
*/
