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
        (provider / cap / "canonical_example.ts").write_text("export {}\n")
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
        # An array where response_schema says object is a mismatch to report, not a crash.
        self.assertEqual(self.run_with([(201, {"id": "pay_1"}), (200, [{"id": "pay_1"}])]), 1)

    def edit(self, name, change):
        path = Path(self.tmp.name) / "payment" / "fixturepay" / name
        doc = json.loads(path.read_text())
        change(doc)
        path.write_text(json.dumps(doc))

    def test_a_field_of_the_wrong_type_fails(self):
        self.assertEqual(self.run_with([(201, {"id": 42}), (200, {"id": "42"})]), 1)

    def test_a_nested_required_field_missing_fails(self):
        # The old check compared top-level keys only.
        self.edit("get_payment/schema.json", lambda s: s["response_schema"]["properties"].update(
            {"data": {"type": "object", "required": ["status"], "properties": {"status": {"type": "string"}}}}))
        self.assertEqual(self.run_with([(201, {"id": "pay_1"}), (200, {"id": "pay_1", "data": {}})]), 1)

    def test_success_condition_turns_a_200_with_an_error_code_into_a_failure(self):
        def add(s):
            s["response_schema"]["properties"]["code"] = {"type": "integer"}
            s["success_condition"] = {"field": "code", "equals": 0}
        self.edit("create_payment/schema.json", add)
        self.assertEqual(self.run_with([(200, {"id": "pay_1", "code": 1}), (200, {"id": "pay_1"})]), 1)
        self.assertEqual(self.run_with([(200, {"id": "pay_1", "code": 0}), (200, {"id": "pay_1"})]), 0)
        # false is not 0
        self.assertEqual(self.run_with([(200, {"id": "pay_1", "code": False}), (200, {"id": "pay_1"})]), 1)

    def test_success_condition_reads_through_array_items(self):
        self.assertEqual(test_live.success_error({"data": [{"s": "OK"}, {"s": "KO"}]}, {"field": "data.s", "in": ["OK"]}),
                         'success_condition: data.s is not ["OK"], got "KO"')
        self.assertIsNone(test_live.success_error({"data": [{"s": "OK"}]}, {"field": "data.s", "equals": "OK"}))
        self.assertIn("absent", test_live.success_error({}, {"field": "data.s", "equals": "OK"}))
        self.assertIn("absent", test_live.success_error({"data": [{"s": "OK"}, {}]}, {"field": "data.s", "equals": "OK"}))
        self.assertIsNone(test_live.success_error({"data": []}, {"field": "data.s", "equals": "OK"}))
        self.assertIsNone(test_live.success_error({"code": 0.0}, {"field": "code", "equals": 0}))

    def test_a_body_value_from_a_failed_step_fails_instead_of_sending_null(self):
        self.edit("live_test_fixtures.json", lambda f: f["steps"][1].update(
            {"path_params": {"id": "pay_1"}, "query_params": {"ref": "$payment.reference"}}))
        self.assertEqual(self.run_with([(201, {"id": "pay_1"}), (200, {"id": "pay_1"})]), 1)

    def test_an_empty_path_param_fails_whatever_its_source(self):
        # `/payments/` can be a list endpoint answering a 200 that matches: a false proof.
        self.edit("live_test_fixtures.json", lambda f: f["steps"][1].update({"path_params": {"id": "$env:UNSET_ID"}}))
        self.assertEqual(self.run_with([(201, {"id": "pay_1"}), (200, {"id": "pay_1"})]), 1)

    def test_a_url_placeholder_no_path_param_fills_fails_before_calling(self):
        self.edit("live_test_fixtures.json", lambda f: f["steps"][1].pop("path_params"))
        self.assertEqual(self.run_with([(201, {"id": "pay_1"})]), 1)

    def test_report_records_each_step_with_its_spec_hash(self):
        report = Path(self.tmp.name) / "report.json"
        calls = iter([(201, {"id": "pay_1"}), (401, {"detail": "Invalid token."})])
        with mock.patch.object(test_live, "http_call", side_effect=lambda *a, **k: next(calls)), \
                contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            test_live.run("fixturepay", report_path=report)
        doc = json.loads(report.read_text())
        self.assertFalse(doc["passed"])
        self.assertEqual(doc["environment"], "sandbox")
        self.assertEqual([(s["capability"], s["result"], s["http_status"]) for s in doc["steps"]],
                         [("create_payment", "pass", 201), ("get_payment", "fail", 401)])
        self.assertRegex(doc["steps"][0]["spec_hash"], r"^sha256:[0-9a-f]{64}$")

    def test_report_never_carries_a_response_value(self):
        report = Path(self.tmp.name) / "report.json"
        calls = iter([(201, {"id": 42, "token": "sk_live_leak"}), (401, {"echo": "sk_live_leak"})])
        with mock.patch.object(test_live, "http_call", side_effect=lambda *a, **k: next(calls)), \
                contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            test_live.run("fixturepay", report_path=report)
        text = report.read_text()
        self.assertNotIn("sk_live_leak", text)
        self.assertEqual(json.loads(text)["steps"][0]["errors"], ['properties/id/type: "string"'])

    def test_report_leaves_out_filled_values_and_response_keys(self):
        self.edit("live_test_fixtures.json", lambda f: f["steps"][1].update(
            {"path_params": {}, "query_params": {"ref": "$payment.secret"}}))
        self.edit("create_payment/schema.json", lambda s: s["response_schema"]["properties"].update(
            {"balances": {"type": "object", "additionalProperties": {"type": "integer"}}}))
        report = Path(self.tmp.name) / "report.json"
        calls = iter([(201, {"id": "pay_1", "secret": "sk_leak", "balances": {"+224620000000": "x"}})])
        with mock.patch.object(test_live, "http_call", side_effect=lambda *a, **k: next(calls)), \
                contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            test_live.run("fixturepay", report_path=report)
        text = report.read_text()
        self.assertNotIn("sk_leak", text)
        self.assertNotIn("224620000000", text)

    def test_a_negative_test_checks_the_status_not_the_success_schema(self):
        self.edit("live_test_fixtures.json", lambda f: f["steps"][1].update({"expected_status": [404]}))
        self.assertEqual(self.run_with([(201, {"id": "pay_1"}), (404, {"error": "not found"})]), 0)


    def test_expected_status_overrides_the_2xx_default(self):
        fixtures = Path(self.tmp.name) / "payment" / "fixturepay" / "live_test_fixtures.json"
        doc = json.loads(fixtures.read_text())
        doc["steps"][0]["expected_status"] = [202]
        fixtures.write_text(json.dumps(doc))
        self.assertEqual(self.run_with([(200, {"id": "pay_1"}), (200, {"id": "pay_1"})]), 1)


class TestSpecHash(unittest.TestCase):
    def test_floats_are_written_as_json_stringify_writes_them(self):
        # validate.js hashes JSON.stringify(schema): a Python repr would change the hash.
        cases = {1.0: "1", 1e-07: "1e-7", 1e-06: "0.000001", 1e21: "1e+21", 1e20: "100000000000000000000",
                 123.45: "123.45", -2.5: "-2.5", 0.0: "0", 3e6: "3000000", 1.5e-10: "1.5e-10"}
        for value, js in cases.items():
            self.assertEqual(test_live._js_number(value), js)
        self.assertEqual(test_live._js_stringify({"a": [1, 1.0, True, None, "é"]}), '{"a":[1,1,true,null,"é"]}')
        # key order and integers as JavaScript has them
        self.assertEqual(test_live._js_stringify({"b": 1, "404": 2, "200": 3, "01": 4}), '{"200":3,"404":2,"b":1,"01":4}')
        self.assertEqual(test_live._js_stringify(9007199254740993), "9007199254740992")

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
