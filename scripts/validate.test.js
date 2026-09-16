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
      extracted_at: "2026-09-15T10:00:00Z",
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
      extracted_at: "2026-09-15T10:00:00Z",
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
