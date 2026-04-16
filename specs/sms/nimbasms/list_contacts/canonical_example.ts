/**
 * @provider NimbaSMS
 * @capability list_contacts
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface ListContactsParams {
  limit?: number;
  offset?: number;
}

interface ContactItem {
  numero: string;
  name: string;
  groups: string[];
}

interface ListContactsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ContactItem[];
}

interface NimbaSMSError {
  detail: string;
}

export async function listContacts(
  params: ListContactsParams = {}
): Promise<ListContactsResponse> {
  const url = new URL("https://api.nimbasms.com/v1/contacts");
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

  return response.json() as Promise<ListContactsResponse>;
}

/*
Usage example:

const page = await listContacts({ limit: 20 });
console.log(`${page.count} contacts au total`);
for (const contact of page.results) {
  console.log(`${contact.numero} — ${contact.name}`);
}

// Paginer sur toutes les pages en suivant 'next'
*/
