import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, buildIssueUrl } from "../plugin/skills/diagnose/scripts/issue-url.mjs";

const report = (over = {}) => ({
  title: "Studio asked twice for the level",
  agent: "claude-code",
  plugin_version: "1.8.0",
  what_happened: "The start phase asked the question again.",
  steps: "1. /afrotools:studio\n2. answered",
  ...over,
});
const raw = (url, field) => url.split("&").find((p) => p.startsWith(`${field}=`)).slice(field.length + 1);

test("redact masks emails, phone numbers, bearer tokens and long tokens", () => {
  assert.equal(
    redact("mail a@b.co, tel +224 621 00 00 00, Authorization: Bearer abc.def.ghi, key sk_live_0123456789abcdefghij"),
    "mail [email], tel [phone], Authorization: Bearer [secret], key [secret]"
  );
  assert.equal(redact("LENGOPAY_LICENSE_KEY=abcd"), "LENGOPAY_LICENSE_KEY=[secret]");
  // spec and capability names, dates and versions stay readable
  assert.equal(redact("create_payment webhook_payment_completed on 2026-10-29, plugin 1.8.0"), "create_payment webhook_payment_completed on 2026-10-29, plugin 1.8.0");
});

test("buildIssueUrl prefills the form", () => {
  const url = buildIssueUrl(report({ what_happened: "Paid by a@b.co" }));
  assert.ok(url.startsWith("https://github.com/afrotools/afrotools/issues/new?template=studio-diagnostic.yml&title="), url);
  assert.equal(raw(url, "agent"), "claude-code");
  assert.equal(raw(url, "plugin_version"), "1.8.0");
  assert.equal(raw(url, "what_happened"), encodeURIComponent("Paid by [email]"));
  assert.equal(raw(url, "steps"), encodeURIComponent("1. /afrotools:studio\n2. answered"));
});

test("long fields are cut to the URL budgets", () => {
  const url = buildIssueUrl(report({ what_happened: "é".repeat(4000), steps: "étape ".repeat(1000) }));
  const cut = encodeURIComponent("\n[cut]");
  for (const [field, budget] of [["what_happened", 5000], ["steps", 1500]]) {
    const value = raw(url, field);
    assert.ok(value.length <= budget, `${field}: ${value.length}`);
    assert.ok(value.endsWith(cut), field);
    assert.doesNotThrow(() => decodeURIComponent(value), field); // no %XX sequence split
  }
});

test("redact also masks quoted JSON keys, keys in URLs, token headers and paired local numbers", () => {
  assert.equal(redact('{"apiKey": "sk_live_x"}'), '{"apiKey": "[secret]"}');
  assert.equal(redact("GET /pay?key=abc123&token=xyz&amount=500"), "GET /pay?key=[secret]&token=[secret]&amount=500");
  assert.equal(redact("Authorization: Token abc123"), "Authorization: Token [secret]");
  assert.equal(redact("appelez le 70 12 34 56 avant le 2026-10-29"), "appelez le [phone] avant le 2026-10-29");
});

test("the CLI prints the cleaned fields the user must read, then the link", async () => {
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const cli = fileURLToPath(new URL("../plugin/skills/diagnose/scripts/issue-url.mjs", import.meta.url));
  const r = spawnSync("node", [cli], { input: JSON.stringify(report({ what_happened: "the customer's number +221 77 123 45 67" })), encoding: "utf8" });
  const lines = r.stdout.trimEnd().split("\n");
  assert.match(r.stdout, /^what_happened: the customer's number \[phone\]$/m);
  assert.ok(lines.at(-1).startsWith("https://github.com/afrotools/afrotools/issues/new?"), lines.at(-1));
});

// GitHub refuses an issue title over 256 characters; a short one also reads better in the list.
test("a long title is cut to 120 characters", () => {
  const url = buildIssueUrl(report({ title: "Studio ".repeat(40) }));
  const title = decodeURIComponent(raw(url, "title"));
  assert.ok(title.length <= 120, `${title.length}`);
  assert.ok(title.endsWith("…"), title);
});
