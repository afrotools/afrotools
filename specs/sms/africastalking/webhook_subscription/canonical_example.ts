/**
 * @provider Africa's Talking
 * @capability webhook_subscription
 * @atss 1.0
 * @capability_type webhook
 */

// Webhook payload types received from Africa's Talking
// AT POSTs as application/x-www-form-urlencoded

type UpdateType = "addition" | "deletion";

interface SubscriptionPayload {
  phoneNumber: string;
  shortCode: string;
  keyword: string;
  updateType: UpdateType;
}

// Handler function — wire this to your web framework's POST route
export function handleSubscription(payload: SubscriptionPayload): void {
  const { phoneNumber, shortCode, keyword, updateType } = payload;

  if (updateType === "addition") {
    // New subscriber — add to your subscriber list
    console.log(`New subscriber: ${phoneNumber} subscribed to ${shortCode}/${keyword}`);
    // await db.subscribers.upsert({ phoneNumber, shortCode, keyword, subscribedAt: new Date() });
  } else if (updateType === "deletion") {
    // Unsubscribe — remove from your subscriber list
    console.log(`Unsubscribe: ${phoneNumber} unsubscribed from ${shortCode}/${keyword}`);
    // await db.subscribers.delete({ phoneNumber, shortCode, keyword });
  }

  // IMPORTANT: Africa's Talking does not expose a subscriber list API.
  // This webhook is your only source of truth — maintain your own list.
}

/*
Usage (Express example):

import express from "express";
const app = express();

app.post("/sms/subscription", express.urlencoded({ extended: true }), (req, res) => {
  // Always respond 200 immediately
  res.sendStatus(200);
  handleSubscription(req.body as SubscriptionPayload);
});

Configure callback URL: AT Dashboard → SMS → SMS Callback URLs → Subscription Notifications

Notes:
- AT sends payloads as application/x-www-form-urlencoded (not JSON)
- updateType is "addition" (subscribe) or "deletion" (unsubscribe)
- Africa's Talking does not expose a subscriber list API — maintain your own list
  by recording every addition and deletion event from this webhook
*/
