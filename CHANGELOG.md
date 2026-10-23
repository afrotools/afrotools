# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- `payment/cartflox`: 22 specs from the Cartflox OpenAPI (2026-09-19) — checkout sessions and their payment methods, test-session settlement, payment links, routing, Mobile Money transfers, webhook deliveries and configuration, and the six signed webhooks. `route_payment` and `get_routing_options` are `draft`: the OpenAPI and the routing guide disagree on the response shape.
