# CLAUDE.md — afrotools/afrotools

## What this repo is

Public repo. Single source of truth for all Afro.tools API specs and the Claude Code plugin.
Contains only static files — no build step, no compiled output.

**Org:** `afrotools` on GitHub
**This repo:** `afrotools/afrotools`

The MCP server (`afrotools/core/apps/mcp`) reads specs remotely via GitHub raw URLs.
The `plugin/` folder is the Claude Code plugin users install to get Afro.tools in their editor.

## Repo map

| Repo | Visibility | Role |
|---|---|---|
| afrotools/afrotools | **Public** | Specs + Claude Code plugin |
| afrotools/core | **Private** | Monorepo — web + mcp + infra (Turborepo) |
| afrotools/examples | **Public** | Working Next.js 16 examples |

## Structure

```
afrotools/afrotools/
├── specs/                       ← ATSS specs (static JSON + TypeScript)
│   ├── payment/
│   │   ├── paycard/             ← first provider (Guinea, GNF)
│   │   ├── wave/
│   │   ├── lengopay/
│   │   ├── djomy/
│   │   └── bictorys/
│   ├── communications/          ← SMS, WhatsApp, USSD, voice, email
│   │   ├── nimbasms/
│   │   └── africastalking/
│   ├── identity/                ← KYC, document verification, AML
│   │   └── smileid/
│   ├── logistics/               ← delivery, couriers, parcel tracking
│   │   └── yango/
│   └── language/                ← speech-to-text / text-to-speech for African languages
│       └── intron/
├── plugin/                      ← Claude Code plugin
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── .mcp.json
│   └── skills/
│       ├── payment/
│       │   └── SKILL.md         ← auto-activation for payment APIs
│       ├── communications/
│       │   └── SKILL.md         ← auto-activation for SMS/WhatsApp/USSD/voice/email APIs
│       ├── identity/
│       │   └── SKILL.md         ← auto-activation for identity verification (KYC) APIs
│       ├── logistics/
│       │   └── SKILL.md         ← auto-activation for delivery / courier APIs
│       ├── language/
│       │   └── SKILL.md         ← auto-activation for speech/language APIs
│       ├── spec/
│       │   └── SKILL.md         ← /afrotools:spec (manual only)
│       └── list/
│           └── SKILL.md         ← /afrotools:list (manual only)
├── scripts/
│   ├── validate.js
│   ├── validate.test.js
│   ├── spec-diff.js             ← removed capabilities/fields vs main (CI, "breaking" label)
│   ├── spec-diff.test.js
│   ├── test_live.py
│   ├── ci_resolve_live_test_env.py
│   └── generate-readme.js
├── ATSS.md
├── schema.template.json
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
├── LICENSE
├── CLAUDE.md
├── README.md
└── package.json
```

## Terminology

- **Spec** — ATSS-compliant description of one API capability (`schema.json` + `canonical_example.ts`)
- **SKILL.md** — Claude Code skill file that teaches the agent when and how to use the Afro.tools MCP
- These are two different things. Never confuse them.

## Core rules — specs/

- Each spec lives at `specs/{category}/{provider_slug}/{capability}/`
- Every spec folder contains exactly two files: `schema.json` + `canonical_example.ts`
- `package.json` installs validation deps only: `typescript`, `ajv`, `ajv-formats`
- Never add application code, MCP code, or Node.js scripts to `specs/`
- Gotchas and open questions are sourced (see ATSS.md § Gotchas — writing guide)

## Core rules — plugin/

- `plugin/.mcp.json` points to `https://mcp.afro.tools/mcp` (Streamable HTTP)
- `plugin/skills/payment/SKILL.md`, `plugin/skills/communications/SKILL.md`, `plugin/skills/identity/SKILL.md`, `plugin/skills/logistics/SKILL.md` and `plugin/skills/language/SKILL.md` activate automatically
- `plugin/skills/spec/SKILL.md`, `list`, `new`, `studio`, `check`, `review` and `diagnose` are manual-only (`disable-model-invocation: true`); a manual skill cannot be invoked by the agent, so Studio reads `check` and `review` as files
- `plugin/skills/studio/references/vendor/` holds copied third-party files: each starts with its source, license and changes, its license goes in `plugin/third_party/` (`scripts/third-party.test.js`)
- When adding a new category to `specs/`, add a corresponding `plugin/skills/{category}/SKILL.md`
- Never embed API keys or credentials in plugin files
- A skill's **workflow steps** must never hardcode a definitive/exhaustive list of "available" or "planned" providers — the registry changes independently of the skill file, and a stale list makes the agent wrongly refuse a provider that already has a spec (this happened: `payment`/`sms` said Bictorys/Africa's Talking had "no spec yet" long after they shipped). Always instruct the agent to call `list_providers`/`search_specs` to discover what exists. Provider names as illustrative examples in a skill's YAML `description` (for activation matching) are fine — the anti-pattern is a workflow step that gates behavior on a hardcoded enumeration.

## Spec status lifecycle

```
draft → ready → verified → deprecated → archived
```

- `draft` — work in progress, not yet validated
- `ready` — schema valid, canonical_example compiles, gotchas present. Visible in MCP.
- `verified` — ready + tested against the API (`test:live`, a working app, or an accepted community integration report), recorded in the spec's `verification` block with its environment, date and `spec_hash` (see ATSS.md § verified). "AI Ready" is a promise of the whole registry, not earned per provider — see ATSS.md § AI Ready.
- `deprecated` — the provider deprecated it: `deprecation` block (`reason`, `replaced_by?`, `removed_after?`), still served with a warning. Once removed, the folder is deleted and a tombstone goes in `provider.json` `removed_capabilities` — see ATSS.md § Compatibility policy. A PR that removes a capability or a field needs the `breaking` label (`scripts/spec-diff.js` in CI).
- Only maintainers can set `verified`, `deprecated`, or `archived`.

## Running validation

```bash
npm install
npm run validate               # validate all specs
npm run validate:changed       # validate only git-changed specs (CI)
```

Validation checks:
1. Folder structure — exactly `schema.json` + `canonical_example.ts`
2. `schema.json` — valid against ATSS JSON schema, all required fields present; `input_schema`, `response_schema`, `error_schema` and parameter schemas compile (a dangling `$ref` fails)
3. `canonical_example.ts` — compiles with `tsc --noEmit`, zero errors

## Git workflow

- Branch naming: `spec/{provider}-{capability}`, `fix/{provider}-{capability}`, `docs/...`, `chore/...`
- Commits: Conventional Commits — `feat(paycard): add create_payment spec`
- Everything via PR — never push directly to main
- Squash merge only
- An agent opening a PR that changes `specs/`, `plugin/`, `scripts/`, `.github/`, `ATSS.md` or `atss.schema.json` first has it reviewed by a subagent that did not write it (or by a new session if it cannot start one): give it the diff, the changed files and the provider docs used, not your conclusions. Check each finding yourself and fix the ones that hold. If no review was possible, say so in the PR description

## Dependency graph

This repo has NO runtime dependencies on afrotools/core, afrotools/examples.
It is a fully standalone static registry.

`afrotools/core/apps/mcp` reads from this repo via GitHub raw URLs (via `packages/registry` build step).
`afrotools/examples` uses specs as the reference for its integration layer.

## Adding a spec — contributor checklist

1. Create branch `spec/{provider}-{capability}`
2. Create folder `specs/{category}/{provider_slug}/{capability}/`
3. Add `schema.json` following `schema.template.json`
4. Add `canonical_example.ts` following ATSS rules in `specs/CLAUDE.md`
5. Run `npm run validate` — must pass with zero errors
6. Set `status` to `draft` or `ready` in `schema.json`
7. Open a PR with the template filled in
8. After merge: update `CHANGELOG.md`

## What Claude Code must never do here

- Never create a `package.json` inside a spec folder
- Never add a build script or bundler to the root `package.json`
- Never use npm imports inside `canonical_example.ts` — native fetch only
- Never set status to `verified` — only maintainers do this
- Never add MCP server code to this repo
- Never put real API keys or secrets in `plugin/.mcp.json`
- Never push directly to main — always use a branch and PR
- In a new or edited `canonical_example.ts`, put an id in a URL through `encodeURIComponent`, as the decoded value (`URLSearchParams.get` already decodes it: never encode a value read raw from a URL, or it is encoded twice). Exception: an id that can hold `+`, `/` or `=` (base64, like LengoPay's `pay_id`): do not encode it unless a test shows the provider decodes `%2B`, `%2F` and `%3D`. No format check or validation helper in the example — the format is the provider's to check; where the id comes from goes in a gotcha. Older examples that interpolate ids raw are aligned in their own PR, not in an unrelated one