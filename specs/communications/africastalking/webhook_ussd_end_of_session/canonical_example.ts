/**
 * @provider Africa's Talking
 * @capability webhook_ussd_end_of_session
 * @atss 1.1
 * @capability_type webhook
 */

// Sent once per session to a second callback URL (dashboard: USSD -> Service Codes),
// as application/x-www-form-urlencoded.

export interface UssdSessionEnd {
  date: string; // UTC, "yyyy-MM-dd HH:mm:ss"
  sessionId: string; // same as in webhook_ussd_session
  serviceCode: string;
  networkCode: string;
  phoneNumber: string;
  status: "Incomplete" | "Success" | "Failed";
  cost?: string;
  durationInMillis?: number;
  hopsCount?: number;
  hopsMetadata: string[]; // "the metadata associated with each hop", split on "|"
  input?: string; // every answer joined with "*"
  lastAppResponse?: string;
  errorMessage?: string; // Failed sessions
}

const num = (v: string | null): number | undefined => (v === null ? undefined : Number(v));

export function parseUssdSessionEnd(rawBody: string): UssdSessionEnd {
  const form = new URLSearchParams(rawBody);
  const sessionId = form.get("sessionId");
  const status = form.get("status") as UssdSessionEnd["status"] | null;
  if (!sessionId || !status) throw new Error("Not an Africa's Talking USSD end-of-session notification");
  return {
    date: form.get("date") ?? "",
    sessionId,
    serviceCode: form.get("serviceCode") ?? "",
    networkCode: form.get("networkCode") ?? "",
    phoneNumber: form.get("phoneNumber") ?? "",
    status,
    cost: form.get("cost") ?? undefined,
    durationInMillis: num(form.get("durationInMillis")),
    hopsCount: num(form.get("hopsCount")),
    hopsMetadata: (form.get("hopsMetadata") ?? "").split("|"),
    input: form.get("input") ?? undefined,
    lastAppResponse: form.get("lastAppResponse") ?? undefined,
    errorMessage: form.get("errorMessage") ?? undefined,
  };
}

/*
Usage (Node, no framework). The docs describe no signature: treat it as untrusted and only
update sessions you know.

import { createServer } from "node:http";

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    res.writeHead(200).end(); // the docs document no expected response; answer fast
    try {
      const end = parseUssdSessionEnd(raw);
      if (end.status === "Failed") console.error(`USSD ${end.sessionId} failed: ${end.errorMessage} — last: ${end.lastAppResponse}`);
    } catch {
      // not an end-of-session notification — ignore it
    }
  });
}).listen(3000);
*/
