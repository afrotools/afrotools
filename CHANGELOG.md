# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- ATSS 1.1 `parameters` (path, query and header parameters; `input_schema` stays the body) and `success_condition` (the response field that says a 2xx call succeeded). `validate` checks every path parameter fills an `endpoint.url` placeholder and every placeholder has one, that a parameter is not also a body field (and a GET/DELETE with parameters has no body), and that `success_condition` names a field of `response_schema` with values of its type. It warns on a payment POST that moves money without a word on idempotency (14 specs today), and on a 1.1 spec whose URL has placeholders but no `parameters` yet (the migration list). No spec uses the new blocks yet; plugin 1.7.1 points the spec skill at them.

### Fixed

- `scripts/validate.js` rejects a provider slug reused in another category, in every mode (`--changed` included): the registry, the MCP and the website index providers by slug alone, so the second provider silently shadowed the first. CI now runs `scripts/validate.test.js`.
- `scripts/test_live.py` no longer reports success when calls fail: a step fails on an unexpected HTTP status (default: non-2xx, overridable per step with `expected_status`), and a skipped step (missing schema, or a path param or header from an earlier step that returned nothing) fails the run. Before, a run where every call got a 401 printed "live responses match the spec ✓" and exited 0 whenever the response schema had no `required` field. Offline tests in `scripts/test_live_test.py`, run in CI.
- Plugin skills (1.5.1): discovery starts with `list_providers()` (exact capability names per provider) and keeps a filter on `search_specs` — a whole-category search returned more than the MCP client shows inline. The payment skill no longer hardcodes `create_payment` / `verify_payment` / `webhook_payment_completed` (7 of 12 payment providers name them differently), and a `get_spec` "not found" no longer ends in "spec not available". `/afrotools:list` called `list_specs`, a tool that never existed; it now uses `list_providers` / `search_specs`. CI checks that skills only call tools the MCP exposes.
- **Flutterwave** (v4) rewritten from the OpenAPI embedded in its API reference (snapshot 2026-10-25), after an
  adversarial review found 17 blocking errors in the previous specs (e.g. transfer webhook status `succeeded` instead of
  `SUCCESSFUL`, invented fields on the orchestrator transfer, `X-Trace-Id` claimed required, wrong error codes). Every
  spec now has an `evidence` block and every quoted doc sentence is checked against the snapshot.
  - **BREAKING:** 25 rarely used capabilities removed (orders/pre-auth, list/get/delete helpers, wallet statement,
    fees, settlement by id, test-only `create_chargeback`, …); 32 kept and `resend_webhook` added (33).
  - `currency` uses `SLL` for Sierra Leone (the only code Flutterwave's API accepts) and adds USD (card charges,
    USD bank payouts); provider countries add CG, EG, ET, MW, TD (from its bank and mobile-network endpoints).
- `scripts/validate.js` accepts the pre-redenomination code `SLL` as Sierra Leone's currency (`LEGACY_CURRENCY_CODES`).
- `scripts/test_live.py` compares a response whose `data` is a union (`oneOf`) against all of its variants, and its
  default `X-Trace-Id` is alphanumeric (`afrotoolslive<ms>`; Flutterwave accepts only alphanumeric trace ids).

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

- **Infobip on ATSS 1.1**: `auth.credentials` (`INFOBIP_API_KEY`, `INFOBIP_BASE_URL` — each account has its own base URL, so no `environments`) and `auth.apply` (`Authorization: App {INFOBIP_API_KEY}`) on the 11 API specs. `webhook_sms_delivery_report` and `webhook_whatsapp_delivery_report` promoted to `ready`, the undocumented webhook signature recorded as an open question. Size: repeated sub-schemas of `send_whatsapp_template` and `list_whatsapp_templates` moved to `$defs`, content unchanged (191k → 61k and 120k → under 40k characters served by `get_spec`; the template one fits with a `variant` such as header + button type, ≈23k); the `list_whatsapp_templates` example types only the fields a sender uses, the full shape stays in `response_schema`.
- **Yango Delivery on ATSS 1.1**: `environments.production` (`https://b2b.delivery.yango.tech`, the API reference's service URL; no test environment is documented — an open question on every spec), `auth.credentials` and `auth.apply` (`Authorization: Bearer {YANGO_DELIVERY_TOKEN}`). `create_delivery_claim` fits the MCP budget (60k → 40k characters): its response is the same claim object as `get_delivery_claim`'s, so it now describes the fields needed right after creation and points to `get_delivery_claim` for the rest; its example types the same fields.
- **Paycard on ATSS 1.1**: `environments.production` (`https://mapaycard.com`, the host of the verified production integration — the docs are not public), `auth.credentials` (`PAYCARD_API_KEY`) and `auth.apply` — the key is the body field `c` of `create_payment` and the `{c}` path segment of `verify_payment`. ATSS 1.1: `auth.apply` accepts `in: "path"`, whose `name` must be a `{placeholder}` of `endpoint.url`. Both specs stay `verified` with a maintainer-approved `spec_hash`.
- **LengoPay on ATSS 1.1**: `environments.production` (`https://portal.lengopay.com`, the host of the verified production integration — LengoPay's docs are not public), `auth.credentials` (`LENGOPAY_LICENSE_KEY`, `LENGOPAY_WEBSITE_ID`) and `auth.apply` (`Authorization: Basic {LENGOPAY_LICENSE_KEY}`, the key as is). `create_payment` stays `verified` with a maintainer-approved `spec_hash`.
- **Wave, Bictorys, SasPay, Notch Pay, PayGate, KadevPay, NimbaSMS, Intron and Orange Money Mali on ATSS 1.1**: `provider.json` `environments` (sandbox only where a spec documents one: Bictorys `api.test.bictorys.com`; SasPay and Notch Pay use the same host for test and live), `auth.credentials` and, where a template can express it, `auth.apply` (Bictorys public vs private key, Notch Pay `X-Grant` on transfers, PayGate `auth_token` / `token`, Orange Money's OAuth `token_exchange`). SasPay's payment webhook declares `webhook.signature` (HMAC-SHA256 of `{header:X-Webhook-Timestamp}.{raw_body}`, hex). Missing sandboxes are recorded as `open_questions`. Verified specs (Bictorys `create_charge`, 7 SasPay specs) keep their verification with a maintainer-approved `spec_hash`.
- **Smile ID on ATSS 1.1**: both documented environments in `provider.json`; the token exchange (`POST /v3/token`, `token`, 15 minutes) and the `SmileID-Partner-ID` + `SmileID-Token` headers in `auth` instead of a prose gotcha; `webhook_verification_result` declares `webhook.signature` (HMAC-SHA256 of `Response-Timestamp` + partner ID + `sid_request`, base64). ATSS 1.1: `webhook.signature.message` may sign a request header (`{header:Name}`) and an env var. The 7 `verified` specs keep their sandbox verification with a maintainer-approved `spec_hash`.
- **Africa's Talking, refocused on what developers use**: `fetch_messages` (the docs recommend notifications instead) and the premium SMS specs (`send_premium_sms`, `create_subscription`, `webhook_subscription`, drafts) are removed. `send_sms` moves to ATSS 1.1 (environments, `credentials` with `AFRICASTALKING_USERNAME`, `apply`) and its gotchas are re-anchored on the docs: the endpoint is now labelled "Bulk (legacy)", HTTP 409 `DoNotDisturbRejection` in Nigeria (the old "always HTTP 200" was wrong), `%` and the sandbox simulator quoted from the Help Center; the unsourced "default sender only works on Airtel Kenya" became an open question. `webhook_delivery_report`, `webhook_incoming_sms` and `webhook_bulk_opt_out` are rewritten from the SMS Notifications page and promoted to `ready`; `send_bulk_sms` (the current `/messaging/bulk` endpoint) is rewritten from the Bulk page and promoted to `ready` too — `phoneNumbers` is a JSON list as in the docs' sample (it was a comma-separated string), unsourced claims removed, no sandbox yet ("coming soon") (payload in `input_schema`; no documented signature, recorded as an open question). The `currency` lists of the Africa's Talking specs are removed: no docs page backs them and `currency` is only required for payment.
- **Flutterwave on ATSS 1.1**: `provider.json` declares both documented environments (sandbox `https://developersandbox-api.flutterwave.com`, production `https://f4bexperience.flutterwave.com`); the 32 API specs describe the OAuth2 client-credentials request in `auth.token_exchange` (token server `https://idp.flutterwave.com/…/token`, form body, `access_token`, 600 s) instead of a prose gotcha; `webhook_event` declares `webhook.signature` (HMAC-SHA256 of the raw body, base64, `flutterwave-signature`) instead of a misused `api_key` auth. **Breaking for existing Flutterwave integrations generated from these specs:** credentials are now the docs' two values, `FLUTTERWAVE_CLIENT_ID` and `FLUTTERWAVE_CLIENT_SECRET` — the afrotools-only `FLUTTERWAVE_CLIENT_CREDENTIALS` (base64 of both) is gone; the `flutterwave` live-test environment needs the client_id in `LIVE_TEST_CREDENTIAL` and the client_secret in `LIVE_TEST_CREDENTIAL_SECONDARY`. Repeated sub-schemas (names, addresses, phones, IDs, accounts) of `create_transfer_recipient` and `create_orchestrator_transfer` moved to `$defs`, content unchanged: 51k → 34k and 70k → 55k characters served by `get_spec` (≈33k with a `variant`). ATSS 1.1 gains `token_exchange.url` / `body` / `content_type` and the `base64` encoding. `test:live` now runs the spec's `auth` steps (credentials, signing, token exchange, apply) and reads `environments.sandbox`; the `oauth2_token_url` fixture key is gone, and a 1.0 `oauth2` spec without these steps now stops the run instead of sending no auth. Open questions recorded from the docs: the PHP sample's other token URL, and the webhook page's framework examples that compare the header with the secret hash.
- Plugin 1.6.1: skills no longer wait for the user to confirm an integration before mentioning reports — the user usually tests later. At the end of an integration on a spec that is not `verified`, the agent says once that the spec was never tested and offers to prepare a report after the user's test; on a `verified` spec, only if something failed.
- **AI Ready** is defined once, in `ATSS.md`: a promise of the whole registry (every provider has structured specs an agent can integrate from, which can still contain errors), not a badge earned when all capabilities are `verified`. The README no longer claims every spec is verified against the live API; the providers table labels a fully verified provider "✅ All verified".
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

- **Smile ID biometric verification**: `biometric_kyc` (`POST /v3/biometric_kyc` — ID number checked against the ID authority and selfie matched to its photo; ID Coverage lists it only for Kenya, Nigeria and South Africa, now in `provider.json`) and `document_verification` rewritten as the REST `POST /v3/document_verification` (ID document photo + selfie, "available globally" — the biometric check for Senegal and Guinea), `ready`; it was a Web SDK draft blocked by the docs' conflicting product identifier. `webhook_verification_result` covers Biometric KYC results.
- **Africa's Talking USSD**: `webhook_ussd_session` (each step of a USSD menu — form fields `sessionId`, `phoneNumber`, `networkCode`, `serviceCode`, `text`; answer in `text/plain` beginning with `CON` or `END`, within 10 seconds, optional `at-ussd-hop-metadata` header) and `webhook_ussd_end_of_session` (status `Incomplete` / `Success` / `Failed`, cost, duration, hops, input), from the USSD pages of the docs. `provider.json` channels are now `sms` and `ussd` — what the registry covers.
- **ATSS 1.1 auth, webhook signature and environments** (`atss.schema.json`, ATSS.md § Blocks added in ATSS 1.1): `auth.credentials` / `signing` / `token_exchange` / `apply` describe a multi-step auth instead of prose gotchas; `webhook.signature` how to verify a webhook; `provider.json` `environments` the base URL of each documented environment. `validate` rejects a placeholder that resolves to nothing and, once `auth.credentials` is declared, an undeclared `process.env`. Djomy is the first provider migrated: sandbox base URL declared, production URL left as an open question (undocumented), webhook payload V2 (`data.payment`) and the `payment.timeout` / `payment.refunded` events added from the docs; its three `verified` specs record `sandbox` as their tested environment (the examples app calls Djomy's sandbox). `confirm_otp` goes back to `ready` — no record of its test — and follows the docs: `X-API-KEY` only (no Bearer token), payment statuses `REDIRECTED` instead of the undocumented `TIMEOUT`, `paymentLinkReference`, HTTP 403. Plugin 1.7.0: skills read these blocks.
- **ATSS 1.1** — `verification` block on every `verified` spec: method (`test_live`, `app`, `community_report`), environment (`sandbox` or `production`), date, link and `spec_hash`. `npm run validate` rejects a `verified` spec without it, a `verification` on a spec that is not `verified`, and a verified spec edited since (schema.json or canonical_example.ts) until it is verified again. The 25 verified specs carry their proof (Paycard, LengoPay, Bictorys: an app in production; Djomy: the examples app, against Djomy's sandbox; SasPay, Smile ID: `test:live` in sandbox). Optional `open_questions` for what the docs do not answer. New blocks are described in `atss.schema.json`, checked with ajv.
- **Integration reports** — issue form `integration-report.yml`: anyone who integrated a provider can report whether the specs matched the API, in sandbox or in production — one report per provider, one result per capability of the flow. An accepted report can make a spec `verified` (`community_report`). Plugin 1.6.0: skills surface where a spec was verified and its open questions, and offer `report_integration` (a pre-filled link the user submits) after an integration or when a spec is wrong.

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
