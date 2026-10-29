#!/usr/bin/env node
// Builds the link to the prefilled studio-diagnostic issue form from a report, after masking what
// must not reach a public issue. Usage: echo '<report json>' | node issue-url.mjs
// Report: { title, agent, plugin_version, what_happened, steps }.
import { fileURLToPath } from "node:url";

const FORM = "https://github.com/afrotools/afrotools/issues/new?template=studio-diagnostic.yml";
// GitHub answers 414 to long URLs: the same budgets as report_integration (encoded characters)
const BUDGETS = { what_happened: 5000, steps: 1500 };
const CUT = "\n[cut]";
// Same names as scan-secrets (check skill)
const SECRET_NAME = String.raw`[A-Za-z0-9_]*(?:secret|api[_-]?key|private[_-]?key|access[_-]?token|auth[_-]?token|license[_-]?key|password|client[_-]?secret)[A-Za-z0-9_]*`;

export function redact(text) {
  return String(text)
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]")
    .replace(/\b(Bearer|Basic)\s+[\w.~+/=-]+/gi, "$1 [secret]")
    .replace(new RegExp(`\\b(${SECRET_NAME})(\\s*[=:]\\s*)("?)[^\\s"]+\\3`, "gi"), "$1$2[secret]")
    // long tokens: 24+ characters with both letters and digits (capability names have no digit)
    .replace(/[A-Za-z0-9_-]{24,}/g, (m) => (/\d/.test(m) && /[A-Za-z]/.test(m) ? "[secret]" : m))
    // phone numbers: a leading + or at least 9 digits, so dates (8 digits) stay
    .replace(/(?<!\w)\+?\d[\d .-]{7,}\d(?!\w)/g, (m) => (m.startsWith("+") || m.replace(/\D/g, "").length >= 9 ? "[phone]" : m));
}

// Encoded value no longer than budget, cut on a whole character so no %XX sequence is split.
function encodeWithin(value, budget) {
  const full = encodeURIComponent(value);
  if (budget === undefined || full.length <= budget) return full;
  const room = budget - encodeURIComponent(CUT).length;
  let out = "";
  for (const ch of value) {
    const enc = encodeURIComponent(ch);
    if (out.length + enc.length > room) break;
    out += enc;
  }
  return out + encodeURIComponent(CUT);
}

export function buildIssueUrl(r) {
  const fields = ["title", "agent", "plugin_version", "what_happened", "steps"];
  return FORM + fields.map((f) => `&${f}=${encodeWithin(redact(r[f] ?? ""), BUDGETS[f])}`).join("");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.on("data", (d) => (input += d));
  process.stdin.on("end", () => console.log(buildIssueUrl(JSON.parse(input))));
}
