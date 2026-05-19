/**
 * @provider Qosic
 * @capability webhook_payment_completed
 * @atss 1.0
 * @capability_type webhook
 */

const QOSIC_USERNAME = process.env.QOSIC_USERNAME;
const QOSIC_PASSWORD = process.env.QOSIC_PASSWORD;
const QOSIC_CLIENT_ID_TOGOCEL = process.env.QOSIC_CLIENT_ID_TOGOCEL;
const QOSIC_CLIENT_ID_MOOV = process.env.QOSIC_CLIENT_ID_MOOV;
if (!QOSIC_USERNAME) throw new Error("Missing env: QOSIC_USERNAME");
if (!QOSIC_PASSWORD) throw new Error("Missing env: QOSIC_PASSWORD");

const QOSIC_BASE_URL = "https://api.qosic.net";

type QosicNetwork = "TOGOCEL" | "MOOV";

const STATUS_PATH: Record<QosicNetwork, string> = {
  TOGOCEL: "/QosicBridge/tm/v1/gettransactionstatus",
  MOOV: "/QosicBridge/tg/v1/gettransactionstatus",
};

interface QosicWebhookPayload {
  status: "SUCCESSFUL" | "FAILED";
  transRef: string;
  specialfield1: string;
  amount: string;
  serviceRef?: string;
  code: string;
}

interface VerifiedPayment {
  transref: string;
  amount: string;
  responsecode: string;
  responsemsg: string;
  network: QosicNetwork;
}

function basicAuthHeader(): string {
  const token = Buffer.from(`${QOSIC_USERNAME}:${QOSIC_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
}

function clientIdFor(network: QosicNetwork): string {
  const id = network === "TOGOCEL" ? QOSIC_CLIENT_ID_TOGOCEL : QOSIC_CLIENT_ID_MOOV;
  if (!id) {
    throw new Error(`Missing env: QOSIC_CLIENT_ID_${network}`);
  }
  return id;
}

async function verifyAgainstApi(
  transref: string,
  network: QosicNetwork
): Promise<{ responsecode: string; responsemsg: string }> {
  const response = await fetch(`${QOSIC_BASE_URL}${STATUS_PATH[network]}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(),
    },
    body: JSON.stringify({
      transref,
      clientid: clientIdFor(network),
    }),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`Qosic /gettransactionstatus HTTP error: ${response.status}`);
  }

  return (await response.json()) as { responsecode: string; responsemsg: string };
}

export async function handleQosicWebhook(
  rawBody: string,
  network: QosicNetwork
): Promise<VerifiedPayment | null> {
  let payload: QosicWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as QosicWebhookPayload;
  } catch {
    throw new Error("Invalid Qosic webhook payload — not JSON");
  }

  if (!payload.transRef) {
    throw new Error("Missing transRef in Qosic webhook payload");
  }

  const verified = await verifyAgainstApi(payload.transRef, network);

  if (verified.responsecode !== "00") {
    return null;
  }

  return {
    transref: payload.transRef,
    amount: payload.amount,
    responsecode: verified.responsecode,
    responsemsg: verified.responsemsg,
    network,
  };
}

/*
Usage example (Express-style handler, one route per operator):

app.post("/webhooks/qosic/togocel", express.text({ type: "*\/*" }), async (req, res) => {
  res.sendStatus(200); // Always 200 first
  try {
    const payment = await handleQosicWebhook(req.body as string, "TOGOCEL");
    if (payment) {
      await fulfillOrder(payment.transref, payment);
    }
  } catch (err) {
    console.error("Qosic webhook handler failed:", err);
  }
});

// Qosic webhooks are NOT cryptographically signed — handleQosicWebhook always
// re-verifies via /gettransactionstatus before treating a payment as completed.
*/
