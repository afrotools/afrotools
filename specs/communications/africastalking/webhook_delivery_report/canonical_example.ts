/**
 * @provider Africa's Talking
 * @capability webhook_delivery_report
 * @atss 1.1
 * @capability_type webhook
 */

// Africa's Talking POSTs delivery reports as application/x-www-form-urlencoded.
// Set the URL in the dashboard: SMS -> SMS Callback URLs -> Delivery Reports.

type DeliveryStatus =
  | "Sent"
  | "Submitted"
  | "Buffered"
  | "Rejected"
  | "Success"
  | "Failed"
  | "AbsentSubscriber"
  | "Expired";

// Only the statuses the docs mark as "a final status". Whether AbsentSubscriber and Expired are
// final is not documented.
const FINAL_STATUSES = new Set<DeliveryStatus>(["Rejected", "Success", "Failed"]);

export interface DeliveryReport {
  id: string; // = messageId of the send_sms response
  status: DeliveryStatus;
  phoneNumber: string;
  networkCode: string; // "99999" = Athena, the sandbox
  failureReason?: string; // only when status is Rejected or Failed
  retryCount?: number; // premium SMS only
}

export function parseDeliveryReport(rawBody: string): DeliveryReport {
  const form = new URLSearchParams(rawBody);
  const id = form.get("id");
  const status = form.get("status") as DeliveryStatus | null;
  if (!id || !status) throw new Error("Not an Africa's Talking delivery report");
  const retryCount = form.get("retryCount");
  return {
    id,
    status,
    phoneNumber: form.get("phoneNumber") ?? "",
    networkCode: form.get("networkCode") ?? "",
    failureReason: form.get("failureReason") ?? undefined,
    retryCount: retryCount === null ? undefined : Number(retryCount),
  };
}

/**
 * The docs describe no signature: only act on ids you sent (`knownMessageIds`),
 * and keep the callback URL unguessable.
 */
export function handleDeliveryReport(
  rawBody: string,
  knownMessageIds: Set<string>
): { report: DeliveryReport; final: boolean } | null {
  const report = parseDeliveryReport(rawBody);
  if (!knownMessageIds.has(report.id)) return null;
  return { report, final: FINAL_STATUSES.has(report.status) };
}

/*
Usage (Node, no framework):

import { createServer } from "node:http";

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    res.writeHead(200).end(); // the docs document no expected response; answer fast
    try {
      const result = handleDeliveryReport(raw, sentMessageIds);
      if (result?.final && result.report.status !== "Success") {
        console.warn(`SMS ${result.report.id} not delivered: ${result.report.failureReason ?? result.report.status}`);
      }
    } catch {
      // not a delivery report: the URL is public and unsigned — ignore it
    }
  });
}).listen(3000);
*/
