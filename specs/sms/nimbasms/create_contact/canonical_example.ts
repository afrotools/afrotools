/**
 * @provider NimbaSMS
 * @capability create_contact
 * @atss 1.0
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

// Contact minimal
const contact = await createContact({ numero: "224XXXXXXXXX" });

// Contact avec nom et groupes
const contact2 = await createContact({
  numero: "224XXXXXXXXX",
  name: "Mamadou Diallo",
  groups: ["Clients", "Newsletter"], // groupes doivent exister dans le compte
});

console.log(`Contact créé : ${contact2.numero}`);

// 'numero' doit inclure l'indicatif pays sans '+' (224 pour la Guinée)
// Utiliser list_groups pour récupérer les noms de groupes exacts
*/
