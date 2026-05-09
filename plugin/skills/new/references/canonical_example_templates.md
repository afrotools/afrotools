# canonical_example.ts Templates

## Synchronous capability (common case)

```typescript
/**
 * @provider ProviderName
 * @capability capability_name
 * @atss 1.0
 * @capability_type synchronous
 */

const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY;
if (!PROVIDER_API_KEY) throw new Error("Missing env: PROVIDER_API_KEY");

interface CapabilityInput {
  requiredField: string;
  optionalField?: number;
}

interface CapabilityResponse {
  id: string;
  status: "pending" | "succeeded" | "failed";
}

interface ProviderError {
  code: string;
  message: string;
}

export async function capabilityName(
  input: CapabilityInput
): Promise<CapabilityResponse> {
  const response = await fetch("https://api.example.com/v1/endpoint", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PROVIDER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: ProviderError = await response.json();
    throw new Error(`ProviderName error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<CapabilityResponse>;
}

/*
Usage example:

const result = await capabilityName({
  requiredField: "value",
});

// Describe what the caller should do with the result.
// Surface any gotchas relevant to usage here.
*/
```

---

## Asynchronous capability (provider queues work; poll for result)

```typescript
/**
 * @provider ProviderName
 * @capability submit_job
 * @atss 1.0
 * @capability_type asynchronous
 */

const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY;
if (!PROVIDER_API_KEY) throw new Error("Missing env: PROVIDER_API_KEY");

interface SubmitJobInput { payload: string; }
interface JobStatus { id: string; status: "pending" | "processing" | "done" | "failed"; result?: string; }

export async function submitJob(input: SubmitJobInput): Promise<JobStatus> {
  const res = await fetch("https://api.example.com/v1/jobs", {
    method: "POST",
    headers: { Authorization: `Bearer ${PROVIDER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`ProviderName error ${res.status}`);
  return res.json() as Promise<JobStatus>;
}

export async function pollJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`https://api.example.com/v1/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${PROVIDER_API_KEY}` },
  });
  if (!res.ok) throw new Error(`ProviderName error ${res.status}`);
  return res.json() as Promise<JobStatus>;
}

/*
Usage example:

const job = await submitJob({ payload: "..." });

// Poll until done (implement exponential backoff in production)
let status = job;
while (status.status === "pending" || status.status === "processing") {
  await new Promise((r) => setTimeout(r, 2000));
  status = await pollJobStatus(job.id);
}

if (status.status === "failed") throw new Error("Job failed");
console.log(status.result);
*/
```

> When a provider uses a `notif_url` / callback URL instead of polling, that is a webhook
> pattern — use `capability_type: "webhook"` and a separate `webhook_*` spec instead.

---

## Error responses that use HTTP 200 with an error code in the body

Some providers (e.g. Paycard) always return HTTP 200 and signal errors via a `code` field.
Replace the standard `if (!response.ok)` block with:

```typescript
  const data = await response.json() as SuccessResponse | ProviderError;
  if ((data as ProviderError).code !== 0) {
    const err = data as ProviderError;
    throw new Error(`ProviderName error ${err.code}: ${err.message}`);
  }
  return data as SuccessResponse;
```
