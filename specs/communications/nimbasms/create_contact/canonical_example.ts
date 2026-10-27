/**
 * @provider NimbaSMS
 * @capability create_contact
 * @atss 1.1
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

interface CreateContactInput {
  numero: string;
  name?: string;
  groups?: string[];
}

interface ContactResponse {
  numero: string;
  name: string;
  groups: string[];
}

interface NimbaSMSError {
  detail: string;
}

export async function createContact(
  input: CreateContactInput
): Promise<ContactResponse> {
  const response = await fetch("https://api.nimbasms.com/v1/contacts", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NimbaSMSError = await response.json();
    throw new Error(`NimbaSMS error ${response.status}: ${error.detail}`);
  }

  return response.json() as Promise<ContactResponse>;
}

/*
Usage example:

// Minimal contact
const contact = await createContact({ numero: "224XXXXXXXXX" });

// Contact with name and groups
const contact2 = await createContact({
  numero: "224XXXXXXXXX",
  name: "Mamadou Diallo",
  groups: ["Clients", "Newsletter"], // groups must exist in the account
});

console.log(`Contact créé : ${contact2.numero}`);

// 'numero' must include the country code without '+' (224 for Guinea)
// Use list_groups to retrieve the exact group names
*/
