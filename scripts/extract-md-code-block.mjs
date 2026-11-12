// scan-secrets.mjs and issue-url.mjs (the check and diagnose skills' scripts) ship as .md files
// inside plugin/, as a fenced code block: the Claude plugin directory accepts scripts, programs
// and files outside Markdown/text/JSON/YAML/images only from a Verified organization, which this
// plugin isn't (see the comment at the top of each .md file). Tests still need a real, importable
// and runnable .mjs, so this helper extracts the fenced block to a temp file on demand.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function extractScript(mdPath) {
  const text = fs.readFileSync(mdPath, "utf8");
  const match = text.match(/```javascript\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`no fenced javascript code block found in ${mdPath}`);
  // realpathSync: on macOS, os.tmpdir() lives under a symlink (/tmp -> /private/tmp), and the
  // extracted script's own CLI guard compares process.argv[1] against fileURLToPath(import.meta.url)
  // — give both the same, fully-resolved path so that comparison holds.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "afrotools-script-")));
  const out = path.join(dir, path.basename(mdPath, ".md") + ".mjs");
  fs.writeFileSync(out, match[1]);
  return out;
}
