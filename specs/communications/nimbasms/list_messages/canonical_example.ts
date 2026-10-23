/**
 * @provider NimbaSMS
 * @capability list_messages
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface ListMessagesParams {
  limit?: number;
  offset?: number;
  sent_at?: string;
  sent_at__lte?: string;
  sent_at__gte?: string;
}

interface MessageItem {
  id: string;
  status: string;
  to: string[];
  message: string;
  sender_name: string;
  sent_at: string;
  message_cost: number;
}

interface ListMessagesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MessageItem[];
}

interface NimbaSMSError {
  detail: string;
}

export async function listMessages(
  params: ListMessagesParams = {}
): Promise<ListMessagesResponse> {
  const url = new URL("https://api.nimbasms.com/v1/messages");
  if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
  if (params.offset !== undefined) url.searchParams.set("offset", String(params.offset));
  if (params.sent_at) url.searchParams.set("sent_at", params.sent_at);
  if (params.sent_at__lte) url.searchParams.set("sent_at__lte", params.sent_at__lte);
  if (params.sent_at__gte) url.searchParams.set("sent_at__gte", params.sent_at__gte);

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

  return response.json() as Promise<ListMessagesResponse>;
}

/*
Usage example:

// Récupérer les 10 derniers messages
const page = await listMessages({ limit: 10 });
console.log(`Total : ${page.count} messages`);
for (const msg of page.results) {
  console.log(`${msg.id} — ${msg.status} — ${msg.sent_at}`);
}

// Filtrer par plage de dates
const filtered = await listMessages({
  sent_at__gte: "2024-01-01T00:00:00Z",
  sent_at__lte: "2024-01-31T23:59:59Z",
  limit: 50,
});

// 'count' indique le total mais 'results' ne contient que la page courante
// Utiliser 'next' pour paginer sur toutes les pages
*/
