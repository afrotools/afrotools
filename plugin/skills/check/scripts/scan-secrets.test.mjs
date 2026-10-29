import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scan } from "./scan-secrets.mjs";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "scan-secrets.mjs");

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
    ".env.example": "NEXT_PUBLIC_API_KEY=a1b2c3d4e5f6g7h8i9\nAPI_KEY=a1b2c3d4e5f6g7h8i9\n",
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
  assert.match(r.stderr, /^not a git repository: the tracked \.env check was skipped$/m);
});
