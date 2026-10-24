/**
 * @provider Gozem
 * @capability list_vehicles
 * @atss 1.0
 * @capability_type synchronous
 */

const GOZEM_API_KEY = process.env.GOZEM_API_KEY ?? "";
if (!GOZEM_API_KEY) throw new Error("Missing env: GOZEM_API_KEY");

// Production host; for the sandbox use https://sandbox-api.gozem.co/courier/v1
const BASE_URL = "https://api.gozem.co/courier/v1";

export type ListVehiclesInput = {
  guid?: string;
  name?: string;
  city?: string;
  country?: string;
  lat?: number;
  lon?: number;
};

export type ListVehiclesResponse = {
  data: {
    city_coverage: {
      city_name: string;
      country_code?: string;
      country_name: string;
      geo_polygon?: {
        coordinates: number[][][];
        type: "Polygon";
      };
    }[];
    description: string;
    guid: string;
    name: string;
  }[];
  message: string;
  success: true;
};

type GozemError = {
  code: string;
  details?: unknown;
  message: string;
  success?: false;
  error?: string;
};

export async function listVehicles(input: ListVehiclesInput): Promise<ListVehiclesResponse> {
  const { guid, name, city, country, lat, lon } = input;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ guid, name, city, country, lat, lon })) {
    if (value !== undefined) query.set(key, String(value));
  }
  const response = await fetch(`${BASE_URL}/vehicles?${query}`, {
    method: "GET",
    headers: {
      "x-api-key": GOZEM_API_KEY,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<GozemError>;
    throw new Error(`Gozem ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as ListVehiclesResponse;
}

/*
Usage example:

const { data: vehicles } = await listVehicles({ lat: 6.166245, lon: 1.247951 });
for (const vehicle of vehicles) console.log(vehicle.name, vehicle.description);
*/
