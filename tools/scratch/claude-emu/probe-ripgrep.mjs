// The rg shim, exercised with the exact argv cli.js's Glob and Grep tools emit.
// Runs in node against the same memfs the browser uses — no browser needed.
import { vol } from "./browser-native/src/fs-core.mjs";
import { runRipgrep } from "./browser-native/src/ripgrep.mjs";

vol.fromJSON({
  "/local-disk/README.md": "# my project\nhello from the local disk\n",
  "/local-disk/src/index.js": "export const answer = 42;\nfunction hidden() {}\n",
  "/local-disk/src/deep/util.ts": "export const answer = 7;\n",
  "/local-disk/.env": "SECRET=1\n",
  "/local-disk/.gitignore": "build\n",
  "/local-disk/build/out.js": "generated\n",
  "/local-disk/node_modules/junk/index.js": "nope\n",
  "/local-disk/notes.txt": "line one\nline two answer\nline three\n",
});

const t = [];
const check = (name, got, want) => t.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want });
const lines = (r) => r.stdout.split("\n").filter(Boolean);

// --- Glob tool argv ---------------------------------------------------------
check("glob **/*.js",
  lines(runRipgrep(["--files", "--glob", "**/*.js", "--sort=modified", "--no-ignore", "--hidden", "/local-disk"], "/")).sort(),
  ["/local-disk/build/out.js", "/local-disk/node_modules/junk/index.js", "/local-disk/src/index.js"]);

check("glob * (top level too)",
  lines(runRipgrep(["--files", "--glob", "*", "--sort=modified", "--no-ignore", "--hidden", "/local-disk"], "/")).length >= 8, true);

check("glob src/**",
  lines(runRipgrep(["--files", "--glob", "src/**", "--sort=modified", "--no-ignore", "--hidden", "/local-disk"], "/")).sort(),
  ["/local-disk/src/deep/util.ts", "/local-disk/src/index.js"]);

check("glob excludes node_modules",
  lines(runRipgrep(["--files", "--glob", "**/*.js", "--glob", "!**/node_modules/**", "--no-ignore", "--hidden", "/local-disk"], "/")).sort(),
  ["/local-disk/build/out.js", "/local-disk/src/index.js"]);

check("glob {ts,txt} brace",
  lines(runRipgrep(["--files", "--glob", "*.{ts,txt}", "--no-ignore", "--hidden", "/local-disk"], "/")).sort(),
  ["/local-disk/notes.txt", "/local-disk/src/deep/util.ts"]);

check("no --hidden skips dotfiles",
  lines(runRipgrep(["--files", "--glob", "*", "--no-ignore", "/local-disk"], "/")).includes("/local-disk/.env"), false);

check("gitignore honoured without --no-ignore",
  lines(runRipgrep(["--files", "--hidden", "/local-disk"], "/")).includes("/local-disk/build/out.js"), false);

check("no match exits 1", runRipgrep(["--files", "--glob", "*.rs", "--no-ignore", "/local-disk"], "/").code, 1);

// --- Grep tool argv ---------------------------------------------------------
check("grep -l",
  lines(runRipgrep(["--hidden", "--max-columns", "500", "-l", "answer", "/local-disk"], "/")).sort(),
  ["/local-disk/notes.txt", "/local-disk/src/deep/util.ts", "/local-disk/src/index.js"]);

check("grep -c",
  lines(runRipgrep(["--hidden", "-c", "answer", "/local-disk/notes.txt"], "/")),
  ["/local-disk/notes.txt:1"]);

check("grep content -n",
  lines(runRipgrep(["--hidden", "-n", "answer", "/local-disk/notes.txt"], "/")),
  ["/local-disk/notes.txt:2:line two answer"]);

check("grep -C1 context",
  lines(runRipgrep(["--hidden", "-n", "-C", "1", "answer", "/local-disk/notes.txt"], "/")),
  ["/local-disk/notes.txt-1-line one", "/local-disk/notes.txt:2:line two answer", "/local-disk/notes.txt-3-line three"]);

check("grep -i", runRipgrep(["--hidden", "-l", "-i", "ANSWER", "/local-disk/notes.txt"], "/").code, 0);

check("grep --glob filter",
  lines(runRipgrep(["--hidden", "-l", "answer", "--glob", "*.ts", "/local-disk"], "/")),
  ["/local-disk/src/deep/util.ts"]);

check("grep --type js",
  lines(runRipgrep(["--hidden", "-l", "answer", "--type", "js", "--no-ignore", "/local-disk"], "/")),
  ["/local-disk/src/index.js"]);

check("grep -U multiline",
  lines(runRipgrep(["--hidden", "-n", "-U", "--multiline-dotall", "one[\\s\\S]*?three", "/local-disk/notes.txt"], "/")).length, 3);

check("grep no match exits 1", runRipgrep(["--hidden", "-l", "zzz", "/local-disk"], "/").code, 1);
check("bad regex exits 2", runRipgrep(["--hidden", "-l", "*[", "/local-disk"], "/").code, 2);
check("--version", runRipgrep(["--version"], "/").stdout.startsWith("ripgrep "), true);

const bad = t.filter((x) => !x.ok);
for (const x of t) console.log((x.ok ? "ok   " : "FAIL ") + x.name + (x.ok ? "" : `\n  got  ${JSON.stringify(x.got)}\n  want ${JSON.stringify(x.want)}`));
console.log(`\n${t.length - bad.length}/${t.length} pass`);
process.exit(bad.length ? 1 : 0);
