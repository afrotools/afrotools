/**
 * @provider Smile ID
 * @capability list_supported_documents
 * @atss 1.0
 * @capability_type synchronous
 */

// No auth: this endpoint is public. Production; sandbox: https://testapi.smileidentity.com
const SMILEID_BASE_URL = "https://api.smileidentity.com";

interface ListSupportedDocumentsInput {
  continent?: "AFRICA" | "ASIA" | "EUROPE" | "NORTH AMERICA" | "OCEANIA" | "SOUTH AMERICA";
  country_code?: string; // ISO 3166-1 alpha-2, uppercase
  locale?: "en-GB" | "fr-FR" | "ar-EG";
}

interface SupportedDocuments {
  valid_documents: {
    country?: { code?: string; name?: string; continent?: string };
    id_types?: { code?: string; name?: string; has_back?: boolean }[];
  }[];
}

interface SupportedDocumentsError {
  error: string;
  code: string;
}

export async function listSupportedDocuments(input: ListSupportedDocumentsInput = {}): Promise<SupportedDocuments> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) query.set(key, value);
  }
  const qs = query.toString();
  const response = await fetch(`${SMILEID_BASE_URL}/v3/services/supported_documents${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const error = (await response.json()) as SupportedDocumentsError;
    throw new Error(`Smile ID list_supported_documents error ${response.status}: ${error.code} ${error.error}`);
  }
  return (await response.json()) as SupportedDocuments;
}

/*
Usage example — documents a Senegalese user can submit, names in French:

const { valid_documents } = await listSupportedDocuments({ country_code: "SN", locale: "fr-FR" });
for (const doc of valid_documents[0]?.id_types ?? []) {
  console.log(doc.code, doc.name, doc.has_back ? "front + back" : "front only");
}
*/
