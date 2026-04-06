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

function fail(specPath, message) {
  console.error(`  FAIL  ${specPath}`);
  console.error(`        ${message}`);
  return false;
}

function pass(specPath) {
  console.log(`  OK    ${specPath}`);
  return true;
}

// ---------------------------------------------------------------------------
// Discover spec folders
// ---------------------------------------------------------------------------

/**
 * Returns an array of absolute paths to spec folders (depth 3: category/provider/capability).
 */
function discoverAllSpecs() {
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
 */
function validateSchema(specPath) {
  const schemaPath = path.join(specPath, "schema.json");
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (err) {
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
 */
function validateTypeScript(specPath) {
  const tsPath = path.join(specPath, "canonical_example.ts");
  const tscBin = path.resolve(__dirname, "../node_modules/.bin/tsc");

  if (!fs.existsSync(tscBin)) {
    return fail(specPath, `tsc not found — run npm install first`);
  }

  try {
    execSync(
      `"${tscBin}" --noEmit --strict --target ES2020 --module ESNext --moduleResolution bundler --lib ES2020,DOM --types node "${tsPath}"`,
      { stdio: "pipe" }
    );
  } catch (err) {
    const output = (err.stdout || err.stderr || "").toString().trim();
    return fail(specPath, `canonical_example.ts TypeScript error:\n        ${output.split("\n").join("\n        ")}`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const isChangedMode = process.argv.includes("--changed");
const specs = isChangedMode ? discoverChangedSpecs() : discoverAllSpecs();

if (specs.length === 0) {
  console.log(isChangedMode ? "No changed specs to validate." : "No specs found.");
  process.exit(0);
}

console.log(`\nValidating ${specs.length} spec(s)${isChangedMode ? " (changed)" : ""}...\n`);

let failures = 0;

for (const specPath of specs) {
  const rel = path.relative(SPECS_ROOT, specPath);

  // Run checks in order — stop at first failure per spec
  if (!validateStructure(specPath)) {
    failures++;
    continue;
  }
  if (!validateSchema(specPath)) {
    failures++;
    continue;
  }
  if (!validateTypeScript(specPath)) {
    failures++;
    continue;
  }

  pass(rel);
}

console.log(`\n${specs.length - failures} passed, ${failures} failed.\n`);
process.exit(failures > 0 ? 1 : 0);
