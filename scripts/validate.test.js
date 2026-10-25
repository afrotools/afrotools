const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
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
