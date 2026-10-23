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
- `schema.json` `currency` is required for `payment` specs only, and the country/currency
  coherence check runs only for them — the field means nothing for identity, communications,
  etc. Existing non-payment specs keep their `currency` (still validated as an array).

### Added

- `provider.json` field `channels` (`sms`, `whatsapp`, `ussd`, `voice`, `email`) — required
  for the `communications` category, optional elsewhere; enforced by `scripts/validate.js`.
- `scripts/test_live.py` fixtures: per-step `content_type: "multipart/form-data"` (nested values
  sent as JSON strings) and `skip_auth` (for token-exchange or unauthenticated calls);
  `auth_secondary_env` now works with any auth type, so the live-test workflow can export a
  second credential (e.g. a partner ID) for it.
