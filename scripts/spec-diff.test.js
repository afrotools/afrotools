const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function writeSpec(dir, capability, schema) {
  const capDir = path.join(dir, "specs", "payment", "fixtureprovider", capability);
  fs.mkdirSync(capDir, { recursive: true });
  fs.writeFileSync(path.join(capDir, "schema.json"), JSON.stringify({ capability, status: "ready", ...schema }));
}

function commitBase(dir) {
  const git = (...args) => execFileSync("git", args, { cwd: dir });
  git("init", "-q");
  git("-c", "user.name=t", "-c", "user.email=t@t", "add", ".");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base");
}

const run = (cwd, ...args) => spawnSync("node", [path.resolve(__dirname, "spec-diff.js"), "HEAD", ...args], { cwd, encoding: "utf8" });

test("spec-diff lists removed capabilities and removed fields, and fails without --allow-breaking", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-diff-"));
  const response_schema = {
    type: "object",
    properties: { data: { type: "array", items: { $ref: "#/$defs/payment" } } },
    $defs: { payment: { type: "object", properties: { id: { type: "string" }, amount: { type: "integer" } } } },
  };
  writeSpec(dir, "create_payment", {
    input_schema: { type: "object", properties: { amount: { type: "integer" }, note: { type: "string" } } },
    parameters: [{ name: "Idempotency-Key", in: "header", schema: { type: "string" } }],
  });
  writeSpec(dir, "get_payment", { response_schema });
  writeSpec(dir, "list_payments", {});
  writeSpec(dir, "refund_payment", {});
  writeSpec(dir, "draft_capability", { status: "draft" });
  commitBase(dir);

  assert.equal(run(dir).status, 0);

  // note renamed to memo, the header moved to the body (not breaking), data[].amount gone, a deleted folder,
  // a spec set back to draft, and a draft deleted (it was never served)
  writeSpec(dir, "create_payment", {
    input_schema: { type: "object", properties: { amount: { type: "integer" }, memo: { type: "string" }, "Idempotency-Key": { type: "string" } } },
  });
  delete response_schema.$defs.payment.properties.amount;
  writeSpec(dir, "get_payment", { response_schema });
  fs.rmSync(path.join(dir, "specs", "payment", "fixtureprovider", "list_payments"), { recursive: true });
  writeSpec(dir, "refund_payment", { status: "draft" });
  fs.rmSync(path.join(dir, "specs", "payment", "fixtureprovider", "draft_capability"), { recursive: true });

  const failed = run(dir);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /"breaking" label/);
  const listed = failed.stdout.split("\n").filter((l) => l.startsWith("  ")).map((l) => l.trim()).sort();
  assert.deepEqual(listed, [
    "payment/fixtureprovider/create_payment: input_schema.note",
    "payment/fixtureprovider/create_payment: parameters.header.Idempotency-Key → input_schema.Idempotency-Key",
    "payment/fixtureprovider/get_payment: response_schema.data.amount",
    "payment/fixtureprovider/list_payments",
    "payment/fixtureprovider/refund_payment",
  ]);

  const allowed = run(dir, "--allow-breaking");
  assert.equal(allowed.status, 0);
  assert.match(allowed.stdout, /Removed capabilities \(2\)/);
});

test("spec-diff: a body field that became a parameter moved (exit 0); gone from both, it is removed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-diff-"));
  const body = { type: "object", properties: { amount: { type: "integer" }, trace_id: { type: "string" } } };
  writeSpec(dir, "create_payment", { input_schema: body });
  commitBase(dir);

  // ATSS 1.1 migration: trace_id leaves the body for a header parameter of the same name
  writeSpec(dir, "create_payment", {
    input_schema: { type: "object", properties: { amount: { type: "integer" } } },
    parameters: [{ name: "Trace_Id", in: "header", schema: { type: "string" } }],
  });
  const movedRun = run(dir);
  assert.equal(movedRun.status, 0);
  assert.match(movedRun.stdout, /Moved request fields \(1, not breaking\)/);
  assert.match(movedRun.stdout, /create_payment: input_schema\.trace_id → parameters\.header\.Trace_Id/);
  assert.match(movedRun.stdout, /No capability or field removed/);

  writeSpec(dir, "create_payment", { input_schema: { type: "object", properties: { amount: { type: "integer" } } } });
  const removedRun = run(dir);
  assert.equal(removedRun.status, 1);
  assert.match(removedRun.stdout, /Removed or renamed fields \(1\)[^]*create_payment: input_schema\.trace_id/);
});
