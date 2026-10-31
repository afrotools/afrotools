import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scan } from "../plugin/skills/check/scripts/scan-secrets.mjs";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugin/skills/check/scripts/scan-secrets.mjs");

function project(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-secrets-"));
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

test("secret literal assigned in code", () => {
  const dir = project({ "src/pay.ts": 'const LENGOPAY_LICENSE_KEY = "a1b2c3d4e5f6g7h8";\n' });
  assert.deepEqual(scan(dir), [{ file: "src/pay.ts", line: 1, reason: "secret value in code: LENGOPAY_LICENSE_KEY" }]);
});

test("secret exposed to the browser", () => {
  const dir = project({
    ".env.local": "NEXT_PUBLIC_WAVE_API_KEY=abc\nWAVE_API_KEY=a1b2c3d4e5f6g7h8i9\n",
    "src/a.ts": "const t = import.meta.env.VITE_SECRET_TOKEN;\n",
  });
  assert.deepEqual(scan(dir), [
    { file: ".env.local", line: 1, reason: "secret exposed to the browser: NEXT_PUBLIC_WAVE_API_KEY" },
    { file: "src/a.ts", line: 1, reason: "secret exposed to the browser: VITE_SECRET_TOKEN" },
  ]);
});

test("placeholders and examples are not findings", () => {
  const dir = project({
    "src/config.ts": [
      'const API_KEY = "xxxxxxxxxxxxxxxx";',
      'const SECRET_KEY = "your_secret_key_here";',
      'const ACCESS_TOKEN = "<access-token-here>";',
      'const PASSWORD = "changeme-changeme";',
      "const key = process.env.API_KEY;",
      "const CLIENT_SECRET = `${KEY_FROM_SOMEWHERE}`;",
    ].join("\n"),
    // references to a variable defined elsewhere (Supabase config.toml, GitHub Actions)
    "supabase/config.toml": 'openai_api_key = "env(OPENAI_API_KEY)"\nauth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"\n',
    "ci.yml": 'api_key: "${{ secrets.WAVE_API_KEY }}"\n',
    ".env.example": "NEXT_PUBLIC_API_KEY=your_public_key\nAPI_KEY=xxxxxxxxxxxxxxxx\nSECRET_KEY=<secret>\n",
  });
  assert.deepEqual(scan(dir), []);
});

test("skipped paths", () => {
  const leak = 'const API_KEY = "a1b2c3d4e5f6g7h8";\n';
  const dir = project({
    "node_modules/x/index.js": leak, ".git/hooks/x.js": leak, "dist/a.js": leak, "build/a.js": leak,
    ".next/a.js": leak, "coverage/a.js": leak, "package-lock.json": leak, "yarn.lock": leak,
    "pnpm-lock.yaml": leak, "public/app.min.js": leak, "img.bin": `\0${leak}`,
  });
  assert.deepEqual(scan(dir), []);
});

test("tracked .env in a git repo", () => {
  const dir = project({ ".env": "API_KEY=a1b2c3d4e5f6g7h8\n" });
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["add", ".env"], { cwd: dir });
  assert.deepEqual(scan(dir), [{ file: ".env", line: 0, reason: ".env file tracked by git: .env" }]);

  const ignored = project({ ".env": "API_KEY=a1b2c3d4e5f6g7h8\n", ".gitignore": ".env\n" });
  spawnSync("git", ["init", "-q"], { cwd: ignored });
  assert.deepEqual(scan(ignored), []);
});

test("not a git repository", () => {
  const dir = project({ "src/pay.ts": 'const API_KEY = "a1b2c3d4e5f6g7h8";\n' });
  const r = spawnSync("node", [CLI, dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "src/pay.ts:1: secret value in code: API_KEY\n");
  assert.match(r.stderr, /^no git repository here, so \.env files tracked by git were not checked$/m);
});

// Every secret the registry asks for (auth.env_var / auth.credentials), not just the common shapes.
test("every secret credential name of the registry is caught", () => {
  const specs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../specs");
  const names = new Set();
  for (const cat of fs.readdirSync(specs, { withFileTypes: true }).filter((d) => d.isDirectory()))
    for (const prov of fs.readdirSync(path.join(specs, cat.name), { withFileTypes: true }).filter((d) => d.isDirectory()))
      for (const cap of fs.readdirSync(path.join(specs, cat.name, prov.name), { withFileTypes: true }).filter((d) => d.isDirectory())) {
        const auth = JSON.parse(fs.readFileSync(path.join(specs, cat.name, prov.name, cap.name, "schema.json"), "utf8")).auth ?? {};
        for (const n of [auth.env_var, ...(auth.credentials ?? []).map((c) => c?.env_var)]) if (n) names.add(n);
      }
  const secrets = [...names].filter((n) => /KEY|SECRET|TOKEN/.test(n) && !/PUBLIC_KEY/.test(n));
  assert.ok(secrets.length > 10, "registry names found");
  const dir = project({ "src/keys.ts": secrets.map((n) => `const ${n} = "a1b2c3d4e5f6g7h8";`).join("\n") });
  const found = new Set(scan(dir).map((f) => f.reason.replace("secret value in code: ", "")));
  assert.deepEqual(secrets.filter((n) => !found.has(n)), []);
});

test("public keys and identifiers are not secrets", () => {
  const dir = project({
    "src/c.ts": 'const NOTCHPAY_PUBLIC_KEY = "pk_a1b2c3d4e5f6g7h8";\nconst DJOMY_CLIENT_ID = "a1b2c3d4e5f6g7h8";\nconst STORAGE_KEY = "afrotools-cart-v1";\n',
    ".env.local": "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiJ9\n", // the anon key is public by design
    "vercel.json": '{ "env": { "PAYCARD_API_KEY": "@paycard-api-key" } }\n', // a reference to a Vercel secret
  });
  assert.deepEqual(scan(dir), []);
});

test("keys in JSON, YAML and hard-coded Authorization headers", () => {
  const dir = project({
    "config.json": '{ "apiKey": "sk_live_a1b2c3d4e5f6" }\n',
    "deploy.yml": "api_key: sk_live_a1b2c3d4e5f6\n",
    "src/h.ts": 'fetch(url, { headers: { Authorization: "Bearer a1b2c3d4e5f6g7h8" } });\n',
  });
  assert.deepEqual(scan(dir).map((f) => `${f.file}:${f.line}: ${f.reason}`), [
    "config.json:1: secret value in code: apiKey",
    "deploy.yml:1: secret value in code: api_key",
    "src/h.ts:1: secret value in code: Authorization header",
  ]);
});

test("a real-looking key in .env.example is a finding, placeholders are not", () => {
  const dir = project({ ".env.example": "WAVE_API_KEY=wave_sn_prod_a1b2c3d4e5f6\nBICTORYS_API_KEY=your_key_here\nSESSION_SECRET=\n" });
  assert.deepEqual(scan(dir), [{ file: ".env.example", line: 1, reason: "secret value in an example file: WAVE_API_KEY" }]);
});

test("a tracked .env.example is expected, not a tracked .env", () => {
  const dir = project({ ".env.example": "API_KEY=your_key\n" });
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["add", ".env.example"], { cwd: dir });
  assert.deepEqual(scan(dir), []);
});

test("Python virtualenvs and vendored code are skipped", () => {
  const leak = 'API_KEY = "a1b2c3d4e5f6g7h8"\n';
  const dir = project({ ".venv/lib/x.py": leak, "venv/lib/x.py": leak, "vendor/x/y.php": `<?php $API_KEY = "a1b2c3d4e5f6g7h8";\n` });
  assert.deepEqual(scan(dir), []);
});

// Google says Firebase web config keys and browser Maps keys are public; a Gemini key (same AIza shape) is not.
test("Firebase and Maps browser keys are public, a Google API key elsewhere is not", () => {
  const dir = project({
    ".env.local": "NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA1b2c3d4e5f6g7h8i9\nNEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA1b2c3d4e5f6g7h8i9\n",
    "src/firebase.ts": 'const firebaseConfig = {\n  apiKey: "AIzaSyA1b2c3d4e5f6g7h8i9",\n  authDomain: "atelier.firebaseapp.com",\n};\n',
    "src/ai.ts": 'const GEMINI_API_KEY = "AIzaSyA1b2c3d4e5f6g7h8i9";\n',
  });
  assert.deepEqual(scan(dir), [{ file: "src/ai.ts", line: 1, reason: "secret value in code: GEMINI_API_KEY" }]);
});

test("an unreadable file is reported and the scan goes on", (t) => {
  if (process.getuid?.() === 0) return t.skip("root reads every file");
  const dir = project({ "src/locked.ts": "x\n", "src/pay.ts": 'const API_KEY = "a1b2c3d4e5f6g7h8";\n' });
  fs.chmodSync(path.join(dir, "src/locked.ts"), 0o000);
  const r = spawnSync("node", [CLI, dir], { encoding: "utf8" });
  fs.chmodSync(path.join(dir, "src/locked.ts"), 0o644);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, "src/pay.ts:1: secret value in code: API_KEY\n");
  assert.match(r.stderr, /^could not read src\/locked\.ts: not checked$/m);
});
