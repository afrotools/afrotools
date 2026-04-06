# CLAUDE.md — afrotools/afrotools

## What this repo is

Public repo. Single source of truth for all Afro.tools API specs and the Claude Code plugin.
Contains only static files — no build step, no compiled output.

**Org:** `afrotools` on GitHub
**This repo:** `afrotools/afrotools`

The MCP server (`afrotools/mcp`, private) reads specs remotely via GitHub raw URLs.
The `plugin/` folder is the Claude Code plugin users install to get Afro.tools in their editor.

## Repo map

| Repo | Visibility | Role |
|---|---|---|
| afrotools/afrotools | **Public** | Specs + Claude Code plugin |
| afrotools/mcp | **Private** (MVP) | MCP server — Streamable HTTP |
| afrotools/examples | **Public** | Working Next.js 16 examples |
| afrotools/core | **Private** | Landing page + infra |

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
│   └── sms/
│       └── nimbasms/
├── plugin/                      ← Claude Code plugin
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── .mcp.json
│   └── skills/
│       ├── payment/
│       │   └── SKILL.md         ← auto-activation for payment APIs
│       ├── sms/
│       │   └── SKILL.md         ← auto-activation for SMS APIs
│       ├── spec/
│       │   └── SKILL.md         ← /afrotools:spec (manual only)
│       └── list/
│           └── SKILL.md         ← /afrotools:list (manual only)
├── scripts/
│   └── validate.js
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

## Core rules — plugin/

- `plugin/.mcp.json` points to `https://mcp.afro.tools/mcp` (Streamable HTTP)
- `plugin/skills/payment/SKILL.md` and `plugin/skills/sms/SKILL.md` activate automatically
- `plugin/skills/spec/SKILL.md` and `plugin/skills/list/SKILL.md` are manual-only (`disable-model-invocation: true`)
- When adding a new category to `specs/`, add a corresponding `plugin/skills/{category}/SKILL.md`
- Never embed API keys or credentials in plugin files

## Spec status lifecycle

```
draft → compliant → verified → deprecated → archived
```

- `draft` — work in progress, not yet validated
- `compliant` — schema valid, canonical_example compiles, gotchas present. Visible in MCP.
- `verified` — compliant + working example in afrotools/examples. Earns "AI Ready" badge.
- Only maintainers can set `verified`, `deprecated`, or `archived`.

## Running validation

```bash
npm install
npm run validate               # validate all specs
npm run validate:changed       # validate only git-changed specs (CI)
```

Validation checks:
1. Folder structure — exactly `schema.json` + `canonical_example.ts`
2. `schema.json` — valid against ATSS JSON schema, all required fields present
3. `canonical_example.ts` — compiles with `tsc --noEmit`, zero errors

## Git workflow

- Branch naming: `spec/{provider}-{capability}`, `fix/{provider}-{capability}`, `docs/...`, `chore/...`
- Commits: Conventional Commits — `feat(paycard): add create_payment spec`
- Everything via PR — never push directly to main
- Squash merge only

## Dependency graph

This repo has NO runtime dependencies on afrotools/mcp, afrotools/examples, or afrotools/core.
It is a fully standalone static registry.

afrotools/mcp reads from this repo via GitHub raw URLs.
afrotools/examples uses specs as the reference for its integration layer.

## Adding a spec — contributor checklist

1. Create branch `spec/{provider}-{capability}`
2. Create folder `specs/{category}/{provider_slug}/{capability}/`
3. Add `schema.json` following `schema.template.json`
4. Add `canonical_example.ts` following ATSS rules in `specs/CLAUDE.md`
5. Run `npm run validate` — must pass with zero errors
6. Set `status` to `draft` or `compliant` in `schema.json`
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