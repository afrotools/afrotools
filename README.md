# Afro.tools — AI-ready infrastructure for African APIs

[![mcptry](https://mcptry.com/badge/io.github.afrotools/afrotools)](https://mcptry.com/servers/io.github.afrotools/afrotools)

> Integrate Wave, Paycard, and any African API in a single prompt.

African APIs are production-grade. What's been missing is a standard,
machine-readable format that AI agents can consume directly — without
parsing documentation pages or guessing at request shapes.

Afro.tools fills that gap: a static, open-source registry of structured
specs for African APIs, written from each provider's official documentation.
Every provider is **AI Ready**: an agent gets a structured description of
exactly what it needs to generate integration code. A spec can still contain
errors — its `status` says how far it has been checked (`verified` = tested
against the provider's API by a maintainer).

---

## How it works

```mermaid
graph LR
    A["specs/ — open source"] -->|GitHub raw URLs| B["MCP server\nmcp.afro.tools"]
    B -->|MCP protocol| C["AI agent\nClaude · Cursor · Copilot · ..."]
    C -->|generates| D["Integration code\nin your app"]
    A -->|plugin| C
```

---

## What is a spec?

A spec lives at `specs/{category}/{provider}/{capability}/` and contains exactly two files:

- **`schema.json`** — ATSS-compliant description of the API capability (endpoint, auth, input/output schemas, gotchas)
- **`canonical_example.ts`** — TypeScript implementation using native fetch, compiles with `tsc --noEmit`

Each provider also has a **`provider.json`** at the root of its folder:

```
specs/payment/paycard/
├── provider.json                    ← metadata + description + example_prompt
├── create_payment/
│   ├── schema.json
│   └── canonical_example.ts
├── verify_payment/
└── webhook_payment_completed/
```

See [ATSS.md](./ATSS.md) for the full specification.

---

## Providers

<!-- tableau généré automatiquement par le pipeline — ne pas éditer manuellement -->
| Provider | Category | Country | Capabilities | Status |
|----------|----------|---------|--------------|--------|
| SasPay | payment | 🇧🇫 🇧🇯 🇨🇩 +15 | 13 | 7 verified · 6 ready |
| Smile ID | identity | 🇨🇮 🇸🇳 🇬🇳 +3 | 11 | 7 verified · 4 ready |
| Bictorys | payment | 🇸🇳 🇨🇮 🇲🇱 +3 | 5 | 3 verified · 2 ready |
| Djomy | payment | 🇬🇳 | 7 | 2 verified · 5 ready |
| Infobip | communications | 🇦🇴 🇧🇫 🇧🇮 +51 | 13 | 2 verified · 11 ready |
| LengoPay | payment | 🇬🇳 | 8 | 2 verified · 6 ready |
| Paycard | payment | 🇬🇳 | 3 | 2 verified · 1 ready |
| Africa's Talking | communications | 🇧🇫 🇧🇯 🇨🇮 +17 | 7 | 1 verified · 6 ready |
| Flutterwave | payment | 🇳🇬 🇬🇭 🇰🇪 +15 | 33 | 📋 Ready |
| Intron | language | 🇦🇴 🇧🇫 🇧🇮 +51 | 7 | 📋 Ready |
| KadevPay | payment | 🇨🇮 | 3 | 📋 Ready |
| NimbaSMS | communications | 🇬🇳 | 11 | 📋 Ready |
| Notch Pay | payment | 🇨🇲 🇨🇮 🇸🇳 +3 | 31 | 📋 Ready |
| Orange Money Mali | payment | 🇲🇱 | 2 | 📋 Ready |
| PayGate | payment | 🇹🇬 | 6 | 📋 Ready |
| Qosic | payment | 🇹🇬 | 4 | 📋 Ready |
| Wave | payment | 🇸🇳 🇨🇮 🇲🇱 +8 | 12 | 📋 Ready |
| Yango Delivery | logistics | 🇨🇮 🇬🇭 🇸🇳 +1 | 8 | 📋 Ready |
<!-- fin du tableau -->

**Legend:** ✅ All verified = all capabilities `verified` · X verified · Y ready = Y specs not yet tested against the API · 📋 Ready = written from the docs, not yet tested · 🗓 Planned = specs coming soon

---

## Use with an MCP client

The server answers at `https://mcp.afro.tools/mcp` (Streamable HTTP, no key). In Claude Code, prefer the [plugin](#claude-code-plugin): it adds the skills too.

### Claude (claude.ai and Claude Desktop)

afro.tools is in the Claude connector directory: [claude.ai/directory/afrotools](https://claude.ai/directory/afrotools). In Claude, go to Customize → Connectors → Discover, search for afro.tools, then Connect to Claude. On Team and Enterprise plans, an Owner adds it for the organization first.

### Claude Code (MCP server only)

```bash
claude mcp add --transport http afrotools https://mcp.afro.tools/mcp
```

### ChatGPT

On the web: Plugins → + → Add custom MCP server, paste `https://mcp.afro.tools/mcp` with authentication None, then Create as a plugin and install it. OpenAI offers it on the Business, Enterprise and Edu plans; on Business, only admins and owners can add it.

### Codex

```bash
codex mcp add afrotools --url https://mcp.afro.tools/mcp
```

### Cursor

In `.cursor/mcp.json` (one project) or `~/.cursor/mcp.json` (all projects):

```json
{
  "mcpServers": {
    "afrotools": {
      "url": "https://mcp.afro.tools/mcp"
    }
  }
}
```

### VS Code (Copilot agent mode)

In `.vscode/mcp.json` (the top-level key is `servers`):

```json
{
  "servers": {
    "afrotools": {
      "type": "http",
      "url": "https://mcp.afro.tools/mcp"
    }
  }
}
```

### Windsurf and Antigravity

Windsurf: `mcp_config.json`, opened from Cascade (… → Open MCP config file). Antigravity: `~/.gemini/config/mcp_config.json`. Both use the `serverUrl` key:

```json
{
  "mcpServers": {
    "afrotools": {
      "serverUrl": "https://mcp.afro.tools/mcp"
    }
  }
}
```

### Gemini CLI

```bash
gemini mcp add --transport http -s user afrotools https://mcp.afro.tools/mcp
```

---

## Claude Code plugin

```
/plugin install afrotools --marketplace afrotools/afrotools
```

On Claude Code older than 2.1.275, in two steps:

```
/plugin marketplace add afrotools/afrotools
/plugin install afrotools
```

**Auto-activated skills** based on context:
- `studio` — **afro.tools Studio**, when you describe an app or a service to create for an African market: from the idea to an app in production (a short plan, a clean design, mobile money, SMS and WhatsApp wired from the registry, checks before going live). It asks before starting, and you can also type `/afrotools:studio`. Works for non-developers too: it explains in plain words and asks only what it must
- `payment` — integrating a payment API
- `communications` — integrating an SMS, WhatsApp, USSD, voice or email API
- `identity` — integrating an identity verification (KYC, document, AML) API
- `logistics` — integrating a delivery or courier API (price, book, track, cancel deliveries)
- `language` — integrating a speech-to-text or text-to-speech API for African languages
- `debug` — when an integration based on an afrotools spec fails → diagnoses whether the problem is a spec error, a missing gotcha, or an undocumented API change

**Manual commands:**
- `/afrotools:spec <provider> <capability>` — inspect a full spec
- `/afrotools:list` — list all available specs
- `/afrotools:new <category> <provider> <capability>` — scaffold a new spec
- `/afrotools:check` — before going live: keys in the code or the browser, payments confirmed server-side, nothing paid twice, webhooks verified
- `/afrotools:review [audit]` — a code review or security audit by a separate reviewer
- `/afrotools:diagnose` — something went wrong with Studio or a skill: a cleaned bug report you submit yourself

Studio offers three optional companions once, never required: [superpowers](https://github.com/obra/superpowers) (planning method), [Impeccable](https://github.com/pbakaus/impeccable) (designs the screens and critiques them before any code) and [Playwright MCP](https://github.com/microsoft/playwright-mcp) (checking screens in a browser).

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) to add a spec or improve an existing one.

**Integrated a provider?** [Report it](https://github.com/afrotools/afrotools/issues/new?template=integration-report.yml) — worked or not, sandbox or
production. A report that worked can make the spec `verified`, credited to you; one that did not
gets the spec fixed.

Spec lifecycle: `draft → ready → verified`

Every provider in the registry is **AI Ready**: its specs give an agent a structured, machine-readable description to integrate it. AI Ready is not a guarantee that a spec is error-free — `verified` marks the specs tested against the provider's API — by a maintainer or through an accepted integration report — and says where: sandbox or production.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE).
