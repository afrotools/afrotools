#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * What a PR takes away from integrations built on the registry (ATSS.md § Compatibility policy):
 * the specs of the working tree against a git ref, by default origin/main.
 *
 * Lists
 *   - removed capabilities: served at the ref (unverified, ready, verified, deprecated), and now
 *     deleted or set to draft/archived;
 *   - removed or renamed fields of input_schema, response_schema and parameters (a rename is a
 *     removal plus an addition). A top-level body field that became a parameter of the same
 *     name, or back (ATSS 1.1 migration), moved: listed as moved, not breaking. Header names
 *     ignore case; nothing else does.
 *
 * Usage:
 *   node scripts/spec-diff.js [ref] [--allow-breaking]
 *
 * Exits 1 when it finds a removal, unless --allow-breaking (CI passes it when the PR has the
 * "breaking" label).
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SERVED = new Set(["unverified", "ready", "verified", "deprecated"]);
const SCHEMA_PATH = /^specs\/[^/]+\/[^/]+\/[^/]+\/schema\.json$/;

/** @param {string[]} args */
const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** @param {string} text @returns {any} */
function parse(text) {
  try { return JSON.parse(text); } catch { return null; } // validate.js reports it
}

/**
 * Dotted paths of the properties a JSON Schema describes, through array items and prefixItems,
 * allOf/oneOf/anyOf members, if/then/else and local $refs. The values of a map
 * (additionalProperties, patternProperties) are under "*": data.*.score.
 * @param {any} root
 * @param {string} prefix
 * @returns {Set<string>}
 */
function propertyPaths(root, prefix) {
  const out = new Set();
  /** @param {any} node @param {string} at @param {Set<string>} refs */
  const walk = (node, at, refs) => {
    if (node && typeof node.$ref === "string" && node.$ref.startsWith("#/")) {
      if (refs.has(node.$ref)) return; // recursive schema
      refs = new Set([...refs, node.$ref]);
      node = node.$ref.slice(2).split("/").reduce((/** @type {any} */ n, /** @type {string} */ k) => n?.[k], root);
    }
    if (!node || typeof node !== "object") return;
    for (const [name, child] of Object.entries(node.properties ?? {})) {
      out.add(`${at}.${name}`);
      walk(child, `${at}.${name}`, refs);
    }
    for (const m of [node.items, ...(node.prefixItems ?? []), ...(node.allOf ?? []), ...(node.oneOf ?? []), ...(node.anyOf ?? []),
      node.if, node.then, node.else]) walk(m, at, refs);
    for (const m of [node.additionalProperties, ...Object.values(node.patternProperties ?? {})]) walk(m, `${at}.*`, refs);
  };
  walk(root, prefix, new Set());
  return out;
}

/** @param {any} schema @returns {Set<string>} */
function fields(schema) {
  return new Set([
    ...propertyPaths(schema.input_schema, "input_schema"),
    ...propertyPaths(schema.response_schema, "response_schema"),
    ...(Array.isArray(schema.parameters) ? schema.parameters : []).map((/** @type {any} */ p) => `parameters.${p.in}.${p.name}`),
  ]);
}

/** @param {any} p @param {string} name — HTTP header names ignore case, body and other parameter names do not */
const sameName = (p, name) => (p.in === "header" ? p.name.toLowerCase() === name.toLowerCase() : p.name === name);

/**
 * Where a removed request field went, when it only moved: a top-level body field that became a
 * parameter of the same name, or a parameter that became a top-level body field.
 * @param {string} f a field of the old spec, as fields() names it
 * @param {any} before
 * @param {any} after
 * @returns {string | undefined} the field in the new spec
 */
function movedTo(f, before, after) {
  const params = (/** @type {any} */ s) => (Array.isArray(s.parameters) ? s.parameters : []);
  const top = (/** @type {any} */ s) => [...propertyPaths(s.input_schema, "input_schema")]
    .filter((b) => b.indexOf(".") === b.lastIndexOf(".")).map((b) => b.slice("input_schema.".length));
  if (top(before).some((n) => f === `input_schema.${n}`)) {
    const p = params(after).find((/** @type {any} */ p) => sameName(p, f.slice("input_schema.".length)));
    return p && `parameters.${p.in}.${p.name}`;
  }
  const old = params(before).find((/** @type {any} */ p) => f === `parameters.${p.in}.${p.name}`);
  const name = old && top(after).find((n) => sameName(old, n));
  return name && `input_schema.${name}`;
}

/**
 * @param {string} ref
 * @returns {{ capabilities: string[], fields: string[], moved: string[] }} "category/provider/capability",
 *   "category/provider/capability: input_schema.a.b" and "…: input_schema.a → parameters.header.a"
 */
function specDiff(ref) {
  const capabilities = [];
  const removedFields = [];
  const moved = [];
  const files = git(["ls-tree", "-r", "--name-only", ref, "--", "specs"]).split("\n").filter((f) => SCHEMA_PATH.test(f));
  for (const file of files) {
    const before = parse(git(["show", `${ref}:${file}`]));
    if (!before || !SERVED.has(before.status)) continue;
    const id = path.dirname(file).slice("specs/".length);
    const after = fs.existsSync(file) ? parse(fs.readFileSync(file, "utf8")) : undefined;
    if (after === null) continue;
    if (!after || !SERVED.has(after.status)) { capabilities.push(id); continue; }
    const now = fields(after);
    for (const f of fields(before)) {
      if (now.has(f)) continue;
      const to = movedTo(f, before, after);
      if (to) moved.push(`${id}: ${f} → ${to}`);
      else removedFields.push(`${id}: ${f}`);
    }
  }
  return { capabilities, fields: removedFields, moved };
}

const args = process.argv.slice(2);
const ref = args.find((a) => !a.startsWith("--")) ?? "origin/main";
const allowed = args.includes("--allow-breaking");
const diff = specDiff(ref);
if (diff.capabilities.length) console.log(`Removed capabilities (${diff.capabilities.length}), against ${ref}:\n${diff.capabilities.map((c) => `  ${c}`).join("\n")}\n`);
if (diff.fields.length) console.log(`Removed or renamed fields (${diff.fields.length}), against ${ref}:\n${diff.fields.map((f) => `  ${f}`).join("\n")}\n`);
if (diff.moved.length) console.log(`Moved request fields (${diff.moved.length}, not breaking), against ${ref}:\n${diff.moved.map((m) => `  ${m}`).join("\n")}\n`);
if (!diff.capabilities.length && !diff.fields.length) {
  console.log(`No capability or field removed against ${ref}.`);
} else if (allowed) {
  console.log(`Breaking change allowed (the PR has the "breaking" label).`);
} else {
  console.error(`A removed capability or field breaks the integrations built on it (ATSS.md § Compatibility policy). ` +
    `If it is intended, a maintainer adds the "breaking" label to the PR and re-runs this job.`);
  process.exit(1);
}
