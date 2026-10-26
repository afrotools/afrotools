const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function writeFixtureSpec(dir, { status, evidence, extraSchema = {}, extraProvider = {} }) {
  const providerDir = path.join(dir, "specs", "payment", "fixtureprovider");
  const capDir = path.join(providerDir, "create_payment");
  fs.mkdirSync(capDir, { recursive: true });
  fs.writeFileSync(
    path.join(providerDir, "provider.json"),
    JSON.stringify({
      slug: "fixtureprovider", name: "Fixture Provider", category: "payment",
      country_code: ["GN"], website: "https://fixture.example",
      docs_url: "https://fixture.example/docs", docs_public: true, sandbox: false,
      description: "Fixture.", example_prompt: "Fixture prompt.", ...extraProvider,
    })
  );
  const schema = {
    spec_version: "1.0", provider_api_version: "2026-01-01",
    capability: "create_payment", capability_type: "synchronous", status,
    currency: ["GNF"],
    auth: { type: "api_key", location: "header", header: "Authorization", format: "{token}", env_var: "FIXTURE_KEY" },
    endpoint: { method: "POST", url: "https://fixture.example/pay" },
    example_prompt: "Create a fixture payment.",
    input_schema: {}, response_schema: {}, error_schema: {},
    gotchas: ["Fixture gotcha, specific and actionable."],
    ...(evidence !== undefined ? { evidence } : {}),
    ...extraSchema,
  };
  fs.writeFileSync(path.join(capDir, "schema.json"), JSON.stringify(schema, null, 2));
  fs.writeFileSync(
    path.join(capDir, "canonical_example.ts"),
    `export async function createPayment(): Promise<void> {}\n`
  );
}

function runValidate(cwd) {
  try {
    execFileSync("node", [path.resolve(__dirname, "validate.js")], { cwd, encoding: "utf8" });
    return { code: 0 };
  } catch (err) {
    return { code: err.status ?? 1, stderr: err.stderr?.toString() ?? "" };
  }
}

test("unverified status without evidence fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "unverified" });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /evidence/i);
});

test("unverified status with well-formed evidence passes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, {
    status: "unverified",
    evidence: {
      source_url: "https://fixture.example/docs#create",
      source_reference: "Section 'Create a payment'",
      extracted_at: "2026-09-15T10:00:00.000Z",
      snapshot_hash: "a1b2c3",
      spans: ["POST /pay"],
    },
  });
  const { code } = runValidate(dir);
  assert.equal(code, 0);
});

test("unverified status with empty evidence.spans fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, {
    status: "unverified",
    evidence: {
      source_url: "https://fixture.example/docs#create",
      source_reference: "Section 'Create a payment'",
      extracted_at: "2026-09-15T10:00:00.000Z",
      snapshot_hash: "a1b2c3",
      spans: [],
    },
  });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /spans/i);
});

test("ready status is unaffected by the evidence rule", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready" });
  const { code } = runValidate(dir);
  assert.equal(code, 0);
});

test("unverified status with non-ISO-8601 extracted_at fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, {
    status: "unverified",
    evidence: {
      source_url: "https://fixture.example/docs#create",
      source_reference: "Section 'Create a payment'",
      extracted_at: "09/15/2026",
      snapshot_hash: "a1b2c3",
      spans: ["POST /pay"],
    },
  });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /ISO 8601/i);
});

test("unverified status with extra evidence fields fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, {
    status: "unverified",
    evidence: {
      source_url: "https://fixture.example/docs#create",
      source_reference: "Section 'Create a payment'",
      extracted_at: "2026-09-15T10:00:00.000Z",
      snapshot_hash: "a1b2c3",
      spans: ["POST /pay"],
      confidence: 0.9,
    },
  });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /unexpected field/i);
});

test("communications provider without channels fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraProvider: { category: "communications" } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /channels/);
});

test("communications provider with valid channels passes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraProvider: { category: "communications", channels: ["sms", "whatsapp"] } });
  const { code } = runValidate(dir);
  assert.equal(code, 0);
});

test("empty channels array fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraProvider: { category: "communications", channels: [] } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /non-empty array/);
});

test("channels value outside the enum fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraProvider: { category: "communications", channels: ["sms", "telegram"] } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /telegram/);
});

test("channels is optional outside communications but still validated when present", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraProvider: { channels: "sms" } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /channels must be a non-empty array/);
});

test("duplicate channels fail validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraProvider: { category: "communications", channels: ["sms", "sms"] } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /duplicates/);
});

test("payment spec without currency fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { currency: undefined } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /currency/);
});

test("currency is optional outside payment", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { currency: undefined }, extraProvider: { category: "identity" } });
  assert.equal(runValidate(dir).code, 0);
});

test("country/currency coherence is not checked outside payment", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { currency: ["XOF"] }, extraProvider: { category: "identity" } });
  assert.equal(runValidate(dir).code, 0);
});

test("payment spec with a currency not matching its countries fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { currency: ["XOF"] } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /COHERENCE/);
});

test("legacy currency code SLL satisfies Sierra Leone", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { currency: ["SLL"] }, extraProvider: { country_code: ["SL"] } });
  assert.equal(runValidate(dir).code, 0);
});

test("non-array currency fails validation outside payment", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { currency: "XOF" }, extraProvider: { category: "identity" } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /currency must be an array/);
});

test("a provider slug reused in another category fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready" });
  const twin = path.join(dir, "specs", "identity", "fixtureprovider");
  fs.cpSync(path.join(dir, "specs", "payment", "fixtureprovider"), twin, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(twin, "provider.json"), "utf8"));
  fs.writeFileSync(path.join(twin, "provider.json"), JSON.stringify({ ...manifest, category: "identity" }));
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /Duplicate provider slug "fixtureprovider"/);
});

const crypto = require("crypto");
const CAP_DIR = ["specs", "payment", "fixtureprovider", "create_payment"];

/** Same hash as validate.js specHash: schema.json without "verification", then the example. */
function fixtureHash(dir) {
  const capDir = path.join(dir, ...CAP_DIR);
  const { verification: _v, ...rest } = JSON.parse(fs.readFileSync(path.join(capDir, "schema.json"), "utf8"));
  return "sha256:" + crypto.createHash("sha256").update(JSON.stringify(rest)).update("\0")
    .update(fs.readFileSync(path.join(capDir, "canonical_example.ts"))).digest("hex");
}

/** A verified fixture whose verification block carries the current hash. */
function writeVerifiedFixture(dir, verification = {}) {
  const proof = { method: "test_live", environment: "sandbox", at: "2026-10-25", spec_hash: "", ...verification };
  writeFixtureSpec(dir, { status: "verified", extraSchema: { spec_version: "1.1", verification: proof } });
  const schemaPath = path.join(dir, ...CAP_DIR, "schema.json");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  if (!verification.spec_hash) schema.verification.spec_hash = fixtureHash(dir);
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
}

test("verified spec without a verification block fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "verified" });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /needs a "verification" block/);
});

test("verified spec with its proof passes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeVerifiedFixture(dir);
  assert.equal(runValidate(dir).code, 0);
});

test("verified spec edited after its verification fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeVerifiedFixture(dir);
  fs.appendFileSync(path.join(dir, ...CAP_DIR, "canonical_example.ts"), "// edited\n");
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /spec changed since its verification on 2026-10-25/);
});

test("verification on a spec that is not verified fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, {
    status: "ready",
    extraSchema: { spec_version: "1.1", verification: { method: "app", environment: "production", at: "2026-10-25", spec_hash: `sha256:${"0".repeat(64)}` } },
  });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /only allowed on a "verified" spec/);
});

test("community report without its issue link fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeVerifiedFixture(dir, { method: "community_report", environment: "production" });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /atss\.schema\.json/);
});

test("community report linked to its issue passes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeVerifiedFixture(dir, { method: "community_report", environment: "production", ref: "https://github.com/afrotools/afrotools/issues/120" });
  assert.equal(runValidate(dir).code, 0);
});

test("ATSS 1.1 field with spec_version 1.0 fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { open_questions: ["Is the payment URL key public?"] } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /need spec_version "1\.1"/);
});

const HMAC_AUTH = {
  type: "bearer", location: "header", field: "Authorization", format: "Bearer {access_token}", env_var: "FIXTURE_ID",
  credentials: [
    { env_var: "FIXTURE_ID", description: "Client id." },
    { env_var: "FIXTURE_SECRET", description: "Client secret." },
  ],
  signing: { algorithm: "HMAC-SHA256", key: "{FIXTURE_SECRET}", message: "{FIXTURE_ID}", encoding: "hex" },
  token_exchange: { method: "POST", path: "/auth", headers: [{ in: "header", name: "X-API-KEY", value: "{FIXTURE_ID}:{signature}" }], token_field: "data.accessToken", expires_in_s: 3600 },
  apply: [{ in: "header", name: "Authorization", value: "Bearer {access_token}" }],
};

test("ATSS 1.1 auth with credentials, signing, token exchange and apply passes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", auth: HMAC_AUTH } });
  assert.equal(runValidate(dir).code, 0);
});

test("auth placeholder that no credential or block produces fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  const { token_exchange: _t, ...auth } = HMAC_AUTH;
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", auth } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /auth\.apply\[0\]: \{access_token\}/);
});

test("env var missing from auth.credentials fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", auth: HMAC_AUTH } });
  fs.writeFileSync(
    path.join(dir, ...CAP_DIR, "canonical_example.ts"),
    `const SITE = process.env.FIXTURE_SITE_ID;\nexport async function createPayment(): Promise<string | undefined> { return SITE; }\n`
  );
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /FIXTURE_SITE_ID utilisé mais absent de auth\.credentials/);
});

test("webhook signature block passes, and {raw_body} outside it fails", () => {
  const signature = { header: "X-Webhook-Signature", format: "v1:{signature}", algorithm: "HMAC-SHA256", key: "{FIXTURE_SECRET}", message: "{raw_body}", encoding: "hex" };
  const ok = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(ok, { status: "ready", extraSchema: { spec_version: "1.1", capability_type: "webhook", webhook: { signature } } });
  assert.equal(runValidate(ok).code, 0);
  const bad = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(bad, { status: "ready", extraSchema: { spec_version: "1.1", capability_type: "webhook", webhook: { signature: { ...signature, format: "v1:{signature}.{raw_body}" } } } });
  const { code, stderr } = runValidate(bad);
  assert.equal(code, 1);
  assert.match(stderr, /webhook\.signature\.format: \{raw_body\}/);
});

test("provider.json environments with a path in base_url fails validation", () => {
  const ok = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(ok, { status: "ready", extraSchema: { endpoint: { method: "POST", url: "https://sandbox.fixture.example/pay" } }, extraProvider: { environments: { sandbox: { base_url: "https://sandbox.fixture.example" } } } });
  assert.equal(runValidate(ok).code, 0);
  const bad = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(bad, { status: "ready", extraProvider: { environments: { staging: { base_url: "https://fixture.example/v1" } } } });
  const { code, stderr } = runValidate(bad);
  assert.equal(code, 1);
  assert.match(stderr, /provider\.json environments invalid/);
});

test("webhook.signature.key must be a single env-var placeholder", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  const signature = { header: "X-Webhook-Signature", format: "v1:{signature}", algorithm: "HMAC-SHA256", key: "sk_live_hardcoded", message: "{raw_body}", encoding: "hex" };
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", capability_type: "webhook", webhook: { signature } } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /webhook\/signature\/key must match pattern/);
});

test("webhook block on a non-webhook capability fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  const signature = { header: "X-Webhook-Signature", format: "v1:{signature}", algorithm: "HMAC-SHA256", key: "{FIXTURE_SECRET}", message: "{raw_body}", encoding: "hex" };
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", webhook: { signature } } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /only allowed on a capability_type "webhook"/);
});

test("auth.env_var missing from auth.credentials fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", auth: { ...HMAC_AUTH, env_var: "FIXTURE_KEY" } } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /auth\.env_var "FIXTURE_KEY" is missing from auth\.credentials/);
});

test("bracket access to an undeclared env var fails once credentials are declared", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", auth: HMAC_AUTH } });
  fs.writeFileSync(
    path.join(dir, ...CAP_DIR, "canonical_example.ts"),
    `const SITE = process.env["FIXTURE_SITE_ID"];\nexport async function createPayment(): Promise<string | undefined> { return SITE; }\n`
  );
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /FIXTURE_SITE_ID utilisé mais absent/);
});

test("endpoint.url outside every declared environment fails validation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraProvider: { environments: { sandbox: { base_url: "https://sandbox.fixture.example" } } } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /is on none of the provider\.json environments/);
});

test("token exchange on another host with a form body passes; path and url together fail", () => {
  const form = {
    method: "POST", url: "https://idp.fixture.example/realms/x/token", content_type: "application/x-www-form-urlencoded",
    body: [{ name: "client_id", value: "{FIXTURE_ID}" }, { name: "client_secret", value: "{FIXTURE_SECRET}" }, { name: "grant_type", value: "client_credentials" }],
    token_field: "access_token", expires_in_s: 600,
  };
  const ok = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(ok, { status: "ready", extraSchema: { spec_version: "1.1", auth: { ...HMAC_AUTH, token_exchange: form } } });
  assert.equal(runValidate(ok).code, 0);
  const bad = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(bad, { status: "ready", extraSchema: { spec_version: "1.1", auth: { ...HMAC_AUTH, token_exchange: { ...form, path: "/token" } } } });
  const { code, stderr } = runValidate(bad);
  assert.equal(code, 1);
  assert.match(stderr, /token_exchange must match exactly one schema in oneOf/);
});

test("webhook signature message can sign a request header and an env var", () => {
  const signature = { header: "Response-Signature", format: "{signature}", algorithm: "HMAC-SHA256", key: "{FIXTURE_SECRET}", message: "{header:Response-Timestamp}{FIXTURE_PARTNER}sid_request", encoding: "base64" };
  const ok = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(ok, { status: "ready", extraSchema: { spec_version: "1.1", capability_type: "webhook", webhook: { signature } } });
  fs.writeFileSync(
    path.join(ok, ...CAP_DIR, "canonical_example.ts"),
    `const P = process.env.FIXTURE_PARTNER;\nexport async function createPayment(): Promise<string | undefined> { return P; }\n`
  );
  assert.equal(runValidate(ok).code, 0);
  const bad = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(bad, { status: "ready", extraSchema: { spec_version: "1.1", capability_type: "webhook", webhook: { signature: { ...signature, message: "{timestamp}{FIXTURE_PARTNR}" } } } });
  const { code, stderr } = runValidate(bad);
  assert.equal(code, 1);
  assert.match(stderr, /webhook\.signature\.message: \{timestamp\}/);
  assert.match(stderr, /webhook\.signature\.message: \{FIXTURE_PARTNR\}/); // a typo does not declare itself
});

test("auth.apply in path must fill a placeholder of endpoint.url", () => {
  const auth = { ...HMAC_AUTH, apply: [{ in: "path", name: "c", value: "{FIXTURE_ID}" }] };
  const ok = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(ok, { status: "ready", extraSchema: { spec_version: "1.1", auth, endpoint: { method: "GET", url: "https://fixture.example/pay/{c}/status" } } });
  assert.equal(runValidate(ok).code, 0);
  const bad = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(bad, { status: "ready", extraSchema: { spec_version: "1.1", auth } });
  const { code, stderr } = runValidate(bad);
  assert.equal(code, 1);
  assert.match(stderr, /auth\.apply in path "c" is not a \{placeholder\} of endpoint\.url/);
});

const ID_URL = { method: "GET", url: "https://fixture.example/payments/{id}" };
const ID_PARAM = { name: "id", in: "path", required: true, schema: { type: "string" } };
const withSchema = (extraSchema) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { spec_version: "1.1", ...extraSchema } });
  return runValidate(dir);
};

test("parameters: path, query and header parameters outside the body pass", () => {
  const parameters = [ID_PARAM, { name: "expand", in: "query", schema: { type: "string" } }, { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }];
  assert.equal(withSchema({ endpoint: ID_URL, parameters }).code, 0);
});

test("parameters: every path parameter fills a placeholder, every placeholder has one", () => {
  const notInUrl = withSchema({ parameters: [ID_PARAM] });
  assert.equal(notInUrl.code, 1);
  assert.match(notInUrl.stderr, /parameter in path "id" is not a \{placeholder\} of endpoint\.url/);
  const unfilled = withSchema({ endpoint: { method: "GET", url: "https://fixture.example/payments/{id}/items/{item}" }, parameters: [ID_PARAM] });
  assert.equal(unfilled.code, 1);
  assert.match(unfilled.stderr, /placeholder\(s\) without a path parameter: \{item\}/);
  const optional = withSchema({ endpoint: ID_URL, parameters: [{ ...ID_PARAM, required: false }] });
  assert.equal(optional.code, 1);
  assert.match(optional.stderr, /parameter in path "id" must be required: true/);
});

test("parameters: no duplicate, nothing auth.apply already sends, not on a webhook", () => {
  const dup = withSchema({ parameters: [{ name: "X-Trace", in: "header", schema: {} }, { name: "x-trace", in: "header", schema: {} }] });
  assert.equal(dup.code, 1);
  assert.match(dup.stderr, /parameters lists header:x-trace more than once/);
  const auth = { ...HMAC_AUTH, apply: [{ in: "header", name: "X-API-KEY", value: "{FIXTURE_ID}" }] };
  const twice = withSchema({ auth, parameters: [{ name: "x-api-key", in: "header", schema: {} }] });
  assert.equal(twice.code, 1);
  assert.match(twice.stderr, /parameter header "x-api-key" is already sent by auth\.apply/);
  const webhook = withSchema({ capability_type: "webhook", auth: { type: "none" }, parameters: [{ name: "q", in: "query", schema: {} }] });
  assert.equal(webhook.code, 1);
  assert.match(webhook.stderr, /describe a call to the provider, not a webhook/);
});

test("parameters need spec_version 1.1", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
  writeFixtureSpec(dir, { status: "ready", extraSchema: { parameters: [{ name: "q", in: "query", schema: {} }] } });
  const { code, stderr } = runValidate(dir);
  assert.equal(code, 1);
  assert.match(stderr, /parameters need spec_version "1\.1"/);
});

test("success_condition names a field of response_schema, with equals or in", () => {
  const response_schema = { type: "object", properties: { data: { allOf: [{ $ref: "#/$defs/result" }] } }, $defs: { result: { type: "object", properties: { code: { type: "integer" } } } } };
  assert.equal(withSchema({ response_schema, success_condition: { field: "data.code", equals: 0 } }).code, 0);
  assert.equal(withSchema({ response_schema, success_condition: { field: "data.code", in: [0, 1] } }).code, 0);
  const unknown = withSchema({ response_schema, success_condition: { field: "data.status", equals: "ok" } });
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /success_condition\.field "data\.status" is not a property of response_schema/);
  assert.equal(withSchema({ response_schema, success_condition: { field: "data.code", equals: 0, in: [0] } }).code, 1);
  // An undocumented response says nothing either way.
  assert.equal(withSchema({ success_condition: { field: "code", equals: 0 } }).code, 0);
});

test("a money-moving POST that says nothing about idempotency warns, without failing", () => {
  const run = (extraSchema) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atss-"));
    writeFixtureSpec(dir, { status: "ready", extraSchema });
    return spawnSync("node", [path.resolve(__dirname, "validate.js")], { cwd: dir, encoding: "utf8" });
  };
  const silent = run({});
  assert.equal(silent.status, 0);
  assert.match(silent.stderr, /payment\/fixtureprovider\/create_payment: a POST that moves money says nothing about idempotency/);
  for (const said of [
    { gotchas: ["Retries with the same Idempotency-Key are not charged twice."] },
    { spec_version: "1.1", open_questions: ["The docs do not say whether a retried payment is idempotent."] },
    { spec_version: "1.1", parameters: [{ name: "Idempotency-Key", in: "header", schema: { type: "string" } }] },
  ]) assert.doesNotMatch(run(said).stderr, /idempotency/);
});
