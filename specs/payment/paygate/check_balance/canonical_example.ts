/**
 * @provider PayGate
 * @capability check_balance
 * @atss 1.0
 * @capability_type synchronous
 */

const PAYGATE_AUTH_TOKEN = process.env.PAYGATE_AUTH_TOKEN;
if (!PAYGATE_AUTH_TOKEN) throw new Error("Missing env: PAYGATE_AUTH_TOKEN");

const PAYGATE_BASE_URL = "https://paygateglobal.com/api";

interface CheckBalanceResponse {
  status: number;
  flooz: number;
  tmoney: number;
}

export async function checkBalance(): Promise<CheckBalanceResponse> {
  const response = await fetch(`${PAYGATE_BASE_URL}/v1/check-balance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_token: PAYGATE_AUTH_TOKEN,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `PayGate check_balance HTTP error: ${response.status} ` +
        `(check that your server IP is whitelisted in the PayGate dashboard)`
    );
  }

  const raw = (await response.json()) as { status: number; flooz: number; tmoney: number };

  if (raw.status !== 0) {
    throw new Error(`PayGate check_balance refused: status=${raw.status}`);
  }

  return { status: raw.status, flooz: raw.flooz, tmoney: raw.tmoney };
}

/*
Usage example:

const balance = await checkBalance();
console.log(`Flooz: ${balance.flooz} XOF, T-Money: ${balance.tmoney} XOF`);

// Before a FLOOZ disburse, check balance.flooz >= amount.
// Before a TMONEY disburse, check balance.tmoney >= amount.
// The two wallets are separate — having budget on one network does not help
// disbursing on the other.
*/
