/**
 * @provider Infobip
 * @capability webhook_sms_delivery_report
 * @atss 1.0
 * @capability_type webhook
 */

export type WebhookSmsDeliveryReportPayload = {
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

/**
 * Infobip's OpenAPI doesn't document a signature on this webhook (see gotchas): no verification step here.
 * Keep the endpoint URL unguessable and confirm critical updates with the matching report/log endpoint.
 */
export function parseInfobipReport(rawBody: string): WebhookSmsDeliveryReportPayload {
  return JSON.parse(rawBody) as WebhookSmsDeliveryReportPayload;
}

/*
Usage example (Express): answer 200 to accept the callback, then process every entry.

app.post("/webhooks/infobip/sms", express.text({ type: "application/json" }), (req, res) => {
  const payload = parseInfobipReport(req.body);
  res.sendStatus(200);
  for (const report of payload.results ?? []) {
    // Update the message found by report.messageId with this report's status.
    console.log(report.messageId, report.status?.groupName);
  }
});
*/
