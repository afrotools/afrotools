---
name: spec
description: >
  Fetch and display the full ATSS spec for a specific provider and capability.
  Use this to inspect a spec before implementing, review field rules, or check
  gotchas. Manual invocation only.
disable-model-invocation: true
---

# /afrotools:spec

Fetches the full spec for a given provider and capability from the Afro.tools registry.

## Usage

```
/afrotools:spec <provider> <capability>
```

Examples:
```
/afrotools:spec paycard create_payment
/afrotools:spec lengopay verify_payment
/afrotools:spec paycard webhook_payment_completed
```

## What it returns

The full `schema.json` for the requested spec, including:
- Endpoint (method + URL)
- Auth configuration
- Input, response, and error schemas
- Gotchas

## MCP call

```
afrotools.get_spec({ provider: "<provider>", capability: "<capability>" })
```
