/**
 * @provider Qosic
 * @capability disburse
 * @atss 1.0
 * @capability_type asynchronous
 */

const QOSIC_USERNAME = process.env.QOSIC_USERNAME;
const QOSIC_PASSWORD = process.env.QOSIC_PASSWORD;
const QOSIC_CLIENT_ID_TOGOCEL = process.env.QOSIC_CLIENT_ID_TOGOCEL;
const QOSIC_CLIENT_ID_MOOV = process.env.QOSIC_CLIENT_ID_MOOV;
if (!QOSIC_USERNAME) throw new Error("Missing env: QOSIC_USERNAME");
if (!QOSIC_PASSWORD) throw new Error("Missing env: QOSIC_PASSWORD");

const QOSIC_BASE_URL = "https://api.qosic.net";

type QosicNetwork = "TOGOCEL" | "MOOV";

const DEPOSIT_PATH: Record<QosicNetwork, string> = {
  TOGOCEL: "/QosicBridge/tm/v1/deposit",
  MOOV: "/QosicBridge/tg/v1/deposit",
};

interface DisburseInput {
  msisdn: string;
  amount: string;
  transref: string;
  network: QosicNetwork;
}

interface DisburseResponse {
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

export async function disburse(input: DisburseInput): Promise<DisburseResponse> {
  const url = `${QOSIC_BASE_URL}${DEPOSIT_PATH[input.network]}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(),
    },
    body: JSON.stringify({
      msisdn: input.msisdn,
      amount: input.amount,
      transref: input.transref,
      clientid: clientIdFor(input.network),
    }),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`Qosic disburse HTTP error: ${response.status}`);
  }

  return (await response.json()) as DisburseResponse;
}

/*
Usage example:

const payout = await disburse({
  msisdn: "22896123456",
  amount: "10000",
  transref: "PAYOUT-A3B7K9",
  network: "MOOV",
});

// payout.responsecode === "00" means Qosic accepted the credit instruction.
// The recipient wallet is credited asynchronously — re-poll check_payment_status
// with transref = "PAYOUT-A3B7K9" and the same network until you reach a terminal state.
//
// Reminder: disbursement requires IP whitelisting and a funded merchant balance.
*/
