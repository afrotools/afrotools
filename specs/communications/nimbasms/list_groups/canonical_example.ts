/**
 * @provider NimbaSMS
 * @capability list_groups
 * @atss 1.0
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface ListGroupsParams {
  limit?: number;
  offset?: number;
}

interface GroupItem {
  name: string;
}

interface ListGroupsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GroupItem[];
}

interface NimbaSMSError {
  detail: string;
}

export async function listGroups(
  params: ListGroupsParams = {}
): Promise<ListGroupsResponse> {
  const url = new URL("https://api.nimbasms.com/v1/groups");
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

  return response.json() as Promise<ListGroupsResponse>;
}

/*
Usage example:

const page = await listGroups();
console.log(`${page.count} groupes disponibles`);
for (const group of page.results) {
  console.log(group.name);
}

// Les noms retournés ici sont ceux à passer dans create_contact({ groups: [...] })
// La casse est significative — copier les noms exactement tels qu'ils apparaissent
*/
