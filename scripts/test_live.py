#!/usr/bin/env python3
"""
Generic live API verification for Afro.tools ATSS specs.

Reads live_test_fixtures.json from the provider directory, authenticates
using schema.json auth config, calls the actual API, and checks each response
against the spec: HTTP status, the whole response_schema, success_condition.

Usage:
    export PROVIDER_CREDENTIALS="..."
    python3 scripts/test_live.py --provider flutterwave
    python3 scripts/test_live.py --provider flutterwave --capability create_customer
    python3 scripts/test_live.py --provider flutterwave --raw create_customer
    python3 scripts/test_live.py --provider flutterwave --report live-report.json
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
except ImportError:
    sys.exit("test_live.py checks responses with jsonschema: pip install jsonschema")

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

PLACEHOLDER = re.compile(r"\{([^{}]+)\}")

def _fill(template, values, where):
    """Replace every {name} of an ATSS 1.1 template in one pass; an unknown name stops the run."""
    for name in PLACEHOLDER.findall(template):
        if name not in values:
            print(f"{RED}Error: {where} uses {{{name}}}, which nothing provides{RESET}")
            sys.exit(1)
    return PLACEHOLDER.sub(lambda m: values[m[1]], template)


def auth_env_vars(auth):
    """Credentials the auth steps use. Others (e.g. a card encryption key) are the capability's business."""
    te = auth.get("token_exchange", {})
    templates = [auth.get("signing", {}).get("key", ""), auth.get("signing", {}).get("message", "")]
    templates += [x["value"] for x in te.get("headers", []) + te.get("body", []) + auth.get("apply", [])]
    used = {name for t in templates for name in PLACEHOLDER.findall(t)}
    return [c for c in auth.get("credentials", []) if c["env_var"] in used]


def _sign(spec, values, where):
    key = _fill(spec["key"], values, f"{where}.key").encode()
    digest = hmac.new(key, _fill(spec["message"], values, f"{where}.message").encode(), hashlib.sha256).digest()
    return digest.hex() if spec["encoding"] == "hex" else base64.b64encode(digest).decode()


def build_auth_steps(auth, base_url):
    """ATSS 1.1 auth: credentials from env, then signing, token_exchange and apply, in that order."""
    values = {}
    for cred in auth_env_vars(auth):
        val = os.environ.get(cred["env_var"], "")
        if not val:
            print(f"{RED}Error: env var {cred['env_var']} is not set ({cred['description']}){RESET}")
            sys.exit(1)
        values[cred["env_var"]] = val
    if "signing" in auth:
        values["signature"] = _sign(auth["signing"], values, "auth.signing")
    te = auth.get("token_exchange")
    if te:
        url = te.get("url") or base_url + te["path"]
        headers = {h["name"]: _fill(h["value"], values, "auth.token_exchange.headers") for h in te.get("headers", [])}
        data = None
        if "body" in te:
            headers["Content-Type"] = te["content_type"]
            data = urllib.parse.urlencode(
                {f["name"]: _fill(f["value"], values, "auth.token_exchange.body") for f in te["body"]}).encode()
        print(f"{BOLD}Fetching access token ({te['method']} {url})...{RESET}")
        req = urllib.request.Request(url, data=data, headers=headers, method=te["method"])
        with urllib.request.urlopen(req, context=_SSL_CTX) as r:
            node = json.loads(r.read())
        for key in te["token_field"].split("."):
            node = node.get(key) if isinstance(node, dict) else None
        if not isinstance(node, str):
            print(f"{RED}Error: no string at {te['token_field']} in the token response{RESET}")
            sys.exit(1)
        values["access_token"] = node
        print(f"  {GREEN}OK{RESET}")
    headers, body_pair = {}, None
    for a in auth.get("apply", []):
        val = _fill(a["value"], values, "auth.apply")
        if a["in"] == "header":
            headers[a["name"]] = val
        elif a["in"] == "body":
            body_pair = (a["name"], val)
        else:
            print(f"{RED}Error: auth.apply in \"{a['in']}\" is not supported by test_live yet{RESET}")
            sys.exit(1)
    return headers, body_pair


def build_auth(schema, fixture, base_url=""):
    """
    Return (auth_headers, body_auth_pair) from schema.auth + env vars.
    body_auth_pair is (field_name, value) when auth.location == "body", else None.
    """
    auth = schema.get("auth", {})
    if "apply" in auth:
        return build_auth_steps(auth, base_url)
    auth_type = auth.get("type", "none")
    env_var   = auth.get("env_var", "")
    location  = auth.get("location", "header")
    field     = auth.get("field", "Authorization")
    fmt       = auth.get("format", "{token}")

    if auth_type == "none":
        return {}, None
    if auth_type == "oauth2":
        print(f"{RED}Error: oauth2 needs auth.token_exchange and auth.apply (ATSS 1.1) to fetch a token{RESET}")
        sys.exit(1)

    env_val = os.environ.get(env_var, "")
    if not env_val:
        print(f"{RED}Error: env var {env_var} is not set{RESET}")
        sys.exit(1)

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
        "X-Trace-Id": f"afrotoolslive{int(time.time() * 1000)}",  # alphanumeric: Flutterwave rejects anything else
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
            raw = r.read()
        try:
            return r.status, json.loads(raw) if raw.strip() else None  # e.g. a 204 No Content
        except ValueError:
            return r.status, raw.decode(errors="replace")  # not JSON: response_schema says whether that's right
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
        resolved = resolve(val, stored, ts)
        url = url.replace(f"{{{key}}}", "" if resolved is None else str(resolved))
    if query_params:
        resolved = {k: resolve(v, stored, ts) for k, v in query_params.items()}
        qs = urllib.parse.urlencode({k: v for k, v in resolved.items() if v is not None})
        if qs:
            url = f"{url}?{qs}"
    return url


# ── Response checks ───────────────────────────────────────────────────────────

def schema_errors(body, response_schema):
    """Where the live body breaks response_schema: types, nested fields, the oneOf branch it should match.
    (console message, report message): the report names the rule only, never a response value."""
    if not response_schema:
        return []
    errors = sorted(Draft202012Validator(response_schema).iter_errors(body), key=lambda e: list(map(str, e.path)))
    out = []
    for e in errors:
        where = ".".join(map(str, e.absolute_path)) or "(body)"
        rule = "/".join(map(str, e.absolute_schema_path))  # schema side: a response key can be a value (a map's key)
        out.append((f"{where}: {e.message[:200]}", f"{rule}: {json.dumps(e.validator_value)[:100]}"))
    return out


MISSING = object()


def values_at(node, keys):
    """Values at a dotted path, through array items — how success_condition.field reads.
    MISSING where an item lacks the field; an empty array has no values."""
    if isinstance(node, list):
        return [v for item in node for v in values_at(item, keys)]
    if not keys:
        return [node]
    return values_at(node[keys[0]], keys[1:]) if isinstance(node, dict) and keys[0] in node else [MISSING]


def success_error(body, cond):
    """A 2xx can still be a failure the provider reports in the body (e.g. {"code": 1})."""
    if not cond:
        return None
    found = values_at(body, cond["field"].split("."))
    allowed = cond["in"] if "in" in cond else [cond["equals"]]
    if MISSING in found:
        return f"success_condition: {cond['field']} absent from the response"
    # isinstance bool too: in Python True == 1 and 0 == False, in JSON they differ
    bad = [v for v in found if not any(v == a and isinstance(v, bool) == isinstance(a, bool) for a in allowed)]
    if bad:
        return f"success_condition: {cond['field']} is not {json.dumps(allowed)}, got {json.dumps(bad[0])}"
    return None


def undocumented_keys(body, response_schema):
    """Keys of the response (its `data` node when the spec describes one) that the spec doesn't document.
    Informative: worth adding to response_schema, not a failure."""
    def obj(x):  # a boolean schema (`true`) says nothing to compare to
        return x if isinstance(x, dict) else {}
    node, actual = obj(response_schema), body
    data = obj(obj(node.get("properties")).get("data"))
    inner = obj(data.get("items")) if data.get("type") == "array" else data
    if isinstance(body, dict) and (inner.get("properties") or inner.get("oneOf")):
        node, actual = inner, body.get("data")
        if isinstance(actual, list):
            actual = actual[0] if actual else None
    documented = {k for branch in node.get("oneOf") or [node] for k in obj(obj(branch).get("properties"))}
    if not documented or not isinstance(actual, dict):  # nothing to compare to (e.g. a $ref): stay quiet
        return []
    return sorted(set(actual) - documented)


def unresolved_refs(step, stored, ts):
    """$refs to an earlier step that resolve to nothing: the chain failed, this step can't be tested.
    An unset $env: stays an empty string — some are optional (e.g. a sandbox sender ID)."""
    found = []

    def walk(v):
        if isinstance(v, dict):
            for x in v.values():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)
        elif isinstance(v, str) and v.startswith("$") and v != "$ts" \
                and not v.startswith("$env:") and _resolve_scalar(v, stored, ts) in (None, ""):
            found.append(v)

    for key in ("path_params", "query_params", "body", "headers"):
        walk(step.get(key))
    return found


# ── Report ────────────────────────────────────────────────────────────────────

def _js_number(x):
    """A float the way JavaScript's JSON.stringify writes it (1.0 → 1, 1e-07 → 1e-7, 1e-06 → 0.000001)."""
    if x == 0:
        return "0"
    sign, digits, exp = Decimal(repr(x)).normalize().as_tuple()
    d, n = "".join(map(str, digits)), len(digits) + exp
    out = (d + "0" * (n - len(d)) if len(d) <= n <= 21 else
           d[:n] + "." + d[n:] if 0 < n <= 21 else
           "0." + "0" * -n + d if -6 < n <= 0 else
           d[0] + ("." + d[1:] if len(d) > 1 else "") + "e" + ("+" if n > 0 else "-") + str(abs(n - 1)))
    return "-" + out if sign else out


def _js_stringify(v):
    if isinstance(v, dict):
        # JavaScript lists integer-like keys ("200", "404") first, ascending, then the others in order
        index = sorted((k for k in v if k.isdigit() and str(int(k)) == k and int(k) < 2**32 - 1), key=int)
        keys = index + [k for k in v if k not in index]
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + _js_stringify(v[k]) for k in keys) + "}"
    if isinstance(v, list):
        return "[" + ",".join(map(_js_stringify, v)) + "]"
    if isinstance(v, float) or (isinstance(v, int) and not isinstance(v, bool) and abs(v) > 2**53):
        return _js_number(float(v))  # JavaScript numbers are doubles
    return json.dumps(v, ensure_ascii=False)


def spec_hash(cap_dir, schema):
    """Same value as validate.js specHash: what verification.spec_hash records."""
    rest = {k: v for k, v in schema.items() if k != "verification"}
    digest = hashlib.sha256(_js_stringify(rest).encode())
    digest.update(b"\0")
    digest.update((cap_dir / "canonical_example.ts").read_bytes())
    return "sha256:" + digest.hexdigest()


def registry_sha():
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=SPECS_DIR, capture_output=True,
                              text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


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

def run(provider_slug, only_capability=None, raw_capability=None, report_path=None):
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

    sandbox_base_url = (provider_json.get("environments", {}).get("sandbox", {}).get("base_url")
                        or fixture.get("sandbox_base_url", ""))
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
    auth_headers, body_auth = build_auth(first_schema, fixture, sandbox_base_url)

    stored  = {"ts": ts}
    results = []
    total   = len(steps)

    for i, step in enumerate(steps, 1):
        cap_name = step["capability"]
        schema   = capabilities.get(cap_name)
        print(f"\n{BOLD}[{i}/{total}] {cap_name}{RESET}")
        result = {"capability": cap_name, "spec_hash": None, "http_status": None, "result": "fail", "errors": []}
        results.append(result)

        # The report can end up public (a CI artifact, a PR): it never carries a response value,
        # which GitHub's secret masking covers in logs but not in artifacts.
        def fail(message, for_report=None):
            print(f"  {RED}{message}{RESET}")
            result["errors"].append(for_report or message)

        if not schema:
            fail("SKIPPED — schema.json not found")
            continue
        result["spec_hash"] = spec_hash(provider_dir / cap_name, schema)

        # wait_seconds: give an async job time to become visible before this step reads it.
        if step.get("wait_seconds"):
            time.sleep(step["wait_seconds"])

        # A value from an earlier step that returned nothing would silently build
        # `/checkout-sessions//status/` or send null — that is a failed chain, not a test of this step.
        unresolved = unresolved_refs(step, stored, ts) + [
            k for k, v in (step.get("path_params") or {}).items() if resolve(v, stored, ts) in (None, "")]
        if unresolved:
            fail(f"SKIPPED — {', '.join(unresolved)} resolved to nothing")
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
        left = PLACEHOLDER.findall(url.split("?")[0])
        if left:
            fail(f"SKIPPED — endpoint.url {', '.join(f'{{{n}}}' for n in left)} not filled: add it to the step's path_params")
            continue

        body = resolve(step.get("body"), stored, ts) if step.get("body") is not None else None
        # skip_auth: the step sends its own credentials in `headers` (e.g. a token-exchange call)
        # or none at all — the schema-derived auth must not leak into it.
        step_auth = {} if step.get("skip_auth") else auth_headers
        if body_auth and not step.get("skip_auth"):
            body = body or {}
            body[body_auth[0]] = body_auth[1]

        extra_headers = resolve(step.get("headers", {}), stored, ts)
        content_type = step.get("content_type", "application/json")

        if raw_capability == cap_name:
            _, resp = http_call(method, url, step_auth, body, extra_headers, content_type)
            print(f"\n{BOLD}Raw response:{RESET}")
            print(json.dumps(resp, indent=2))
            return

        status_code, resp = http_call(method, url, step_auth, body, extra_headers, content_type)
        result["http_status"] = status_code
        # later steps read `$name.data...` even when the body is a top-level array or scalar
        store_as = step.get("store_as")
        if store_as:
            stored[store_as] = resp if isinstance(resp, dict) else {"data": resp}

        details = resp.get("details", "") if isinstance(resp, dict) else ""
        details = details if isinstance(details, str) else json.dumps(details)
        is_acceptable_error = any(details.startswith(code) for code in step.get("acceptable_error_codes", []))

        # The call itself must succeed: comparing keys alone passed a step that got a 401
        # whenever the response schema had no `required` field (most specs).
        expected_status = step.get("expected_status")
        status_ok = status_code in expected_status if expected_status else 200 <= status_code < 300

        if not status_ok:
            if is_acceptable_error:
                print(f"  {YELLOW}Expected sandbox error → {details}{RESET}")
                result["result"] = "expected_error"
            else:
                fail(f"HTTP {status_code} → {json.dumps(resp)[:300]}", f"HTTP {status_code}")
            continue

        # response_schema and success_condition describe a success: a negative test
        # (expected_status: [404]) only checks the status
        is_2xx = 200 <= status_code < 300
        response_schema = schema.get("response_schema", {}) if is_2xx else {}
        for message, for_report in schema_errors(resp, response_schema):
            fail(f"❌  {message}", for_report)
        condition = success_error(resp, schema.get("success_condition")) if is_2xx else None
        if condition:
            fail(f"❌  {condition}", condition.split(", got ")[0])
        for key in undocumented_keys(resp, response_schema):
            print(f"  {YELLOW}⚠️   {key}  ← in the response, absent from the spec (worth adding, not blocking){RESET}")
        if not result["errors"]:
            print(f"  {GREEN}✅  HTTP {status_code}, response matches response_schema{RESET}")
            result["result"] = "pass"

    if raw_capability:
        print(f"{YELLOW}Capability '{raw_capability}' not found in steps{RESET}")
        return

    passed = all(r["result"] != "fail" for r in results)
    if report_path:
        report = {
            "provider": provider_slug,
            "environment": "sandbox",
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "registry_sha": registry_sha(),
            "run_url": (f"{os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/"
                        f"{os.environ['GITHUB_RUN_ID']}" if os.environ.get("GITHUB_RUN_ID") else None),
            "passed": passed,
            "steps": results,
        }
        Path(report_path).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")

    print(f"\n{BOLD}{'━' * 60}{RESET}")
    print(f"{BOLD}SUMMARY — {len(results)} step(s) tested{RESET}")
    print(f"{'━' * 60}")
    for r in results:
        tag = {"pass": f"{GREEN}OK  {RESET}", "expected_error": f"{YELLOW}ERR {RESET}"}.get(r["result"], f"{RED}FAIL{RESET}")
        print(f"  {tag}  {r['capability']:<45}  {len(r['errors'])} error(s)")
    if report_path:
        print(f"\n  Report: {report_path} — the spec_hash of each OK step is what its verification block records "
              f"(an ERR step got an expected sandbox error: its response was not checked)")
    if not passed:
        print(f"\n  {RED}{BOLD}FAIL — fix the spec (or the fixture) from the errors above, "
              f"then: npm run validate{RESET}")
        sys.exit(1)
    print(f"\n  {GREEN}{BOLD}Every step succeeded and its response matches the spec ✓{RESET}")


def main():
    parser = argparse.ArgumentParser(
        description="Live API verification for Afro.tools ATSS specs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  npm run test:live -- --provider flutterwave\n"
            "  npm run test:live -- --provider flutterwave --capability create_customer\n"
            "  npm run test:live -- --provider flutterwave --raw create_customer\n"
            "  npm run test:live -- --provider flutterwave --report live-report.json\n"
        ),
    )
    parser.add_argument("--provider",    required=True, help="Provider slug (e.g. flutterwave)")
    parser.add_argument("--capability",  help="Run only this capability")
    parser.add_argument("--raw", metavar="CAPABILITY", help="Dump raw JSON for one capability")
    parser.add_argument("--report", metavar="FILE", help="Write a JSON report (spec_hash, HTTP status, errors per step)")
    args = parser.parse_args()
    run(args.provider, only_capability=args.capability, raw_capability=args.raw, report_path=args.report)


if __name__ == "__main__":
    main()
