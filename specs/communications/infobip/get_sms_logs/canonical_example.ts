/**
 * @provider Infobip
 * @capability get_sms_logs
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

export type GetSmsLogsInput = {
  mcc?: string;
  mnc?: string;
  sender?: string;
  destination?: string;
  bulkId?: string[];
  messageId?: string[];
  generalStatus?: "ACCEPTED" | "PENDING" | "UNDELIVERABLE" | "DELIVERED" | "EXPIRED" | "REJECTED";
  sentSince?: string;
  sentUntil?: string;
  limit?: number;
  entityId?: string;
  applicationId?: string;
  campaignReferenceId?: string[];
  useCursor?: boolean;
  cursor?: string;
};

export type GetSmsLogsResponse = {
  results?: {
    sender?: string;
    destination?: string;
    bulkId?: string;
    messageId?: string;
    sentAt?: string;
    doneAt?: string;
    messageCount?: number;
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
    platform?: {
      entityId?: string;
      applicationId?: string;
    };
    content?: ({
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
    campaignReferenceId?: string;
    mccMnc?: string;
  }[];
  cursor?: {
    limit?: number;
    nextCursor?: string;
  };
};

export async function getSmsLogs(input: GetSmsLogsInput): Promise<GetSmsLogsResponse> {
  const { mcc, mnc, sender, destination, bulkId, messageId, generalStatus, sentSince, sentUntil, limit, entityId, applicationId, campaignReferenceId, useCursor, cursor } = input;
  const query = new URLSearchParams();
  if (mcc !== undefined) query.set("mcc", String(mcc));
  if (mnc !== undefined) query.set("mnc", String(mnc));
  if (sender !== undefined) query.set("sender", String(sender));
  if (destination !== undefined) query.set("destination", String(destination));
  for (const value of bulkId ?? []) query.append("bulkId", String(value));
  for (const value of messageId ?? []) query.append("messageId", String(value));
  if (generalStatus !== undefined) query.set("generalStatus", String(generalStatus));
  if (sentSince !== undefined) query.set("sentSince", String(sentSince));
  if (sentUntil !== undefined) query.set("sentUntil", String(sentUntil));
  if (limit !== undefined) query.set("limit", String(limit));
  if (entityId !== undefined) query.set("entityId", String(entityId));
  if (applicationId !== undefined) query.set("applicationId", String(applicationId));
  for (const value of campaignReferenceId ?? []) query.append("campaignReferenceId", String(value));
  if (useCursor !== undefined) query.set("useCursor", String(useCursor));
  if (cursor !== undefined) query.set("cursor", String(cursor));
  const qs = query.toString();
  const url = `${INFOBIP_BASE_URL}/sms/3/logs${qs ? `?${qs}` : ""}`;
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

  return (await response.json()) as GetSmsLogsResponse;
}

/*
Usage example:

const { results } = await getSmsLogs({ destination: "2250700000000", limit: 20 });
for (const log of results ?? []) {
  console.log(log.messageId, log.status?.groupName);
}
*/
