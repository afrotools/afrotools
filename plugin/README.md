# afro.tools

African APIs, ready for your AI agent. The plugin gives Claude Code the specs of African payment, messaging, identity, delivery and speech providers (Wave, Paycard, Bictorys, Africa's Talking, Infobip and more), so it writes integration code from the provider's real endpoints, parameters and gotchas instead of guessing. It also includes **Studio**, which takes an app from an idea to production for African markets.

Every spec is open source at [github.com/afrotools/afrotools](https://github.com/afrotools/afrotools). A spec marked `verified` was tested against the provider's API; the others are written from the provider's documentation and can contain errors.

## Install

```
/plugin install afrotools --marketplace afrotools/afrotools
```

That is one step on Claude Code 2.1.275 or later. On an older version:

```
/plugin marketplace add afrotools/afrotools
/plugin install afrotools
```

## What you get

| Command | What it does |
|---|---|
| `/afrotools:studio` | Plans, designs, builds and checks an app, one phase at a time, at an explain or a quiet level. |
| `/afrotools:payment`, `communications`, `identity`, `logistics`, `language` | Integrate a provider from its spec (they also start on their own when you ask for a payment, an SMS, a KYC check, and so on). |
| `/afrotools:check` | A pre-production check: a local script looks for keys in the code or sent to the browser, then payments, webhooks and messages are checked against the specs. |
| `/afrotools:review` | A code review or a security audit by a separate reviewer. |
| `/afrotools:debug`, `/afrotools:diagnose` | Find out whether a failure comes from a spec, and prepare a bug report you submit yourself. |
| `/afrotools:list`, `/afrotools:spec` | List the registry, show one spec. |
| `/afrotools:new` | For contributors: add a provider to the registry from its documentation. |

## What it runs, sends and fetches

- **The MCP server** (`https://mcp.afro.tools/mcp`, declared in `.mcp.json`) answers the agent's requests for specs. It receives the tool called and its parameters (a provider name, a search text) and the name your agent gives itself when it connects. For an integration report, it also receives the text the agent wrote and only turns it into the link below: it is not stored. Nothing in the plugin sends your code, your files or your keys to it.
- **Two scripts run on your computer, with no network access:** `skills/check/scripts/scan-secrets.mjs` reads the files of your project to find keys; `skills/diagnose/scripts/issue-url.mjs` builds a link.
- **Reports and diagnostics** only build a pre-filled GitHub link. Nothing is sent until you read the text and submit the form yourself on GitHub.
- **Studio can offer to install two optional companions**, the Impeccable design plugin and the Playwright browser tool, and only runs the command after you say yes. It never fills a payment page and never confirms a payment for you.
- **Studio writes into your project:** a `.afrotools/studio.md` state file, `docs/` notes, and local Git save points. It never pushes unless you ask.
- Your provider keys stay in your own `.env`. The plugin never stores them or sends them anywhere; the local scan only looks for keys that should not be in your code.

What the project collects, and for how long: [afro.tools/privacy](https://afro.tools/privacy).

## Providers

See the [registry](https://afro.tools/providers) for the list, the countries each one serves and the status of each capability. Missing a provider? [Request it](https://github.com/afrotools/afrotools/issues/new?template=new_spec.yml).

## License

Apache-2.0. Copied reference files keep their own licenses: see `third_party/NOTICE.md`.
