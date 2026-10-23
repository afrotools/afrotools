/**
 * @provider Africa's Talking
 * @capability webhook_delivery_report
 * @atss 1.0
 * @capability_type webhook
 */

// Webhook payload types received from Africa's Talking
// AT POSTs as application/x-www-form-urlencoded

type DeliveryStatus =
  | "Sent"
  | "Submitted"
  | "Buffered"
  | "Rejected"
  | "Success"
  | "Failed"
  | "AbsentSubscriber"
  | "Expired";

type FailureReason =
  | "InsufficientCredit"
  | "InvalidLinkId"
  | "UserIsInactive"
  | "UserInBlackList"
  | "UserAccountSuspended"
  | "NotNetworkSubcriber"
  | "UserNotSubscribedToProduct"
  | "UserDoesNotExist"
  | "DeliveryFailure"
  | "DoNotDisturbRejection";

interface DeliveryReportPayload {
  id: string;
  status: DeliveryStatus;
  phoneNumber: string;
  networkCode: string;
  failureReason?: FailureReason;
  retryCount?: string; // AT sends form-encoded — parse to integer if needed
}

// Handler function — wire this to your web framework's POST route
export function handleDeliveryReport(payload: DeliveryReportPayload): void {
  const { id, status, phoneNumber, networkCode, failureReason } = payload;

  if (status === "Success") {
    // Message delivered to handset
    console.log(`SMS ${id} delivered to ${phoneNumber} via network ${networkCode}`);
  } else if (status === "Failed" || status === "Rejected") {
    // Handle failure — failureReason has details
    console.log(`SMS ${id} failed for ${phoneNumber}: ${failureReason ?? "unknown reason"}`);
  } else {
    // Intermediate statuses: Sent, Submitted, Buffered, AbsentSubscriber, Expired
    console.log(`SMS ${id} status update for ${phoneNumber}: ${status}`);
  }
}

/*
Usage (Express example):

import express from "express";
const app = express();

app.post("/sms/delivery-report", express.urlencoded({ extended: true }), (req, res) => {
  // Always respond 200 immediately — AT may retry on non-200 responses
  res.sendStatus(200);
  handleDeliveryReport(req.body as DeliveryReportPayload);
});

Configure callback URL: AT Dashboard → SMS → SMS Callback URLs → Delivery Reports

Notes:
- AT sends payloads as application/x-www-form-urlencoded (not JSON)
- "Success" status means delivered to handset — distinct from the "Success" in send_sms response
- failureReason is only present when status is "Rejected" or "Failed"
- In sandbox, networkCode "99999" means Athena (AT's test network)
*/
