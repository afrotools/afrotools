#!/usr/bin/env python3
"""
Resolve which env var name(s) `scripts/test_live.py` needs for --provider,
by reading the same files it reads (live_test_fixtures.json + the first
step's schema.json) — without running the live calls.

Why this exists: the live-test GitHub Actions workflow stores one real
credential per provider under a GitHub Environment (named after the
provider slug), always in a secret called LIVE_TEST_CREDENTIAL (and
LIVE_TEST_CREDENTIAL_SECONDARY for `basic` auth). That keeps the workflow
YAML provider-agnostic — adding a new sandbox provider is a repo-settings
action (new Environment + secret), never a YAML edit. But test_live.py
itself reads a provider-specific env var name (e.g. QOSIC_USERNAME, taken
from schema.json). This script bridges the two: it tells the workflow
which real env var name to export the generic secret under.

Usage:
    python3 scripts/ci_resolve_live_test_env.py --provider qosic

Prints one env var name per line to stdout:
    line 1 — primary (always present if the provider is testable)
    line 2 — secondary (only when auth.type == "basic" and the fixture
             declares auth_secondary_env)

Exits non-zero with a message on stderr if the provider/fixture/schema
can't be found — same failure shape as test_live.py itself.
"""

import argparse
import json
import sys
from pathlib import Path

SPECS_DIR = Path(__file__).parent.parent / "specs"


def discover_provider_dir(slug):
    for category in ("payment", "sms"):
        d = SPECS_DIR / category / slug
        if d.is_dir() and (d / "provider.json").exists():
            return d
    print(f"Provider '{slug}' not found under specs/ (no provider.json)", file=sys.stderr)
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--provider", required=True, help="Provider slug (e.g. qosic)")
    args = parser.parse_args()

    provider_dir = discover_provider_dir(args.provider)

    fixture_path = provider_dir / "live_test_fixtures.json"
    if not fixture_path.exists():
        print(f"{fixture_path} not found", file=sys.stderr)
        sys.exit(1)
    fixture = json.loads(fixture_path.read_text())

    steps = fixture.get("steps", [])
    if not steps:
        print(f"No steps in {fixture_path}", file=sys.stderr)
        sys.exit(1)

    first_capability = steps[0]["capability"]
    schema_path = provider_dir / first_capability / "schema.json"
    if not schema_path.exists():
        print(f"{schema_path} not found (capability '{first_capability}' from fixture step 1)", file=sys.stderr)
        sys.exit(1)
    schema = json.loads(schema_path.read_text())

    auth = schema.get("auth", {})
    env_var = auth.get("env_var")
    if not env_var:
        print(f"No auth.env_var in {schema_path}", file=sys.stderr)
        sys.exit(1)

    print(env_var)

    if auth.get("type") == "basic":
        secondary = fixture.get("auth_secondary_env")
        if secondary:
            print(secondary)


if __name__ == "__main__":
    main()
