import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, buildIssueUrl } from "./issue-url.mjs";

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
