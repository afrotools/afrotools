/**
 * @provider Africa's Talking
 * @capability webhook_incoming_sms
 * @atss 1.0
 * @capability_type webhook
 */

// Webhook payload types received from Africa's Talking
// AT POSTs as application/x-www-form-urlencoded

interface IncomingSmsPayload {
  date: string;
  from: string;
  id: string;
  linkId?: string; // Only present for on-demand premium SMS
  text: string;
  to: string;
  cost: string; // Format: "KES 1.00"
  networkCode: string;
}

// Handler function — wire this to your web framework's POST route
export function handleIncomingSms(payload: IncomingSmsPayload): void {
  const { id, from, to, text, date, linkId } = payload;

  console.log(`Received SMS ${id} from ${from} to shortcode ${to} at ${date}: "${text}"`);

  if (linkId) {
    // On-demand premium SMS — user is requesting a service
    // Must reply using send_premium_sms with this linkId
    console.log(`On-demand premium SMS — linkId: ${linkId}. Use this in send_premium_sms reply.`);
  }

  // Process the message content
  const command = text.trim().toUpperCase();
  if (command === "HELP") {
    // Reply to user via send_sms or send_premium_sms
  }
}

/*
Usage (Express example):

import express from "express";
const app = express();

app.post("/sms/incoming", express.urlencoded({ extended: true }), (req, res) => {
  // Always respond 200 immediately
  res.sendStatus(200);
  handleIncomingSms(req.body as IncomingSmsPayload);
});

Configure callback URL: AT Dashboard → SMS → SMS Callback URLs → Incoming Messages

Notes:
- AT sends payloads as application/x-www-form-urlencoded (not JSON)
- AT strongly recommends this webhook over polling the fetch_messages endpoint
- linkId is only present for on-demand premium SMS — pass it in send_premium_sms when replying
- cost field format is "KES 1.00" — currency code + space + decimal amount
*/
