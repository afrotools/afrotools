# Security Policy

## Scope

This repository contains only static files — JSON specs and TypeScript examples.
There is no server code, no authentication logic, and no secrets stored here.

**In scope:**
- Hardcoded API keys or secrets accidentally committed to spec files
- Malicious content in `canonical_example.ts` files (e.g. code that exfiltrates data)
- Supply chain issues in validation tooling (`package.json` devDependencies)

**Out of scope:**
- Vulnerabilities in the Afro.tools MCP server (`afrotools/mcp` — separate private repo)
- Vulnerabilities in provider APIs themselves (report directly to the provider)

## Reporting a vulnerability

Please **do not open a public GitHub issue** for security concerns.

Report privately by emailing: **security@afro.tools**

Include:
- Description of the issue
- Steps to reproduce
- Affected file(s) or commit(s)

We will acknowledge receipt within 48 hours and aim to resolve confirmed issues within 7 days.

## Canonical examples

`canonical_example.ts` files are reference implementations intended to be read and adapted.
They must never contain real API keys — only `process.env` references.
If you find a file with a hardcoded secret, report it immediately via the channel above.
