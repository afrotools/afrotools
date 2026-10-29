const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Files copied from other projects into the plugin: each must say where it came from, under which
// license, and whether it was changed (Apache-2.0 requires marking changes), and ship its license.
const ROOT = path.resolve(__dirname, "..");
const VENDOR = path.join(ROOT, "plugin/skills/studio/references/vendor");
const LICENSES = path.join(ROOT, "plugin/third_party/licenses");
const NOTICE = path.join(ROOT, "plugin/third_party/NOTICE.md");
const HEADER = /^<!-- source: ([\w.-]+\/[\w.-]+)@[0-9a-f]{12}\/\S+ \| license: (MIT|Apache-2\.0) \| modified: (no|yes — .+) -->$/;

const vendored = () =>
  fs.readdirSync(VENDOR).filter((f) => f.endsWith(".md")).map((f) => ({
    file: f,
    first: fs.readFileSync(path.join(VENDOR, f), "utf8").split("\n")[0],
  }));

test("every vendored file declares its source, an allowed license and whether it was modified", () => {
  const files = vendored();
  assert.ok(files.length > 0, "no vendored file");
  for (const { file, first } of files) assert.match(first, HEADER, file);
});

test("every vendored source has its license file", () => {
  const notice = fs.readFileSync(NOTICE, "utf8");
  const licenses = fs.readdirSync(LICENSES).map((f) => fs.readFileSync(path.join(LICENSES, f), "utf8"));
  for (const { file, first } of vendored()) {
    const [, repo, license] = first.match(HEADER);
    assert.ok(notice.includes(repo), `${file}: ${repo} missing from NOTICE.md`);
    const marker = license === "MIT" ? "MIT License" : "Apache License";
    assert.ok(licenses.some((text) => text.includes(marker)), `${file}: no ${license} license file`);
  }
});

test("no vendored file comes from a forbidden source", () => {
  for (const { file, first } of vendored()) {
    // wave-webhooks is Wave the accounting app, not Wave mobile money; the other two can't be redistributed
    assert.doesNotMatch(first, /wave-webhooks|vercel-labs\/agent-skills|getsentry\/skills/, file);
  }
});
