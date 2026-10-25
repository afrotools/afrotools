/**
 * @provider Africa's Talking
 * @capability webhook_bulk_opt_out
 * @atss 1.1
 * @capability_type webhook
 */

// Africa's Talking POSTs opt-outs as application/x-www-form-urlencoded.
// Set the URL in the dashboard: SMS -> SMS Callback URLs -> Bulk SMS Opt Out.

export interface BulkOptOut {
  senderId: string; // the shortcode/alphanumeric sender id the user opted out from
  phoneNumber: string;
}

export function parseBulkOptOut(rawBody: string): BulkOptOut {
  const form = new URLSearchParams(rawBody);
  const senderId = form.get("senderId");
  const phoneNumber = form.get("phoneNumber");
  if (!senderId || !phoneNumber) throw new Error("Not an Africa's Talking bulk SMS opt-out");
  return { senderId, phoneNumber };
}

/** The opt-out is per sender ID: skip those numbers when sending with that senderId. */
export function excludeOptedOut(phoneNumbers: string[], senderId: string, optOuts: Set<string>): string[] {
  return phoneNumbers.filter((n) => !optOuts.has(`${senderId}|${n}`));
}

/*
Usage (Node, no framework). The docs describe no signature: treat the request as untrusted.

import { createServer } from "node:http";

const optOuts = new Set<string>(); // persist it in your database

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    res.writeHead(200).end(); // the docs document no expected response; answer fast
    try {
      const { senderId, phoneNumber } = parseBulkOptOut(raw);
      optOuts.add(`${senderId}|${phoneNumber}`);
    } catch {
      // not an opt-out notification — ignore it
    }
  });
}).listen(3000);

// Before each bulk send: phoneNumbers = excludeOptedOut(phoneNumbers, "MyBrand", optOuts)
*/
