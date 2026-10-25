#!/usr/bin/env python3
"""
Generic live API verification for Afro.tools ATSS specs.

Reads live_test_fixtures.json from the provider directory, authenticates
using schema.json auth config, calls the actual API, and diffs responses
against response_schema.

Usage:
    export PROVIDER_CREDENTIALS="..."
    python3 scripts/test_live.py --provider flutterwave
    python3 scripts/test_live.py --provider flutterwave --capability create_customer
    python3 scripts/test_live.py --provider flutterwave --raw create_customer
"""

import argparse
import base64
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# macOS Python.org builds don't bundle system certs. Prefer certifi's CA bundle
# when available; otherwise fall back to the OS trust store. Never disable
# verification — this script calls real payment APIs, some in production
# with no sandbox, and a silently-unverified TLS connection is a live MITM risk.
try:
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = ssl.create_default_context()

SPECS_DIR = Path(__file__).parent.parent / "specs"

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
DIM    = "\033[2m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


# ── Auth ──────────────────────────────────────────────────────────────────────

def _fetch_oauth2_token(token_url, credentials_b64, env_var_name):
    try:
        decoded = base64.b64decode(credentials_b64).decode()
        client_id, client_secret = decoded.split(":", 1)
    except Exception:
        print(f"{RED}Error: {env_var_name} must be base64(client_id:client_secret){RESET}")
        sys.exit(1)
    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }).encode()
    req = urllib.request.Request(
        token_url, data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, context=_SSL_CTX) as r:
        return json.loads(r.read())["access_token"]


def build_auth(schema, fixture):
    """
    Return (auth_headers, body_auth_pair) from schema.auth + env vars.
    body_auth_pair is (field_name, value) when auth.location == "body", else None.
    """
    auth = schema.get("auth", {})
    auth_type = auth.get("type", "none")
    env_var   = auth.get("env_var", "")
    location  = auth.get("location", "header")
    field     = auth.get("field", "Authorization")
    fmt       = auth.get("format", "{token}")

    if auth_type == "none":
        return {}, None

    env_val = os.environ.get(env_var, "")
    if not env_val:
        print(f"{RED}Error: env var {env_var} is not set{RESET}")
        sys.exit(1)

    if auth_type == "oauth2":
        token_url = fixture.get("oauth2_token_url")
        if not token_url:
            print(f"{RED}Error: oauth2_token_url missing from live_test_fixtures.json{RESET}")
            sys.exit(1)
        print(f"{BOLD}Fetching OAuth2 token...{RESET}")
        token = _fetch_oauth2_token(token_url, env_val, env_var)
        print(f"  {GREEN}OK{RESET} — {token[:40]}...")
        header_val = fmt.replace("{access_token}", token).replace("{token}", token)
        return {field: header_val}, None

    if auth_type in ("api_key", "bearer"):
        if location == "header":
            header_val = fmt.replace("{token}", env_val).replace("{access_token}", env_val)
            return {field: header_val}, None
        if location == "body":
            return {}, (field, env_val)

    if auth_type == "basic":
        secondary_env = fixture.get("auth_secondary_env", "")
        if secondary_env:
            secondary_val = os.environ.get(secondary_env, "")
            if not secondary_val:
                print(f"{RED}Error: env var {secondary_env} (auth_secondary_env) is not set{RESET}")
                sys.exit(1)
            credentials = base64.b64encode(f"{env_val}:{secondary_val}".encode()).decode()
        else:
            credentials = env_val  # env_var stores base64 directly
        return {field: f"Basic {credentials}"}, None

    return {}, None


# ── HTTP ──────────────────────────────────────────────────────────────────────

def _multipart(body):
    """Encode a flat dict as multipart/form-data. Nested dicts/lists travel as JSON strings."""
    boundary = f"afrotools-{int(time.time() * 1000)}"
    parts = []
    for k, v in body.items():
        if v is None:
            continue
        if isinstance(v, bool):
            v = "true" if v else "false"
        elif isinstance(v, (dict, list)):
            v = json.dumps(v)
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n')
    parts.append(f"--{boundary}--\r\n")
    return "".join(parts).encode(), f"multipart/form-data; boundary={boundary}"


def http_call(method, url, auth_headers, body=None, extra_headers=None, content_type="application/json"):
    headers = {
        "Accept": "application/json",
        "X-Trace-Id": f"afrotools-live-{int(time.time() * 1000)}",
        # urllib's default "Python-urllib/x.y" is banned by some Cloudflare-fronted sandboxes (error 1010).
        "User-Agent": "afrotools-live-test/1.0 (+https://afro.tools)",
    }
    headers.update(auth_headers)
    if extra_headers:
        # Case-insensitive merge so per-step headers override the global auth key
        # even when the two keys differ only in capitalisation (e.g. X-Api-Key vs X-API-Key).
        for k, v in extra_headers.items():
            for existing_k in list(headers.keys()):
                if existing_k.lower() == k.lower():
                    del headers[existing_k]
            headers[k] = v
    data = None
    if body is not None:
        if content_type == "application/x-www-form-urlencoded":
            data = urllib.parse.urlencode({k: v for k, v in body.items() if v is not None}).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        elif content_type == "multipart/form-data":
            data, headers["Content-Type"] = _multipart(body)
        else:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX) as r:
            return r.status, json.loads(r.read())
    # HTTPError is a subclass of URLError and must be caught first — urllib
    # wraps every connection-level failure (including a TLS cert failure,
    # itself an OSError subclass) into URLError before it reaches this code,
    # so a bare `except ssl.SSLCertVerificationError` here never fires.
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"status": "failed", "error": {"message": raw.decode()}}
    except urllib.error.URLError as e:
        if isinstance(e.reason, ssl.SSLCertVerificationError):
            print(f"{RED}TLS certificate verification failed for {url}.{RESET}")
            print("This script verifies certificates and will not proceed on an untrusted chain.")
            print(f"Fix: {BOLD}pip install certifi{RESET} (or, on macOS python.org builds,")
            print("run the bundled 'Install Certificates.command').")
        else:
            print(f"{RED}Connection failed for {url}: {e.reason}{RESET}")
        sys.exit(1)


# ── Variable resolution ───────────────────────────────────────────────────────

def _resolve_scalar(val, stored, ts):
    if not isinstance(val, str):
        return val
    if val == "$ts":
        return ts
    if val.startswith("$env:"):
        return os.environ.get(val[5:], "")
    if val.startswith("$"):
        path = val[1:].split(".")
        node = stored.get(path[0])
        for key in path[1:]:
            node = node.get(key) if isinstance(node, dict) else None
        return node
    # Inline $ts substitution inside strings like "ref-$ts"
    return val.replace("$ts", str(ts))


def resolve(obj, stored, ts):
    if isinstance(obj, dict):
        return {k: resolve(v, stored, ts) for k, v in obj.items()}
    if isinstance(obj, list):
        return [resolve(v, stored, ts) for v in obj]
    return _resolve_scalar(obj, stored, ts)


# ── URL helpers ───────────────────────────────────────────────────────────────

def _replace_host(url, sandbox_base_url):
    if not sandbox_base_url:
        return url
    p = urllib.parse.urlparse(url)
    s = urllib.parse.urlparse(sandbox_base_url)
    return urllib.parse.urlunparse(p._replace(scheme=s.scheme, netloc=s.netloc))


def build_url(endpoint_url, sandbox_base_url, path_params, query_params, stored, ts):
    url = _replace_host(endpoint_url, sandbox_base_url)
    for key, val in (path_params or {}).items():
        url = url.replace(f"{{{key}}}", str(resolve(val, stored, ts) or ""))
    if query_params:
        resolved = {k: resolve(v, stored, ts) for k, v in query_params.items()}
        qs = urllib.parse.urlencode({k: v for k, v in resolved.items() if v is not None})
        if qs:
            url = f"{url}?{qs}"
    return url


# ── Schema helpers ────────────────────────────────────────────────────────────

def get_response_props(schema):
    """Return (properties_dict, required_set) for the data node in response_schema."""
    rs = schema.get("response_schema", {})
    if "oneOf" in rs:
        merged_props = {}
        merged_req = set()
        for variant in rs["oneOf"]:
            merged_props.update(variant.get("properties", {}))
            merged_req.update(variant.get("required", []))
        return merged_props, merged_req
    data_schema = rs.get("properties", {}).get("data", {})
    if data_schema:
        if data_schema.get("type") == "array":
            items = data_schema.get("items", {})
            return items.get("properties", {}), set(items.get("required", []))
        props = data_schema.get("properties", {})
        if props:
            return props, set(data_schema.get("required", []))
    return rs.get("properties", {}), set(rs.get("required", []))


def get_data_node(resp, schema):
    """Extract the object to compare from a live response."""
    rs = schema.get("response_schema", {})
    if "oneOf" in rs:
        return resp
    data_schema = rs.get("properties", {}).get("data", {})
    if not data_schema:
        return resp
    raw = resp.get("data")
    if data_schema.get("type") == "array":
        return raw[0] if isinstance(raw, list) and raw else None
    return raw


# ── Comparison ────────────────────────────────────────────────────────────────

def compare(actual, spec_props, required_keys=None, exclude_keys=None):
    """
    Print per-key diff. Returns (required_missing, optional_missing, extra).
    exclude_keys: set of spec keys to skip (e.g. inactive discriminated-union siblings).
    """
    if actual is None:
        print(f"  {RED}No data returned — cannot compare{RESET}")
        n = len(required_keys) if required_keys else len(spec_props)
        return n, 0, 0

    if required_keys is None:
        required_keys = set()
    if exclude_keys is None:
        exclude_keys = set()

    spec_keys   = set(spec_props.keys()) - exclude_keys
    actual_keys = set(actual.keys()) if isinstance(actual, dict) else set()
    ok          = actual_keys & spec_keys
    missing     = spec_keys - actual_keys
    extra       = actual_keys - spec_keys - exclude_keys
    req_missing = missing & (required_keys - exclude_keys)
    opt_missing = missing - required_keys

    for k in sorted(ok):
        print(f"  {GREEN}✅  {k}{RESET}")
    for k in sorted(req_missing):
        print(f"  {RED}❌  {k}  ← required in spec, absent from response{RESET}")
    for k in sorted(opt_missing):
        print(f"  {DIM}〰   {k}  ← optional in spec, absent (conditional){RESET}")
    for k in sorted(extra):
        print(f"  {YELLOW}⚠️   {k}  ← in response, absent from spec{RESET}")

    return len(req_missing), len(opt_missing), len(extra)


# ── Discovery ─────────────────────────────────────────────────────────────────

def discover_provider(slug):
    # Categories are whatever subfolders specs/ has — no hardcoded list to keep in sync.
    matches = sorted(
        d for d in (c / slug for c in SPECS_DIR.iterdir() if c.is_dir())
        if d.is_dir() and (d / "provider.json").exists()
    )
    if len(matches) > 1:
        found = ", ".join(str(d.relative_to(SPECS_DIR.parent)) for d in matches)
        print(f"{RED}Provider slug '{slug}' exists in several categories: {found}. "
              f"Slugs must be unique across specs/ — remove or rename one.{RESET}", file=sys.stderr)
        sys.exit(1)
    if matches:
        with open(matches[0] / "provider.json") as f:
            return matches[0], json.load(f)
    print(f"{RED}Provider '{slug}' not found under specs/ (no provider.json){RESET}", file=sys.stderr)
    sys.exit(1)


def load_capabilities(provider_dir):
    caps = {}
    for sub in sorted(provider_dir.iterdir()):
        schema_path = sub / "schema.json"
        if sub.is_dir() and schema_path.exists():
            with open(schema_path) as f:
                caps[sub.name] = json.load(f)
    return caps


# ── Runner ────────────────────────────────────────────────────────────────────

def run(provider_slug, only_capability=None, raw_capability=None):
    provider_dir, provider_json = discover_provider(provider_slug)

    # Hard guard: this script only ever runs against a sandbox. A provider
    # with no sandbox (or an unknown sandbox value) hits production —
    # real transactions, real fraud-detection risk, no automated safety net.
    # There is no override flag. Providers without a sandbox are verified
    # through a working integration in afrotools/examples instead.
    if provider_json.get("sandbox") is not True:
        print(f"{RED}Refusing to run: {provider_json.get('name', provider_slug)} has no sandbox "
              f"(provider.json sandbox={provider_json.get('sandbox')!r}).{RESET}")
        print("This script never targets production. Verify this provider via a working")
        print("integration in afrotools/examples instead.")
        sys.exit(1)

    fixture_path = provider_dir / "live_test_fixtures.json"
    if not fixture_path.exists():
        print(f"{RED}Error: {fixture_path} not found{RESET}")
        print("Create it following the format in CONTRIBUTING.md § 7.")
        sys.exit(1)
    with open(fixture_path) as f:
        fixture = json.load(f)

    sandbox_base_url = fixture.get("sandbox_base_url", "")
    steps = fixture.get("steps", [])
    if not steps:
        print(f"{YELLOW}No steps in live_test_fixtures.json{RESET}")
        sys.exit(0)

    if only_capability:
        steps = [s for s in steps if s.get("capability") == only_capability]
        if not steps:
            print(f"{RED}No step for capability '{only_capability}' in fixture{RESET}")
            sys.exit(1)

    capabilities = load_capabilities(provider_dir)
    ts = int(time.time())

    # Build auth once from the first step's schema (all caps share the same auth).
    first_schema = capabilities.get(steps[0]["capability"])
    if not first_schema:
        print(f"{RED}Capability '{steps[0]['capability']}' has no schema.json{RESET}")
        sys.exit(1)
    auth_headers, body_auth = build_auth(first_schema, fixture)

    stored  = {"ts": ts}
    results = []
    total   = len(steps)

    for i, step in enumerate(steps, 1):
        cap_name = step["capability"]
        schema   = capabilities.get(cap_name)
        print(f"\n{BOLD}[{i}/{total}] {cap_name}{RESET}")

        if not schema:
            print(f"  {RED}SKIPPED — schema.json not found{RESET}")
            results.append((cap_name, 0, 0, 0, "schema.json not found"))
            continue

        # wait_seconds: give an async job time to become visible before this step reads it.
        if step.get("wait_seconds"):
            time.sleep(step["wait_seconds"])

        # A path param from an earlier step that returned nothing would silently build
        # `/checkout-sessions//status/` — that is a failed chain, not a test of this step.
        unresolved = [k for k, v in (step.get("path_params") or {}).items()
                      if resolve(v, stored, ts) in (None, "")]
        if unresolved:
            print(f"  {RED}SKIPPED — path param(s) {', '.join(unresolved)} resolved to nothing{RESET}")
            results.append((cap_name, 0, 0, 0, f"path param(s) {', '.join(unresolved)} unresolved"))
            continue

        endpoint = schema.get("endpoint", {})
        method   = step.get("method", endpoint.get("method", "GET"))
        url      = build_url(
            endpoint.get("url", ""),
            sandbox_base_url,
            step.get("path_params"),
            step.get("query_params"),
            stored, ts,
        )

        body = resolve(step.get("body"), stored, ts) if step.get("body") is not None else None
        # skip_auth: the step sends its own credentials in `headers` (e.g. a token-exchange call)
        # or none at all — the schema-derived auth must not leak into it.
        step_auth = {} if step.get("skip_auth") else auth_headers
        if body_auth and not step.get("skip_auth"):
            body = body or {}
            body[body_auth[0]] = body_auth[1]

        extra_headers = resolve(step.get("headers", {}), stored, ts)
        missing = [k for k, v in extra_headers.items() if v is None]
        if missing:
            print(f"  {RED}SKIPPED — header(s) {', '.join(missing)} come from an earlier step that returned nothing{RESET}")
            results.append((cap_name, 0, 0, 0, f"header(s) {', '.join(missing)} unresolved"))
            continue
        content_type = step.get("content_type", "application/json")

        if raw_capability == cap_name:
            _, resp = http_call(method, url, step_auth, body, extra_headers, content_type)
            print(f"\n{BOLD}Raw response:{RESET}")
            print(json.dumps(resp, indent=2))
            return

        status_code, resp = http_call(method, url, step_auth, body, extra_headers, content_type)
        if not isinstance(resp, dict):  # a top-level JSON array or scalar
            resp = {"data": resp}

        store_as = step.get("store_as")
        if store_as:
            stored[store_as] = resp

        props, req_keys = get_response_props(schema)

        # Discriminated union: exclude inactive sibling keys from comparison.
        exclude_keys = set()
        du = step.get("discriminated_union")
        if du and isinstance(resp.get("data"), dict):
            active_type  = resp["data"].get(du["type_field"])
            sibling_keys = set(du.get("sibling_keys", []))
            if active_type:
                exclude_keys = sibling_keys - {active_type}
                print(f"  [type={active_type} — excluding {len(exclude_keys)} inactive sibling(s)]")

        actual = get_data_node(resp, schema)

        acceptable_error_codes = step.get("acceptable_error_codes", [])
        details = resp.get("details", "")
        details = details if isinstance(details, str) else json.dumps(details)
        is_acceptable_error = any(details.startswith(code) for code in acceptable_error_codes)

        # The call itself must succeed: comparing keys alone passed a step that got a 401
        # whenever the response schema had no `required` field (most specs).
        expected_status = step.get("expected_status")
        status_ok = status_code in expected_status if expected_status else 200 <= status_code < 300

        error = None
        if status_ok:
            rm, om, e = compare(actual, props, req_keys, exclude_keys)
        elif is_acceptable_error:
            print(f"  {YELLOW}Expected sandbox error → {details}{RESET}")
            rm, om, e = 0, 0, 0
        else:
            print(f"  {RED}API error (HTTP {status_code}) → {json.dumps(resp)}{RESET}")
            rm, om, e = len(req_keys - exclude_keys), 0, 0
            error = f"HTTP {status_code}"

        results.append((cap_name, rm, om, e, error))

    if raw_capability:
        print(f"{YELLOW}Capability '{raw_capability}' not found in steps{RESET}")
        return

    # Summary
    total_req_m = sum(r for _, r, _, _, _ in results)
    total_extra  = sum(e for _, _, _, e, _ in results)
    failed       = [(cap, err) for cap, _, _, _, err in results if err]

    print(f"\n{BOLD}{'━' * 60}{RESET}")
    print(f"{BOLD}SUMMARY — {len(results)} step(s) tested{RESET}")
    print(f"{'━' * 60}")
    for cap, rm, om, e, err in results:
        if err:
            print(f"  {RED}FAIL{RESET}  {cap:<45}  {err}")
            continue
        tag = f"{GREEN}OK  {RESET}" if (rm == 0 and e == 0) else f"{RED}DIFF{RESET}"
        print(f"  {tag}  {cap:<45}  req_missing={rm}  optional_absent={om}  extra={e}")
    print()
    if failed:
        print(f"  {RED}{BOLD}FAIL — {len(failed)} step(s) without a successful response: "
              f"{', '.join(cap for cap, _ in failed)}.{RESET}")
        sys.exit(1)
    print(f"  Required keys absent from response (spec error or sandbox gap): {total_req_m}")
    print(f"  Extra keys in response not in spec (spec under-specified):       {total_extra}")
    if total_req_m == 0:
        print(f"\n  {GREEN}{BOLD}All required fields present — live responses match the spec ✓{RESET}")
        if total_extra:
            print(f"  {YELLOW}({total_extra} extra key(s) in the response are undocumented in "
                  f"schema.json — worth adding, not blocking){RESET}")
    else:
        print(f"\n  {RED}{BOLD}FAIL — {total_req_m} required field(s) missing from live responses.{RESET}")
        print(f"  {YELLOW}Review diffs above, update schema.json, then: npm run validate{RESET}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Live API verification for Afro.tools ATSS specs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  npm run test:live -- --provider flutterwave\n"
            "  npm run test:live -- --provider flutterwave --capability create_customer\n"
            "  npm run test:live -- --provider flutterwave --raw create_customer\n"
        ),
    )
    parser.add_argument("--provider",    required=True, help="Provider slug (e.g. flutterwave)")
    parser.add_argument("--capability",  help="Run only this capability")
    parser.add_argument("--raw", metavar="CAPABILITY", help="Dump raw JSON for one capability")
    args = parser.parse_args()
    run(args.provider, only_capability=args.capability, raw_capability=args.raw)


if __name__ == "__main__":
    main()
