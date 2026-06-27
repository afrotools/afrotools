/**
 * @provider Africa's Talking
 * @capability webhook_bulk_opt_out
 * @atss 1.0
 * @capability_type webhook
 */

// Webhook payload types received from Africa's Talking
// AT POSTs as application/x-www-form-urlencoded

interface BulkOptOutPayload {
  senderId: string;
  phoneNumber: string;
}

// Handler function — wire this to your web framework's POST route
export function handleBulkOptOut(payload: BulkOptOutPayload): void {
  const { senderId, phoneNumber } = payload;

  // IMPORTANT: You must honor this opt-out.
  // Store the opted-out phone number and exclude it from future sends
  // to avoid being flagged as a spammer.
  console.log(`Opt-out received: ${phoneNumber} opted out from sender ${senderId}`);

  // Add to your opt-out list (example: database update)
  // await db.optOuts.upsert({ phoneNumber, senderId, optedOutAt: new Date() });
}

/*
Usage (Express example):

import express from "express";
const app = express();

app.post("/sms/opt-out", express.urlencoded({ extended: true }), (req, res) => {
  // Always respond 200 immediately
  res.sendStatus(200);
  handleBulkOptOut(req.body as BulkOptOutPayload);
});

Configure callback URL: AT Dashboard → SMS → SMS Callback URLs → Bulk SMS Opt Out

Notes:
- AT sends payloads as application/x-www-form-urlencoded (not JSON)
- AT automatically appends opt-out instructions to the FIRST message sent to each subscriber
- Subsequent messages to the same subscriber are sent without the opt-out instructions
- You must honor opt-outs — failure to do so risks being flagged as a spammer
*/
