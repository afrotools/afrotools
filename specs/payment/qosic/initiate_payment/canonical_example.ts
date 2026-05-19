/**
 * @provider Qosic
 * @capability initiate_payment
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

const REQUESTPAYMENT_PATH: Record<QosicNetwork, string> = {
  TOGOCEL: "/QosicBridge/tm/v1/requestpayment",
  MOOV: "/QosicBridge/tg/v1/requestpayment",
};

interface InitiatePaymentInput {
  msisdn: string;
  amount: string;
  transref: string;
  network: QosicNetwork;
  firstname?: string;
  lastname?: string;
}

interface InitiatePaymentResponse {
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
    throw new Error(
      `Missing env: QOSIC_CLIENT_ID_${network} (get it from Qosic dashboard -> Settings -> API Keys & Callback URL)`
    );
  }
  return id;
}

export async function initiatePayment(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResponse> {
  const url = `${QOSIC_BASE_URL}${REQUESTPAYMENT_PATH[input.network]}`;

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
      ...(input.firstname && { firstname: input.firstname }),
      ...(input.lastname && { lastname: input.lastname }),
    }),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`Qosic initiate_payment HTTP error: ${response.status}`);
  }

  return (await response.json()) as InitiatePaymentResponse;
}

/*
Usage example:

const ack = await initiatePayment({
  msisdn: "22890123456",
  amount: "100",
  transref: "ORDER-A3B7K9",
  network: "TOGOCEL",
  firstname: "John",
  lastname: "Doe",
});

// ack.responsecode === "01" is the normal initial response: the customer has
// just received a USSD push and must validate. Poll check_payment_status with
// transref = "ORDER-A3B7K9" until it returns "00" (success) or "02"/"-1" (failure).
*/
