#!/usr/bin/env node
// Free pre-production check for rule 3 (no key in the code or in the browser), no dependency and
// no AI: keys written as literals in code, secret-named variables a bundler sends to the browser,
// and .env files tracked by git. Usage: node scan-secrets.mjs [dir=.]
// Exit: 0 no finding, 1 findings, 2 a file or folder could not be read.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// The registry's own credential names included (MERCHANT_KEY, ENCRYPTION_KEY, BASIC_TOKEN…); public keys are not secrets
const SENSITIVE = /(secret|api[_-]?key|private[_-]?key|merchant[_-]?key|license[_-]?key|token|password|encryption)/i;
const PUBLIC_NAME = /public[_-]?key|publishable|anon[_-]?key/i;
// env(X) is a Supabase config reference, @name a Vercel secret reference; ${{ secrets.X }} is caught by ${
const PLACEHOLDER = /xxx|your|changeme|example|<|\.\.\.|process\.env|\$\{|\benv\(|^@/i;
// Prefixes that Next.js, Vite, Expo, Create React App and SvelteKit/Astro inline into client bundles
const BROWSER = /\b((?:NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|PUBLIC_)[A-Za-z0-9_]+)\b/g;
// name: "value" or name = "value", the name itself quoted or not (JS, JSON, TOML)
const ASSIGNED = /(["']?)\b([A-Za-z_][A-Za-z0-9_]*)\1\s*[:=]\s*(["'`])([^"'`\n]*)\3/g;
const YAML_LINE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\s#"'][^\s#]*)\s*$/;
const AUTH_HEADER = /["'`](?:Bearer|Basic)\s+([A-Za-z0-9._~+/=-]{12,})/;
const ENV_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);
const SKIP_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"]);
const EXAMPLE_ENV = new Set([".env.example", ".env.sample", ".env.template"]);
const MAX_BYTES = 1_000_000;

const isEnvFile = (file) => path.basename(file).startsWith(".env");
const isSecretName = (name) => SENSITIVE.test(name) && !PUBLIC_NAME.test(name);
const isBrowserSecret = (name) => isSecretName(name.replace(/^(NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|PUBLIC_)/, ""));
const unquote = (v) => v.trim().replace(/^(["'])(.*)\1$/, "$2");

function walk(dir, rel = "") {
  const files = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const name = path.join(rel, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...walk(dir, name));
    } else if (entry.isFile() && !SKIP_FILES.has(entry.name) && !entry.name.endsWith(".min.js")) {
      files.push(name);
    }
  }
  return files;
}

function scanFile(file, text) {
  const findings = [];
  text.split("\n").forEach((line, i) => {
    const at = (reason) => findings.push({ file, line: i + 1, reason });
    if (EXAMPLE_ENV.has(path.basename(file))) {
      // committed with the code: a real-looking value here is a leaked key
      const m = line.match(ENV_LINE);
      const value = m && unquote(m[2]);
      if (m && isSecretName(m[1]) && value.length >= 12 && !PLACEHOLDER.test(value)) at(`secret value in an example file: ${m[1]}`);
      return;
    }
    if (isEnvFile(file)) {
      // .env files are meant to hold keys (outside git): only a browser prefix is a finding there
      const m = line.match(ENV_LINE);
      const value = m && unquote(m[2]);
      if (m && isBrowserSecret(m[1]) && /^(NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|PUBLIC_)/.test(m[1]) && value && !PLACEHOLDER.test(value)) {
        at(`secret exposed to the browser: ${m[1]}`);
      }
      return;
    }
    const exposed = new Set([...line.matchAll(BROWSER)].map((m) => m[1]).filter(isBrowserSecret));
    for (const name of exposed) at(`secret exposed to the browser: ${name}`);
    const literal = (value) => value.length >= 12 && !PLACEHOLDER.test(value);
    const named = [...line.matchAll(ASSIGNED)].map((m) => [m[2], m[4]]);
    const yaml = /\.ya?ml$/.test(file) && line.match(YAML_LINE);
    if (yaml) named.push([yaml[1], yaml[2]]);
    for (const [name, value] of named) {
      if (!exposed.has(name) && isSecretName(name) && literal(value)) at(`secret value in code: ${name}`);
    }
    const header = line.match(AUTH_HEADER);
    if (header && literal(header[1])) at("secret value in code: Authorization header");
  });
  return findings;
}

function trackedEnvFiles(dir) {
  const r = spawnSync("git", ["-C", dir, "ls-files"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return r.stdout.split("\n").filter((f) => isEnvFile(f) && !EXAMPLE_ENV.has(path.basename(f)));
}

export const isGitRepo = (dir) => trackedEnvFiles(dir) !== null;

export function scan(dir) {
  const findings = [];
  for (const file of walk(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).size > MAX_BYTES) continue;
    const text = fs.readFileSync(full, "utf8");
    if (text.includes("\0")) continue; // binary
    findings.push(...scanFile(file, text));
  }
  for (const file of trackedEnvFiles(dir) ?? []) findings.push({ file, line: 0, reason: `.env file tracked by git: ${file}` });
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? ".";
  try {
    const findings = scan(dir);
    for (const f of findings) console.log(`${f.file}:${f.line}: ${f.reason}`);
    if (!isGitRepo(dir)) console.error("not a git repository: the tracked .env check was skipped");
    process.exit(findings.length ? 1 : 0);
  } catch (err) {
    console.error(`scan-secrets: ${err.message}`);
    process.exit(2);
  }
}
