/**
 * @provider Qosic
 * @capability check_payment_status
 * @atss 1.0
 * @capability_type synchronous
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

interface CheckPaymentStatusInput {
  transref: string;
  network: QosicNetwork;
}

interface CheckPaymentStatusResponse {
  responsecode: string;
  responsemsg: string;
  transref: string;
  serviceref?: string;
  comment?: string;
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

export async function checkPaymentStatus(
  input: CheckPaymentStatusInput
): Promise<CheckPaymentStatusResponse> {
  const url = `${QOSIC_BASE_URL}${STATUS_PATH[input.network]}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(),
    },
    body: JSON.stringify({
      transref: input.transref,
      clientid: clientIdFor(input.network),
    }),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`Qosic check_payment_status HTTP error: ${response.status}`);
  }

  return (await response.json()) as CheckPaymentStatusResponse;
}

/*
Usage example:

const status = await checkPaymentStatus({
  transref: "ORDER-A3B7K9",
  network: "TOGOCEL",
});

switch (status.responsecode) {
  case "00":
    // Paid — fulfill the order.
    break;
  case "01":
    // Still pending — re-poll in a few seconds with backoff.
    break;
  default:
    // "02", "-1", "-2", "529", etc — failed. Mark the order accordingly.
    // Full error code list at docs.qosic.com.
    break;
}
*/
