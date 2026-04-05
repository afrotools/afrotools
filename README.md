# Afro.tools — AI-ready infrastructure for African APIs

A static registry of structured, machine-readable API specs for African payment and SMS providers.
Each spec is a self-contained description of one API capability: what to send, what comes back, what can go wrong, and the gotchas that real integrations surface.

---

## What is a spec?

A spec lives at `specs/{category}/{provider}/{capability}/` and contains exactly two files:

- **`schema.json`** — ATSS-compliant description of the API capability (endpoint, auth, input/output schemas, gotchas)
- **`canonical_example.ts`** — TypeScript implementation using native fetch, compiles with `tsc --noEmit`

See [ATSS.md](./ATSS.md) for the full specification.

---

## Providers

| Provider | Category | Country | Capabilities | Status |
|---|---|---|---|---|
| Paycard | payment | GN | create_payment, verify_payment, webhook_payment_completed | In progress |
| Wave | payment | SN, CI, ML | create_payment, verify_payment, webhook_payment_completed | Planned |
| LengoPay | payment | — | create_payment, verify_payment | Planned |
| Djomy | payment | — | create_payment, verify_payment | Planned |
| Bictorys | payment | — | create_payment, verify_payment, webhook_payment_completed | Planned |
| NimbaSMS | sms | SN | send_otp, send_bulk | Planned |

---

## Use with an MCP client

Add to your MCP client configuration:

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "afrotools": {
      "type": "http",
      "url": "https://mcp.afro.tools/mcp"
    }
  }
}
```

### Cursor / Windsurf / other editors

```json
{
  "mcp": {
    "servers": {
      "afrotools": {
        "type": "http",
        "url": "https://mcp.afro.tools/mcp"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add afrotools --transport http https://mcp.afro.tools/mcp
```

Or add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "afrotools": {
      "type": "http",
      "url": "https://mcp.afro.tools/mcp"
    }
  }
}
```

---

## Claude Code plugin

Install the plugin to get Afro.tools skills directly in your editor:

```bash
/plugin install afrotools
```

The plugin includes:
- **Auto-activation skills** for payment and SMS tasks — the agent reads the right spec automatically
- **`/afrotools:spec`** — fetch a specific spec by provider and capability
- **`/afrotools:list`** — list all available specs

---

## Standalone SKILL.md

If you don't use the plugin, you can copy a single `SKILL.md` into your project:

```
plugin/skills/payment/SKILL.md   ← for payment integrations
plugin/skills/sms/SKILL.md       ← for SMS integrations
```

Place it in your project's `.claude/skills/` directory and Claude Code will pick it up automatically.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) to add a spec or improve an existing one.

All specs go through a lifecycle: `draft → compliant → verified`.
A provider is **AI Ready** when all its capabilities reach `verified`.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE).
