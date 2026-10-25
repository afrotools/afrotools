"""Offline tests for test_live.py: http_call is replaced, no network, fake credentials.

    python3 -m unittest discover -s scripts -p "test_live_test.py"
"""
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
import test_live  # noqa: E402


def make_provider(root):
    """A sandbox provider whose response schemas have no `required` field (most specs)."""
    provider = Path(root) / "payment" / "fixturepay"
    for cap, method, url in [
        ("create_payment", "POST", "https://api.fixturepay.example/payments"),
        ("get_payment", "GET", "https://api.fixturepay.example/payments/{id}"),
    ]:
        (provider / cap).mkdir(parents=True)
        (provider / cap / "schema.json").write_text(json.dumps({
            "auth": {"type": "api_key", "location": "header", "field": "Authorization",
                     "format": "Bearer {token}", "env_var": "FIXTUREPAY_KEY"},
            "endpoint": {"method": method, "url": url},
            "response_schema": {"type": "object", "properties": {"id": {"type": "string"}}},
        }))
    (provider / "provider.json").write_text(json.dumps({"name": "FixturePay", "sandbox": True}))
    (provider / "live_test_fixtures.json").write_text(json.dumps({"steps": [
        {"capability": "create_payment", "body": {"amount": 100}, "store_as": "payment"},
        {"capability": "get_payment", "path_params": {"id": "$payment.id"}},
    ]}))


class TestLive(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        make_provider(self.tmp.name)
        patches = [
            mock.patch.object(test_live, "SPECS_DIR", Path(self.tmp.name)),
            mock.patch.dict(os.environ, {"FIXTUREPAY_KEY": "fake"}),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(self.tmp.cleanup)

    def run_with(self, responses):
        calls = iter(responses)
        with mock.patch.object(test_live, "http_call", side_effect=lambda *a, **k: next(calls)), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            try:
                test_live.run("fixturepay")
            except SystemExit as e:
                return e.code
        return 0

    def test_every_call_unauthorized_fails(self):
        # Used to print "live responses match the spec ✓" and exit 0.
        self.assertEqual(self.run_with([(401, {"detail": "Invalid token."})] * 2), 1)

    def test_path_param_from_a_failed_step_fails_instead_of_calling_an_empty_path(self):
        self.assertEqual(self.run_with([(200, {"error": "no id here"})]), 1)

    def test_successful_calls_pass(self):
        self.assertEqual(self.run_with([(201, {"id": "pay_1"}), (200, {"id": "pay_1"})]), 0)

    def test_top_level_array_response_does_not_crash(self):
        self.assertEqual(self.run_with([(201, {"id": "pay_1"}), (200, [{"id": "pay_1"}])]), 0)

    def test_expected_status_overrides_the_2xx_default(self):
        fixtures = Path(self.tmp.name) / "payment" / "fixturepay" / "live_test_fixtures.json"
        doc = json.loads(fixtures.read_text())
        doc["steps"][0]["expected_status"] = [202]
        fixtures.write_text(json.dumps(doc))
        self.assertEqual(self.run_with([(200, {"id": "pay_1"}), (200, {"id": "pay_1"})]), 1)


class TestAuthSteps(unittest.TestCase):
    AUTH = {
        "credentials": [{"env_var": "FX_ID", "description": "id"}, {"env_var": "FX_SECRET", "description": "secret"}],
        "signing": {"algorithm": "HMAC-SHA256", "key": "{FX_SECRET}", "message": "{FX_ID}", "encoding": "hex"},
        "token_exchange": {
            "method": "POST", "url": "https://idp.fixture.example/token",
            "content_type": "application/x-www-form-urlencoded",
            "body": [{"name": "client_id", "value": "{FX_ID}"}, {"name": "grant_type", "value": "client_credentials"}],
            "headers": [{"in": "header", "name": "X-API-KEY", "value": "{FX_ID}:{signature}"}],
            "token_field": "data.accessToken",
        },
        "apply": [{"in": "header", "name": "Authorization", "value": "Bearer {access_token}"},
                  {"in": "header", "name": "X-API-KEY", "value": "{FX_ID}:{signature}"}],
    }

    def test_signs_exchanges_and_applies(self):
        seen = {}

        def fake_urlopen(req, context=None):
            seen["url"], seen["data"], seen["headers"] = req.full_url, req.data, dict(req.header_items())
            return contextlib.nullcontext(io.BytesIO(json.dumps({"data": {"accessToken": "tok"}}).encode()))

        signature = test_live.hmac.new(b"s3cret", b"id1", test_live.hashlib.sha256).hexdigest()
        with mock.patch.dict(os.environ, {"FX_ID": "id1", "FX_SECRET": "s3cret"}), \
                mock.patch.object(test_live.urllib.request, "urlopen", fake_urlopen), \
                contextlib.redirect_stdout(io.StringIO()):
            headers, body = test_live.build_auth({"auth": self.AUTH}, {})
        self.assertEqual(seen["url"], "https://idp.fixture.example/token")
        self.assertEqual(seen["data"], b"client_id=id1&grant_type=client_credentials")
        self.assertEqual(seen["headers"]["X-api-key"], f"id1:{signature}")
        self.assertEqual(headers, {"Authorization": "Bearer tok", "X-API-KEY": f"id1:{signature}"})
        self.assertIsNone(body)

    def test_credential_no_auth_step_uses_is_not_required(self):
        auth = dict(self.AUTH, credentials=self.AUTH["credentials"] + [{"env_var": "FX_CARD_KEY", "description": "card key"}])
        self.assertEqual([c["env_var"] for c in test_live.auth_env_vars(auth)], ["FX_ID", "FX_SECRET"])

    def test_oauth2_without_auth_steps_stops_instead_of_sending_no_auth(self):
        with mock.patch.dict(os.environ, {"FX_KEY": "k"}), contextlib.redirect_stdout(io.StringIO()), \
                self.assertRaises(SystemExit):
            test_live.build_auth({"auth": {"type": "oauth2", "env_var": "FX_KEY"}}, {})

    def test_missing_credential_stops_the_run(self):
        with mock.patch.dict(os.environ, {"FX_ID": "id1"}, clear=True), \
                contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            test_live.build_auth({"auth": self.AUTH}, {})


if __name__ == "__main__":
    unittest.main()
