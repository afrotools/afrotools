# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Changed

- **BREAKING:** the `sms` spec category is renamed `communications` — African SMS providers
  also offer WhatsApp, USSD, voice and email. Specs moved from `specs/sms/` to
  `specs/communications/`; `provider.json` now has `"category": "communications"`. Clients
  that filter on `category: "sms"` must switch to `"communications"`. Capability names
  (`send_sms`, `send_bulk_sms`, …) are unchanged.
- Plugin skill `sms` renamed `communications` (plugin 1.2.0). Run `claude plugin update afrotools`.
- `scripts/test_live.py` discovers categories from the `specs/` subfolders instead of a
  hardcoded list, and fails clearly when one provider slug exists in two categories.

### Added

- `payment/cartflox`: 22 specs from the Cartflox OpenAPI (2026-09-19) — checkout sessions and their payment methods, test-session settlement, payment links, routing, Mobile Money transfers, webhook deliveries and configuration, and the six signed webhooks. `route_payment` and `get_routing_options` are `draft`: the OpenAPI and the routing guide disagree on the response shape.
- `provider.json` field `channels` (`sms`, `whatsapp`, `ussd`, `voice`, `email`) — required
  for the `communications` category, optional elsewhere; enforced by `scripts/validate.js`.
