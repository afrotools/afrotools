---
name: list
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
/afrotools:list communications
/afrotools:list paycard
```

## What it returns

A table of the providers in the registry with their category, countries, capabilities and
verification status. The registry serves specs with status `verified` (tested by the
maintainers) and `ready` (structured from the provider's docs, not tested yet).

## MCP calls

Without an argument, or with a category, list the providers and their capabilities:

```
afrotools.list_providers()
```

Filter the result on `category` yourself. With a provider slug, list that provider's specs:

```
afrotools.search_specs({ provider: "<provider>" })
```
