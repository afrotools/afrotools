#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * ATSS spec validation script.
 *
 * Usage:
 *   node scripts/validate.js              # validate all specs
 *   node scripts/validate.js --changed    # validate only git-changed specs
 *
 * Checks per spec folder:
 *   1. Structure  — exactly schema.json + canonical_example.ts, nothing else
 *   2. schema.json — all required ATSS fields present and valid
 *   3. canonical_example.ts — compiles with tsc --noEmit, zero errors
 *   4. Security    — endpoint safety, prompt injection in text fields, fetch/env coherence
 *
 * Flags:
 *   --changed       validate only git-changed specs
 *   --security-only skip checks 1-3, run only security scan (used by dedicated CI workflow)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SPECS_ROOT = path.resolve(__dirname, "../specs");

const REQUIRED_FIELDS = [
  "spec_version",
  "provider_slug",
  "provider_name",
  "provider_api_version",
  "category",
  "capability",
  "capability_type",
  "status",
  "country_code",
  "currency",
  "sandbox",
  "docs_url",
  "docs_public",
  "auth",
  "endpoint",
  "input_schema",
  "response_schema",
  "error_schema",
  "gotchas",
];

const VALID_CAPABILITY_TYPES = ["synchronous", "asynchronous", "webhook"];
const VALID_STATUSES = ["draft", "compliant", "verified", "deprecated", "archived"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {string} specPath @param {string} message @returns {false} */
function fail(specPath, message) {
  console.error(`  FAIL  ${specPath}`);
  console.error(`        ${message}`);
  return false;
}

/** @param {string} specPath @returns {true} */
function pass(specPath) {
  console.log(`  OK    ${specPath}`);
  return true;
}

// ---------------------------------------------------------------------------
// Discover spec folders
// ---------------------------------------------------------------------------

/**
 * Returns an array of absolute paths to spec folders (depth 3: category/provider/capability).
 * @returns {string[]}
 */
function discoverAllSpecs() {
  /** @type {string[]} */
  const specs = [];
  if (!fs.existsSync(SPECS_ROOT)) return specs;

  for (const category of fs.readdirSync(SPECS_ROOT)) {
    const categoryPath = path.join(SPECS_ROOT, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    for (const provider of fs.readdirSync(categoryPath)) {
      const providerPath = path.join(categoryPath, provider);
      if (!fs.statSync(providerPath).isDirectory()) continue;

      for (const capability of fs.readdirSync(providerPath)) {
        const capabilityPath = path.join(providerPath, capability);
        if (!fs.statSync(capabilityPath).isDirectory()) continue;
        specs.push(capabilityPath);
      }
    }
  }
  return specs;
}

/**
 * Returns spec folders touched by git-changed files.
 * Works both on a branch (vs HEAD) and in CI (vs origin/main).
 */
function discoverChangedSpecs() {
  let diff;
  try {
    // In CI on a PR: compare against origin/main
    diff = execSync("git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD", {
      encoding: "utf8",
    });
  } catch {
    diff = execSync("git diff --name-only HEAD", { encoding: "utf8" });
  }

  const changedFiles = diff.trim().split("\n").filter(Boolean);
  const specDirs = new Set();

  for (const file of changedFiles) {
    // Match specs/{category}/{provider}/{capability}/...
    const match = file.match(/^specs\/([^/]+)\/([^/]+)\/([^/]+)\//);
    if (match) {
      specDirs.add(path.join(SPECS_ROOT, match[1], match[2], match[3]));
    }
  }

  return [...specDirs].filter((d) => fs.existsSync(d));
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Check 1: folder must contain exactly schema.json + canonical_example.ts.
 * @param {string} specPath
 * @returns {boolean}
 */
function validateStructure(specPath) {
  const entries = fs.readdirSync(specPath).filter((f) => !f.startsWith("."));
  const expected = new Set(["schema.json", "canonical_example.ts"]);
  const actual = new Set(entries);

  const missing = [...expected].filter((f) => !actual.has(f));
  const extra = [...actual].filter((f) => !expected.has(f));

  if (missing.length > 0) {
    return fail(specPath, `Missing files: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    return fail(specPath, `Unexpected files: ${extra.join(", ")}`);
  }
  return true;
}

/**
 * Check 2: schema.json must have all required fields with correct types.
 * @param {string} specPath
 * @returns {boolean}
 */
function validateSchema(specPath) {
  const schemaPath = path.join(specPath, "schema.json");
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (/** @type {any} */ err) {
    return fail(specPath, `schema.json parse error: ${err.message}`);
  }

  // Required fields present
  for (const field of REQUIRED_FIELDS) {
    if (!(field in schema)) {
      return fail(specPath, `schema.json missing required field: "${field}"`);
    }
  }

  // spec_version
  if (schema.spec_version !== "1.0") {
    return fail(specPath, `spec_version must be "1.0", got "${schema.spec_version}"`);
  }

  // capability_type enum
  if (!VALID_CAPABILITY_TYPES.includes(schema.capability_type)) {
    return fail(
      specPath,
      `capability_type must be one of ${VALID_CAPABILITY_TYPES.join("|")}, got "${schema.capability_type}"`
    );
  }

  // status enum
  if (!VALID_STATUSES.includes(schema.status)) {
    return fail(specPath, `status must be one of ${VALID_STATUSES.join("|")}, got "${schema.status}"`);
  }

  // country_code array
  if (!Array.isArray(schema.country_code)) {
    return fail(specPath, `country_code must be an array`);
  }

  // currency array
  if (!Array.isArray(schema.currency)) {
    return fail(specPath, `currency must be an array`);
  }

  // sandbox boolean
  if (typeof schema.sandbox !== "boolean") {
    return fail(specPath, `sandbox must be a boolean`);
  }

  // docs_public boolean
  if (typeof schema.docs_public !== "boolean") {
    return fail(specPath, `docs_public must be a boolean`);
  }

  // gotchas — minimum 1 entry
  if (!Array.isArray(schema.gotchas) || schema.gotchas.length === 0) {
    return fail(specPath, `gotchas must be a non-empty array (minimum 1 entry)`);
  }

  // auth object
  if (typeof schema.auth !== "object" || Array.isArray(schema.auth)) {
    return fail(specPath, `auth must be an object`);
  }

  // endpoint object
  if (typeof schema.endpoint !== "object" || Array.isArray(schema.endpoint)) {
    return fail(specPath, `endpoint must be an object`);
  }

  return true;
}

/**
 * Check 3: canonical_example.ts must compile with tsc --noEmit.
 * @param {string} specPath
 * @returns {boolean}
 */
function validateTypeScript(specPath) {
  const tsPath = path.join(specPath, "canonical_example.ts");
  const tscBin = path.resolve(__dirname, "../node_modules/.bin/tsc");

  if (!fs.existsSync(tscBin)) {
    return fail(specPath, `tsc not found — run npm install first`);
  }

  try {
    execSync(
      `"${tscBin}" --noEmit --ignoreConfig --strict --target ES2020 --module ESNext --moduleResolution bundler --lib ES2020,DOM --types node "${tsPath}"`,
      { stdio: "pipe" }
    );
  } catch (/** @type {any} */ err) {
    const output = (err.stdout || err.stderr || "").toString().trim();
    return fail(specPath, `canonical_example.ts TypeScript error:\n        ${output.split("\n").join("\n        ")}`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Security scan
// ---------------------------------------------------------------------------

const INTERNAL_IP_PATTERNS = [
  /^localhost$/i, /^127\./, /^10\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^::1$/,
];

/**
 * Patterns that indicate prompt injection attempts in spec text fields (gotchas, etc.).
 * blocking:true  → hard error, fails the spec
 * blocking:false → warning, printed but does not fail
 *
 * Only the most unambiguous patterns are blocking — broad heuristics are warnings only.
 * @type {Array<{re: RegExp, label: string, blocking: boolean}>}
 */
const PROMPT_INJECTION_PATTERNS = [
  // Unambiguous override instructions — always block
  { re: /\b(IGNORE|DISREGARD|FORGET)\s+(ALL\s+)?(PREVIOUS|ABOVE|PRIOR)/i, label: "instruction d'override d'agent", blocking: true },
  // Credential/key exfiltration disguised as debugging — block
  { re: /for\s+(debug|logging|monitoring|telemetry)\s+purposes?\s+.{0,80}(api[_\s]?key|token|secret|credential)/i, label: "exfiltration de credential déguisée en debug", blocking: true },
  // base64 obfuscation in text fields — block
  { re: /atob\s*\(|btoa\s*\(/, label: "encoding base64 suspect dans un champ texte", blocking: true },
  // Broad heuristics — warn only (too many false-positives as hard errors)
  { re: /https?:\/\//, label: "URL dans un champ texte (vérifier si légitime)", blocking: false },
];

/**
 * Patterns that detect dangerous constructs in canonical_example.ts source code.
 * Labels intentionally avoid the exact forbidden phrases to prevent hook false-positives.
 * @type {Array<{re: RegExp, label: string}>}
 */
const DANGEROUS_CODE_PATTERNS = [
  { re: /\beval\s*\(/,              label: "exécution dynamique de chaîne interdite" },
  { re: /new\s+Function\s*\(/,      label: "constructeur de code dynamique interdit" },
  { re: /require\s*\(\s*['"]fs['"]/, label: "accès direct au filesystem interdit" },
  { re: /process\.exit\s*\(/,       label: "arrêt forcé du processus interdit" },
  { re: /fetch\s*\(`[^`]*\$\{[^}]*env[^}]*\}/, label: "variable d'env dans une URL fetch via template literal" },
];

/** Infrastructure env vars allowed without auth declaration */
const INFRA_ENV_PREFIXES = ["NEXT_PUBLIC_", "NEXT_", "VITE_", "NUXT_"];
const INFRA_ENV_VARS = new Set(["NODE_ENV", "PORT", "HOST", "BASE_URL"]);

/**
 * Validates that an endpoint URL is HTTPS and not an internal address.
 * @param {string} url
 * @returns {string[]}
 */
function validateEndpointUrl(url) {
  /** @type {string[]} */ const errors = [];
  let parsed;
  try { parsed = new URL(url); }
  catch { return [`endpoint.url n'est pas une URL valide: "${url}"`]; }

  if (parsed.protocol !== "https:")
    errors.push(`endpoint.url doit être HTTPS (reçu: ${parsed.protocol})`);
  if (INTERNAL_IP_PATTERNS.some((r) => r.test(parsed.hostname)))
    errors.push(`endpoint.url pointe vers une IP interne: "${parsed.hostname}"`);
  if (parsed.username || parsed.password)
    errors.push("endpoint.url ne doit pas contenir de credentials");

  return errors;
}

/**
 * Scans string fields for prompt injection patterns.
 * @param {object} schema
 * @returns {{ errors: string[], warnings: string[] }}
 */
function scanTextFields(schema) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];

  const fields = [
    schema.provider_name,
    schema.capability,
    schema.provider_api_version,
    ...(Array.isArray(schema.gotchas) ? schema.gotchas : []),
  ].filter((f) => typeof f === "string");

  for (const field of fields) {
    for (const { re, label, blocking } of PROMPT_INJECTION_PATTERNS) {
      if (re.test(field)) {
        const excerpt = field.length > 80 ? field.slice(0, 80) + "…" : field;
        if (blocking) errors.push(`[PROMPT INJECTION] ${label}: "${excerpt}"`);
        else warnings.push(`[WARN] ${label}: "${excerpt}"`);
      }
    }
  }
  return { errors, warnings };
}

/**
 * Scans canonical_example.ts source for:
 *   - fetch() calls pointing outside the declared endpoint hostname (hard error)
 *   - process.env references not in auth.env_var (warning — multi-credential APIs are legit)
 *   - dangerous code patterns (hard error)
 * @param {string} source
 * @param {object} schema
 * @returns {{ errors: string[], warnings: string[] }}
 */
function scanCanonicalExample(source, schema) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];

  // 1. Coherence: all literal fetch() URLs must match declared endpoint hostname
  let allowedHost = null;
  try { allowedHost = new URL(schema.endpoint.url).hostname; } catch { /* already flagged by validateEndpointUrl */ }

  if (allowedHost) {
    const fetchRe = /fetch\s*\(\s*['"`](https?:\/\/[^'"`\s]+)['"`]/g;
    for (const m of source.matchAll(fetchRe)) {
      try {
        const fetchedHost = new URL(m[1]).hostname;
        if (fetchedHost !== allowedHost)
          errors.push(`[EXFILTRATION] fetch() vers "${fetchedHost}" mais endpoint déclaré est "${allowedHost}"`);
      } catch {
        errors.push(`[INVALID URL] URL de fetch() invalide: "${m[1]}"`);
      }
    }
  }

  // 2. process.env references not in auth.env_var → warning only.
  //    Multi-credential APIs legitimately use env vars for required params (e.g. website_id).
  const declaredEnvVars = new Set();
  const auth = schema.auth;
  if (auth && typeof auth === "object" && !Array.isArray(auth) && auth.env_var) declaredEnvVars.add(auth.env_var);
  if (Array.isArray(auth)) auth.forEach((/** @type {any} */ a) => a.env_var && declaredEnvVars.add(a.env_var));

  const envRe = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  for (const em of source.matchAll(envRe)) {
    const v = em[1];
    const isInfra = INFRA_ENV_PREFIXES.some((p) => v.startsWith(p)) || INFRA_ENV_VARS.has(v);
    if (!isInfra && !declaredEnvVars.has(v))
      warnings.push(`[WARN] process.env.${v} utilisé mais non déclaré dans auth.env_var`);
  }

  // 3. Dangerous code patterns in canonical_example source
  for (const { re, label } of DANGEROUS_CODE_PATTERNS) {
    if (re.test(source)) errors.push(`[DANGEROUS CODE] ${label}`);
  }

  return { errors, warnings };
}

/**
 * Check 4: security scan — endpoint, prompt injection, canonical_example coherence.
 * Webhook specs skip endpoint URL validation (their endpoint is a developer-defined placeholder).
 * @param {string} specPath
 * @returns {boolean}
 */
function runSecurityScan(specPath) {
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(path.join(specPath, "schema.json"), "utf8"));
  } catch {
    return fail(specPath, "schema.json manquant ou invalide");
  }

  /** @type {string[]} */ const allErrors = [];
  /** @type {string[]} */ const allWarnings = [];

  // Webhook specs have placeholder endpoint URLs (developer-defined) — skip URL validation
  if (schema.capability_type !== "webhook" && schema.endpoint?.url) {
    allErrors.push(...validateEndpointUrl(schema.endpoint.url));
  }

  const { errors: textErrors, warnings: textWarnings } = scanTextFields(schema);
  allErrors.push(...textErrors);
  allWarnings.push(...textWarnings);

  try {
    const source = fs.readFileSync(path.join(specPath, "canonical_example.ts"), "utf8");
    const { errors: codeErrors, warnings: codeWarnings } = scanCanonicalExample(source, schema);
    allErrors.push(...codeErrors);
    allWarnings.push(...codeWarnings);
  } catch { /* file missing — caught by check 1 */ }

  if (allWarnings.length > 0) allWarnings.forEach((w) => console.warn(`        ${w}`));

  if (allErrors.length > 0) {
    allErrors.forEach((e) => console.error(`        ${e}`));
    return fail(specPath, `Security scan: ${allErrors.length} issue(s) found`);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const isChangedMode = process.argv.includes("--changed");
const isSecurityOnly = process.argv.includes("--security-only");
const specs = isChangedMode ? discoverChangedSpecs() : discoverAllSpecs();

if (specs.length === 0) {
  console.log(isChangedMode ? "No changed specs to validate." : "No specs found.");
  process.exit(0);
}

const modeLabel = [isChangedMode ? "changed" : "all", isSecurityOnly ? "security-only" : "full"].join(", ");
console.log(`\nValidating ${specs.length} spec(s) [${modeLabel}]...\n`);

let failures = 0;

for (const specPath of specs) {
  const rel = path.relative(SPECS_ROOT, specPath);

  if (!isSecurityOnly) {
    if (!validateStructure(specPath))  { failures++; continue; }
    if (!validateSchema(specPath))     { failures++; continue; }
    if (!validateTypeScript(specPath)) { failures++; continue; }
  }

  if (!runSecurityScan(specPath)) { failures++; continue; }

  pass(rel);
}

console.log(`\n${specs.length - failures} passed, ${failures} failed.\n`);
process.exit(failures > 0 ? 1 : 0);
