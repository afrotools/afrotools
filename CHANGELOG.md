# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed

- **Wave** (issue #76): the webhook example now records the event before answering 200 (and answers 500 if that fails,
  so Wave retries), handles both webhook security modes (Signing Secret and Shared Secret), and no longer claims Wave
  retries after a 200. New gotchas on optional request signing (`Wave-Signature` on API calls, permanent per key) and the
  API IP allowlist (cannot be disabled from the portal). `error_schema.details` may be `null` or absent. The "no sandbox"
  gotcha is reworded to what Wave's docs actually say.
- Plugin skill `new`: the gotcha examples are marked as style examples, not provider facts (plugin 1.2.1).

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

- `provider.json` field `channels` (`sms`, `whatsapp`, `ussd`, `voice`, `email`) — required
  for the `communications` category, optional elsewhere; enforced by `scripts/validate.js`.
