/**
 * @provider Infobip
 * @capability webhook_whatsapp_delivery_report
 * @atss 1.1
 * @capability_type webhook
 */

export type WebhookWhatsappDeliveryReportPayload = {
  results?: {
    bulkId?: string;
    price?: {
      currency?: string;
      pricePerMessage?: number;
    };
    status?: {
      groupName?: string;
      id?: number;
      groupId?: number;
      name?: string;
      action?: string;
      description?: string;
    };
    error?: {
      description?: string;
      permanent?: boolean;
      name?: string;
      id?: number;
      groupName?: string;
      groupId?: number;
    };
    messageId?: string;
    doneAt?: string;
    messageCount?: number;
    sentAt?: string;
    to?: string;
    contact?: {
      name?: string;
      phoneNumber?: string;
      userId?: string;
      parentUserId?: string;
      username?: string;
    };
  }[];
};

/**
 * Infobip's OpenAPI doesn't document a signature on this webhook (see gotchas): no verification step here.
 * Keep the endpoint URL unguessable and confirm critical updates with the matching report/log endpoint.
 */
export function parseInfobipReport(rawBody: string): WebhookWhatsappDeliveryReportPayload {
  return JSON.parse(rawBody) as WebhookWhatsappDeliveryReportPayload;
}

/*
Usage example (Express): answer 200 to accept the callback, then process every entry.

app.post("/webhooks/infobip/whatsapp", express.text({ type: "application/json" }), (req, res) => {
  const payload = parseInfobipReport(req.body);
  res.sendStatus(200);
  for (const report of payload.results ?? []) {
    // Update the message found by report.messageId with this report's status.
    console.log(report.messageId, report.status?.groupName);
  }
});
*/
