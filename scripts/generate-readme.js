#!/usr/bin/env node
// @ts-check
"use strict"

/**
 * generate-readme.js
 *
 * Reads all provider.json and schema.json files from specs/ and generates
 * the providers table in README.md between the HTML comment markers.
 *
 * Usage: node scripts/generate-readme.js
 */

const fs = require("fs")
const path = require("path")

// ─── Constants ───────────────────────────────────────────────────────────────

const SPECS_ROOT = path.resolve(__dirname, "../specs")
const README_PATH = path.resolve(__dirname, "../README.md")
const START_MARKER =
  "<!-- tableau généré automatiquement par le pipeline — ne pas éditer manuellement -->"
const END_MARKER = "<!-- fin du tableau -->"
const MAX_FLAGS = 3

// Statuses considered "visible" in the registry
const VISIBLE_STATUSES = new Set(["ready", "compliant", "verified"])

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a 2-letter ISO country code to an emoji flag.
 * Uses Unicode Regional Indicator Symbols (0x1F1E6 = 🇦).
 * @param {string} code
 * @returns {string}
 */
function toFlag(code) {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("")
}

/**
 * Build a flags string: up to MAX_FLAGS emoji flags, then "+N" if more.
 * @param {string[]} countryCodes
 * @returns {string}
 */
function buildFlags(countryCodes) {
  if (!countryCodes || countryCodes.length === 0) return "—"
  const flags = countryCodes.map(toFlag)
  if (flags.length <= MAX_FLAGS) return flags.join(" ")
  const shown = flags.slice(0, MAX_FLAGS)
  const extra = flags.length - MAX_FLAGS
  return shown.join(" ") + ` +${extra}`
}

// ─── Provider discovery ───────────────────────────────────────────────────────

/**
 * @typedef {{ status: string }} Capability
 * @typedef {{ name: string, category: string, country_code: string[], capabilities: Capability[] }} ProviderData
 */

/**
 * Discover all providers by reading provider.json and schema.json files.
 * @returns {ProviderData[]}
 */
function discoverProviders() {
  /** @type {ProviderData[]} */
  const providers = []

  let categories
  try {
    categories = fs.readdirSync(SPECS_ROOT)
  } catch {
    console.error(`Could not read specs directory: ${SPECS_ROOT}`)
    process.exit(1)
  }

  for (const category of categories) {
    const categoryDir = path.join(SPECS_ROOT, category)
    if (!fs.statSync(categoryDir).isDirectory()) continue

    let providerSlugs
    try {
      providerSlugs = fs.readdirSync(categoryDir)
    } catch {
      continue
    }

    for (const slug of providerSlugs) {
      const providerDir = path.join(categoryDir, slug)
      if (!fs.statSync(providerDir).isDirectory()) continue

      // Read provider.json — skip provider if absent
      const providerJsonPath = path.join(providerDir, "provider.json")
      if (!fs.existsSync(providerJsonPath)) continue

      let providerMeta
      try {
        providerMeta = JSON.parse(fs.readFileSync(providerJsonPath, "utf8"))
      } catch (err) {
        console.warn(`Skipping ${slug}: could not parse provider.json — ${err.message}`)
        continue
      }

      // Discover capabilities: subdirectories that contain a schema.json
      const capabilities = []
      let entries
      try {
        entries = fs.readdirSync(providerDir)
      } catch {
        entries = []
      }

      for (const entry of entries) {
        const capDir = path.join(providerDir, entry)
        if (!fs.statSync(capDir).isDirectory()) continue
        const schemaPath = path.join(capDir, "schema.json")
        if (!fs.existsSync(schemaPath)) continue

        let schema
        try {
          schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"))
        } catch {
          continue
        }

        // Only include visible statuses (exclude draft, deprecated, archived)
        if (VISIBLE_STATUSES.has(schema.status)) {
          capabilities.push({ status: schema.status })
        }
      }

      providers.push({
        name: providerMeta.name,
        category: providerMeta.category,
        country_code: providerMeta.country_code || [],
        capabilities,
      })
    }
  }

  return providers
}

// ─── Status computation ───────────────────────────────────────────────────────

/**
 * Compute the display status for a provider based on its capabilities.
 * @param {Capability[]} capabilities
 * @returns {string}
 */
function computeStatus(capabilities) {
  if (capabilities.length === 0) return "🗓 Planifié"

  const verifiedCount = capabilities.filter((c) => c.status === "verified").length
  const readyCount = capabilities.length - verifiedCount

  if (verifiedCount === capabilities.length) return "✅ AI Ready"
  if (verifiedCount > 0) return `${verifiedCount} verified · ${readyCount} ready`
  return "📋 Ready"
}

// ─── Table generation ─────────────────────────────────────────────────────────

/**
 * Sort providers: all_verified first, then by verified_count desc, then alphabetically.
 * @param {ProviderData[]} providers
 * @returns {ProviderData[]}
 */
function sortProviders(providers) {
  return [...providers].sort((a, b) => {
    const aVerified = a.capabilities.filter((c) => c.status === "verified").length
    const bVerified = b.capabilities.filter((c) => c.status === "verified").length
    const aAllVerified = a.capabilities.length > 0 && aVerified === a.capabilities.length
    const bAllVerified = b.capabilities.length > 0 && bVerified === b.capabilities.length

    if (aAllVerified !== bAllVerified) return aAllVerified ? -1 : 1
    if (bVerified !== aVerified) return bVerified - aVerified
    return a.name.localeCompare(b.name)
  })
}

/**
 * Build the Markdown providers table.
 * @param {ProviderData[]} providers
 * @returns {string}
 */
function buildTable(providers) {
  const header = "| Provider | Catégorie | Pays | Capabilities | Statut |"
  const sep = "|----------|-----------|------|-------------|--------|"

  const rows = providers.map((p) => {
    const flags = buildFlags(p.country_code)
    const capCount = p.capabilities.length > 0 ? String(p.capabilities.length) : "—"
    const status = computeStatus(p.capabilities)
    return `| ${p.name} | ${p.category} | ${flags} | ${capCount} | ${status} |`
  })

  return [header, sep, ...rows].join("\n")
}

// ─── README injection ─────────────────────────────────────────────────────────

/**
 * Inject the generated table into README.md between the HTML comment markers.
 * Idempotent: running twice produces the same result.
 * @param {string} table
 */
function injectIntoReadme(table) {
  let content
  try {
    content = fs.readFileSync(README_PATH, "utf8")
  } catch (err) {
    console.error(`Could not read README.md: ${err.message}`)
    process.exit(1)
  }

  // Match everything between (and including) the two markers
  const regex =
    /<!-- tableau généré automatiquement[^>]*-->[\s\S]*?<!-- fin du tableau -->/

  if (!regex.test(content)) {
    console.error(
      "ERROR: Markers not found in README.md.\n" +
        `Expected opening marker: ${START_MARKER}\n` +
        `Expected closing marker: ${END_MARKER}`
    )
    process.exit(1)
  }

  const replacement = `${START_MARKER}\n${table}\n${END_MARKER}`
  const updated = content.replace(regex, replacement)

  fs.writeFileSync(README_PATH, updated, "utf8")
  console.log(`✓ README.md updated (${providers.length} providers)`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const providers = discoverProviders()
const sorted = sortProviders(providers)
const table = buildTable(sorted)
injectIntoReadme(table)
