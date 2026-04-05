---
name: afrotools-list
description: >
  List all available specs in the Afro.tools registry, optionally filtered by
  category or provider. Manual invocation only.
disable-model-invocation: true
---

# /afrotools:list

Lists all specs available in the Afro.tools registry.

## Usage

```
/afrotools:list
/afrotools:list payment
/afrotools:list sms
/afrotools:list paycard
```

## What it returns

A table of available specs with their provider, category, capability, country,
currency, and current status (`draft`, `compliant`, or `verified`).

## MCP call

```
afrotools.list_specs({ category?: "<category>", provider?: "<provider>" })
```
