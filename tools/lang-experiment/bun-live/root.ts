// A copy of the source tree for tests: lite/ and prelude.runtime.ts copied, everything else the build reads symlinked,
// at the same depth as the repository, because build.ts and ts-cells.ts resolve their inputs from import.meta.url.
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const REPO = resolve(import.meta.dir, "../../..");
export const SCRATCH = join(REPO, "tools/lang-experiment/lite/soundscript/.scratch/bun-live");
export const liteOf = (root: string) => join(root, "tools/lang-experiment/lite");
export const DEFAULT_NOTEBOOK = join(REPO, "lopebooks/notebooks/soundscript.html");

const SKIP = new Set(["node_modules", ".scratch", ".oracle-scratch", ".oracle-scratch-spec", "shots", "archive", "build", ".jsx-build"]);

export function makeRoot(dest: string, from = REPO) {
  rmSync(dest, { recursive: true, force: true });
  const lang = join(dest, "tools/lang-experiment");
  mkdirSync(lang, { recursive: true });
  // the scratch folder is inside lite/, so cpSync's recursive copy refuses it
  const copy = (src: string, to: string) => {
    mkdirSync(to, { recursive: true });
    for (const e of readdirSync(src, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      if (e.isDirectory()) copy(join(src, e.name), join(to, e.name));
      else cpSync(join(src, e.name), join(to, e.name));
    }
  };
  copy(liteOf(from), liteOf(dest));
  mkdirSync(join(liteOf(dest), "soundscript/.scratch"), { recursive: true });
  symlinkSync(join(liteOf(from), "node_modules"), join(liteOf(dest), "node_modules"));
  for (const f of ["prelude.runtime.ts", "prelude.d.ts", "package.json"]) cpSync(join(from, "tools/lang-experiment", f), join(lang, f));
  for (const e of readdirSync(join(from, "tools/lang-experiment"))) if (!existsSync(join(lang, e))) symlinkSync(join(from, "tools/lang-experiment", e), join(lang, e));
  for (const e of readdirSync(join(from, "tools"))) if (e !== "lang-experiment") symlinkSync(join(from, "tools", e), join(dest, "tools", e));
  for (const e of readdirSync(from)) if (e !== "tools" && !e.startsWith(".")) symlinkSync(join(from, e), join(dest, e));
  return dest;
}

// The relative imports of the symlinked files that land inside lite/: those would resolve to the real tree, not the copy.
export function escapes(root: string): string[] {
  const tts = { ts: new Bun.Transpiler({ loader: "ts" }), tsx: new Bun.Transpiler({ loader: "tsx" }) };
  const real = liteOf(REPO), bad: string[] = [];
  const seen = new Set<string>();
  const go = (f: string, via: string) => {
    if (seen.has(f) || !/\.(m?[jt]sx?)$/.test(f) || !existsSync(f)) return;
    seen.add(f);
    let imports: { path: string }[] = [];
    try { imports = tts[f.endsWith("x") ? "tsx" : "ts"].scanImports(readFileSync(f, "utf8")); } catch { return; }
    for (const i of imports) {
      if (!i.path.startsWith(".")) continue;
      const t = resolve(dirname(f), i.path);
      if (t.startsWith(real + "/")) bad.push(`${relative(REPO, via)} -> ${relative(REPO, t)}`);
      else if (!t.startsWith(liteOf(root))) go(t, via);
    }
  };
  for (const f of ["spec-notebook.ts", "lib/notebook-blocks.ts", "lope-preflight.ts", "notebook-import.ts", "lope-runtime.js"]) go(join(REPO, "tools", f), join(REPO, "tools", f));
  return bad;
}

export const isLink = (p: string) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };
