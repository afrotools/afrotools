/**
 * @provider Africa's Talking
 * @capability webhook_incoming_sms
 * @atss 1.1
 * @capability_type webhook
 */

// Africa's Talking POSTs incoming messages as application/x-www-form-urlencoded.
// Set the URL in the dashboard: SMS -> SMS Callback URLs -> Incoming Messages.

export interface IncomingSms {
  date: string;
  from: string; // the sender — reply with send_sms to this number
  id: string;
  text: string;
  to: string; // your shortcode
  networkCode: string;
  cost: string; // "KES 1.00"
  linkId?: string; // premium on-demand only
}

export function parseIncomingSms(rawBody: string): IncomingSms {
  const form = new URLSearchParams(rawBody);
  const from = form.get("from");
  const text = form.get("text");
  if (!from || text === null) throw new Error("Not an Africa's Talking incoming message");
  return {
    date: form.get("date") ?? "",
    from,
    id: form.get("id") ?? "",
    text,
    to: form.get("to") ?? "",
    networkCode: form.get("networkCode") ?? "",
    cost: form.get("cost") ?? "",
    linkId: form.get("linkId") ?? undefined,
  };
}

/*
Usage (Node, no framework):

import { createServer } from "node:http";

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    res.writeHead(200).end(); // the docs document no expected response; answer fast
    let sms: IncomingSms;
    try {
      sms = parseIncomingSms(raw); // untrusted: the docs describe no signature
    } catch {
      return; // not an incoming message — ignore it
    }
    console.log(`SMS from ${sms.from} to ${sms.to}: ${sms.text}`);
    // To answer, call send_sms with to: sms.from (a separate request).
  });
}).listen(3000);
*/
