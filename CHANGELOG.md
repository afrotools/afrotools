# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed

- `scripts/validate.js` rejects a provider slug reused in another category, in every mode (`--changed` included): the registry, the MCP and the website index providers by slug alone, so the second provider silently shadowed the first. CI now runs `scripts/validate.test.js`.
- `scripts/test_live.py` sends an explicit `User-Agent` (Cloudflare-fronted sandboxes such as
  Smile ID's ban urllib's default with error 1010) and skips a step whose headers depend on an
  earlier step that returned nothing, instead of crashing.
- `scripts/test_live.py` fixtures: per-step `wait_seconds` (e.g. let an async job become visible
  before reading its status). Live-test workflow uses `actions/setup-python@v6` (Node 24).
- **Wave** (issue #76): the webhook example now records the event before answering 200 (and answers 500 if that fails,
  so Wave retries), handles both webhook security modes (Signing Secret and Shared Secret), and no longer claims Wave
  retries after a 200. New gotchas on optional request signing (`Wave-Signature` on API calls, permanent per key) and the
  API IP allowlist (cannot be disabled from the portal). `error_schema.details` may be `null` or absent. The "no sandbox"
  gotcha is reworded to what Wave's docs actually say.
- Plugin skill `new`: the gotcha examples are marked as style examples, not provider facts (plugin 1.2.1).

### Changed

- **Bictorys** `create_charge` and `webhook_payment_completed` are `verified`: working hosted-checkout +
  signed-webhook integration in `afrotools/examples` (`shop-senegal`, `lib/bictorys.ts`).
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
- Plugin skill `new`: `currency` is documented as required for `payment` specs only (plugin 1.2.2).

### Added

- **Smile ID** (`specs/identity/smileid`, V3 API, CI/SN/GN): `generate_token`, `enhanced_kyc`,
  `create_smile_link`, `get_smile_link`, `get_verification_status`, `replay_verification_webhook`,
  `aml_check_sync`, `list_supported_documents`, `webhook_verification_result`,
  `document_verification` (Web SDK). New `identity` category.
  `verified` (sandbox live test passing, https://github.com/afrotools/afrotools/actions/runs/40121352004):
  `generate_token`, `list_supported_documents`, `enhanced_kyc`, `get_verification_status`,
  `aml_check_sync`, `create_smile_link`, `get_smile_link`.
- Plugin skill `identity` — auto-activates for KYC / identity verification integrations
  (plugin 1.3.0). Run `claude plugin update afrotools`.
- `communications/infobip`: 13 specs from the Infobip OpenAPI (3.255.0) — SMS send, delivery reports and logs; WhatsApp
  text and template messages and template listing; the 2FA (OTP over SMS) flow from application setup to PIN
  verification; and the SMS and WhatsApp delivery-report webhooks. The two webhooks are `draft`: the OpenAPI doesn't
  describe how Infobip signs webhook calls.
- **Yango Delivery** (`specs/logistics/yango`, Express Delivery API v2, CI/GH/SN/ZM):
  `check_delivery_price`, `create_delivery_claim`, `get_delivery_claim`, `accept_delivery_claim`,
  `get_cancellation_terms`, `cancel_delivery_claim`, `get_claims_journal`, `get_tracking_links`.
  New `logistics` category.
- Plugin skill `logistics` — auto-activates for delivery / courier integrations (plugin 1.4.0).
  Run `claude plugin update afrotools`.
- **Intron** (`specs/language/intron`, speech-to-text for 36 African languages incl. Wolof, Pulaar,
  Swahili, Hausa, and text-to-speech for 12): `transcribe_audio_sync`, `submit_audio_transcription`,
  `get_transcription_status`, `synthesize_speech_sync`, `submit_speech_synthesis`,
  `get_speech_synthesis_status`, `get_credits_balance`. New `language` category.
- Plugin skill `language` — auto-activates for speech-to-text / text-to-speech African-language integrations
  (plugin 1.5.0). Run `claude plugin update afrotools`.
- `provider.json` field `channels` (`sms`, `whatsapp`, `ussd`, `voice`, `email`) — required
  for the `communications` category, optional elsewhere; enforced by `scripts/validate.js`.
- `scripts/test_live.py` fixtures: per-step `content_type: "multipart/form-data"` (nested values
  sent as JSON strings) and `skip_auth` (for token-exchange or unauthenticated calls);
  `auth_secondary_env` now works with any auth type, so the live-test workflow can export a
  second credential (e.g. a partner ID) for it.
