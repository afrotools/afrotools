/**
 * @provider NimbaSMS
 * @capability list_sendernames
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface ListSendernamesParams {
  limit?: number;
  offset?: number;
}

interface SenderNameItem {
  name: string;
  status: string;
}

interface ListSendernamesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SenderNameItem[];
}

interface NimbaSMSError {
  detail: string;
}

export async function listSendernames(
  params: ListSendernamesParams = {}
): Promise<ListSendernamesResponse> {
  const url = new URL("https://api.nimbasms.com/v1/sendernames");
  if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
  if (params.offset !== undefined) url.searchParams.set("offset", String(params.offset));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const error: NimbaSMSError = await response.json();
    throw new Error(`NimbaSMS error ${response.status}: ${error.detail}`);
  }

  return response.json() as Promise<ListSendernamesResponse>;
}

/*
Usage example:

const page = await listSendernames();
const active = page.results.filter((s) => s.status === "active");
console.log(`Sender names actifs : ${active.map((s) => s.name).join(", ")}`);

// Utiliser uniquement les sender names avec status 'active' dans send_message
// Les sender names 'pending' sont en cours de validation — ne pas les utiliser
// Les sender names doivent être créés depuis le dashboard NimbaSMS, pas via l'API
*/
