/**
 * @provider Africa's Talking
 * @capability webhook_ussd_session
 * @atss 1.1
 * @capability_type webhook
 */

// Africa's Talking POSTs each step of a USSD session to your callback URL as
// application/x-www-form-urlencoded and shows your text/plain answer to the user.
// Prerequisites: a service code and this callback URL registered with Africa's Talking.

export interface UssdRequest {
  sessionId: string;
  phoneNumber: string;
  networkCode: string; // "99999" = Athena, the sandbox
  serviceCode: string;
  text: string; // "" on the first request, then every answer joined with "*"
}

export interface UssdAnswer {
  body: string; // begins with "CON " (the session goes on) or "END " (last response)
  hop: string; // at-ussd-hop-metadata: ≤ 99 characters, no "|", nothing sensitive
}

export function parseUssdRequest(rawBody: string): UssdRequest {
  const form = new URLSearchParams(rawBody);
  const sessionId = form.get("sessionId");
  if (!sessionId) throw new Error("Not an Africa's Talking USSD request");
  return {
    sessionId,
    phoneNumber: form.get("phoneNumber") ?? "",
    networkCode: form.get("networkCode") ?? "",
    serviceCode: form.get("serviceCode") ?? "",
    text: form.get("text") ?? "",
  };
}

const con = (body: string, hop: string): UssdAnswer => ({ body: `CON ${body}`, hop });
const end = (body: string, hop: string): UssdAnswer => ({ body: `END ${body}`, hop });

/** Route on the path of answers. Plain characters only: telcos cannot render special ones. */
export function answerUssd(req: UssdRequest, accountNumber: (phone: string) => string): UssdAnswer {
  const [first, second] = req.text === "" ? [] : req.text.split("*");
  if (first === undefined) {
    return con("What would you want to check\n1. My Account\n2. My phone number", "menu");
  }
  if (first === "1" && second === undefined) {
    return con("Choose account information you want to view\n1. Account number", "account");
  }
  if (first === "1" && second === "1") {
    return end(`Your account number is ${accountNumber(req.phoneNumber)}`, "accountNumberEnd");
  }
  if (first === "2") return end(`Your phone number is ${req.phoneNumber}`, "phoneNumberEnd");
  return end("Invalid choice. Please dial again.", "invalid");
}

/*
Usage (Node, no framework). Answer within 10 seconds; anything that does not begin with
CON or END, or an HTTP 40X, terminates the session.

import { createServer } from "node:http";

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    let answer: UssdAnswer;
    try {
      answer = answerUssd(parseUssdRequest(raw), () => "ACC1001");
    } catch {
      res.writeHead(400).end(); // not a USSD request: the URL is public and unsigned
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain", "at-ussd-hop-metadata": answer.hop });
    res.end(answer.body);
  });
}).listen(3000);
*/
