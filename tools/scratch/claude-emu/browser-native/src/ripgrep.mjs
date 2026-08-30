// ripgrep, in JavaScript, for the two callers that matter.
//
// cli.js's Glob and Grep tools are both `rg` invocations — Glob runs
// `rg --files --glob <pat> --sort=modified <dir>`, Grep runs
// `rg --hidden [-l|-c|-n|-i|-U|-C n] <pattern> <dir>`. With child_process
// stubbed to ENOENT both fail outright, which leaves the agent unable to list
// or search anything (including a mounted /local-disk). This implements the
// flag subset those two emit, served from the same fs the Read tool sees.
//
// Deliberate divergences from real ripgrep: .git is always skipped, .gitignore
// is honoured only as literal per-directory patterns, and --sort=modified is
// newest-first (the Glob tool presents its result as "sorted by modification
// time"). Everything else is either implemented or accepted-and-ignored.
import fs from "./fs.mjs";
import { basename } from "./path.mjs";

export const RG_VERSION = "ripgrep 14.1.1 (browser-native shim)\n";

const MAX_FILES = 20000;

// rg --type NAME, for the names the model actually asks for.
const TYPES = {
  js: ["*.js", "*.jsx", "*.mjs", "*.cjs", "*.vue"],
  ts: ["*.ts", "*.tsx", "*.mts", "*.cts"],
  jsx: ["*.jsx", "*.tsx"],
  py: ["*.py", "*.pyi"],
  rust: ["*.rs"], go: ["*.go"], java: ["*.java"], c: ["*.c", "*.h"],
  cpp: ["*.cpp", "*.cc", "*.cxx", "*.hpp", "*.hh"],
  md: ["*.md", "*.markdown"], json: ["*.json"], yaml: ["*.yaml", "*.yml"],
  toml: ["*.toml"], html: ["*.html", "*.htm"], css: ["*.css", "*.scss", "*.sass"],
  sh: ["*.sh", "*.bash", "*.zsh"], sql: ["*.sql"], xml: ["*.xml", "*.svg"],
  rb: ["*.rb"], php: ["*.php"], swift: ["*.swift"], kotlin: ["*.kt", "*.kts"],
  txt: ["*.txt"],
};

export function isRipgrep(file, opts) {
  if (opts && opts.argv0 === "rg") return true;
  const b = basename(String(file || ""));
  return b === "rg" || b === "rg.exe";
}

const ESC = /[.*+?^${}()|[\]\\]/;
const esc = (c) => (ESC.test(c) ? "\\" + c : c);

function splitTop(s) {
  const parts = [];
  let depth = 0, cur = "";
  for (const c of s) {
    if (c === "{") depth++;
    else if (c === "}") depth--;
    if (c === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function globSource(g) {
  let out = "", i = 0;
  while (i < g.length) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      i += 2;
      if (g[i] === "/") { out += "(?:.*/)?"; i++; } else out += ".*";
    } else if (c === "*") { out += "[^/]*"; i++; }
    else if (c === "?") { out += "[^/]"; i++; }
    else if (c === "[") {
      const j = g.indexOf("]", i + 1);
      if (j < 0) { out += "\\["; i++; } else { out += g.slice(i, j + 1); i = j + 1; }
    } else if (c === "{") {
      let depth = 1, j = i + 1;
      while (j < g.length && depth) { if (g[j] === "{") depth++; else if (g[j] === "}") depth--; j++; }
      out += "(?:" + splitTop(g.slice(i + 1, j - 1)).map(globSource).join("|") + ")";
      i = j;
    } else { out += esc(c); i++; }
  }
  return out;
}

// A gitignore-style matcher: no slash => match the basename anywhere; a trailing
// slash (or a bare directory name) also covers everything beneath it.
function globToRe(glob) {
  let g = String(glob).trim();
  const dirOnly = g.endsWith("/");
  if (dirOnly) g = g.slice(0, -1);
  const anchored = g.includes("/");
  let src = globSource(g.replace(/^\//, ""));
  if (!anchored) src = "(?:.*/)?" + src;
  return new RegExp("^" + src + "(?:/.*)?$");
}

function matcher(globs) {
  const inc = [], exc = [];
  for (const g of globs) {
    if (!g) continue;
    if (g.startsWith("!")) exc.push(globToRe(g.slice(1)));
    else inc.push(globToRe(g));
  }
  return {
    excluded(rel, abs) { return exc.some((re) => re.test(rel) || re.test(abs)); },
    included(rel, abs) {
      if (this.excluded(rel, abs)) return false;
      return inc.length === 0 || inc.some((re) => re.test(rel));
    },
  };
}

function isDirEnt(e, abs) {
  if (e && typeof e === "object" && typeof e.isDirectory === "function") return e.isDirectory();
  try { return fs.statSync(abs).isDirectory(); } catch { return false; }
}

function walk(root, o) {
  try { if (fs.statSync(root).isFile()) return [root]; } catch { return []; }
  const out = [];
  const stack = [{ dir: root, rel: "", depth: 0 }];
  while (stack.length && out.length < MAX_FILES) {
    const { dir, rel, depth } = stack.pop();
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    let ignore = o.match;
    if (o.respectIgnore) {
      const extra = readIgnore(dir, rel);
      if (extra.length) ignore = matcher(o.globs.concat(extra));
    }
    for (const e of ents) {
      const name = typeof e === "string" ? e : e.name;
      if (name === ".git") continue;
      if (!o.hidden && name.startsWith(".")) continue;
      const abs = dir.endsWith("/") ? dir + name : dir + "/" + name;
      const rel2 = rel ? rel + "/" + name : name;
      if (isDirEnt(e, abs)) {
        if (depth + 1 > o.maxDepth) continue;
        if (ignore.excluded(rel2, abs) || ignore.excluded(rel2 + "/x", abs + "/x")) continue;
        stack.push({ dir: abs, rel: rel2, depth: depth + 1 });
      } else if (ignore.included(rel2, abs)) out.push(abs);
    }
  }
  return out;
}

// .gitignore, read literally: comments and negations dropped, patterns rebased
// onto the walk root so the shared glob matcher can apply them.
function readIgnore(dir, rel) {
  let text = null;
  try { text = String(fs.readFileSync(dir + (dir.endsWith("/") ? "" : "/") + ".gitignore", "utf8")); } catch { return []; }
  return text.split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("!"))
    .map((l) => "!" + (rel && l.includes("/") ? rel + "/" + l.replace(/^\//, "") : l));
}

function mtime(p) { try { return fs.statSync(p).mtimeMs || 0; } catch { return 0; } }

function isBinary(buf) {
  const s = typeof buf === "string" ? buf : String(buf);
  return s.slice(0, 8192).includes("\0");
}

function parse(args) {
  const o = {
    files: false, hidden: false, respectIgnore: true, ignoreCase: false,
    filesWithMatches: false, count: false, lineNumber: false, multiline: false,
    dotall: false, before: 0, after: 0, maxDepth: Infinity, maxColumns: 0,
    maxCount: Infinity, sort: null, globs: [], pattern: null, paths: [], version: false,
  };
  const val = (i) => args[i + 1];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (true) {
      case a === "--files": o.files = true; break;
      case a === "--version" || a === "-V": o.version = true; break;
      case a === "--hidden" || a === "-H" || a === "--no-ignore-vcs" || a === "--follow" || a === "-L":
        if (a === "--hidden" || a === "-H") o.hidden = true;
        if (a === "--no-ignore-vcs") o.respectIgnore = false;
        break;
      case a === "--no-ignore" || a === "-u" || a === "--no-ignore-parent": o.respectIgnore = false; break;
      case a === "-i" || a === "--ignore-case" || a === "-S" || a === "--smart-case": o.ignoreCase = true; break;
      case a === "-l" || a === "--files-with-matches": o.filesWithMatches = true; break;
      case a === "-c" || a === "--count" || a === "--count-matches": o.count = true; break;
      case a === "-n" || a === "--line-number": o.lineNumber = true; break;
      case a === "-U" || a === "--multiline": o.multiline = true; break;
      case a === "--multiline-dotall": o.dotall = true; break;
      case a === "--glob" || a === "-g" || a === "--iglob": o.globs.push(val(i)); i++; break;
      case a === "--type" || a === "-t": o.globs.push(...(TYPES[val(i)] || [])); i++; break;
      case a === "--type-not" || a === "-T": o.globs.push(...(TYPES[val(i)] || []).map((g) => "!" + g)); i++; break;
      case a === "-e" || a === "--regexp": o.pattern = val(i); i++; break;
      case a === "-C" || a === "--context": o.before = o.after = +val(i) || 0; i++; break;
      case a === "-B" || a === "--before-context": o.before = +val(i) || 0; i++; break;
      case a === "-A" || a === "--after-context": o.after = +val(i) || 0; i++; break;
      case a === "-d" || a === "--max-depth": o.maxDepth = +val(i) || Infinity; i++; break;
      case a === "-m" || a === "--max-count": o.maxCount = +val(i) || Infinity; i++; break;
      case a === "--max-columns": o.maxColumns = +val(i) || 0; i++; break;
      case a === "--sort": o.sort = val(i); i++; break;
      case a.startsWith("--sort="): o.sort = a.slice(7); break;
      case a === "-j" || a === "--threads" || a === "--color" || a === "--colour" || a === "--binary-files" || a === "--label":
        i++; break;
      case a === "--no-config" || a === "--json" || a === "--stats" || a === "-a" || a === "--text" || a === "--strip-cwd-prefix":
        break;
      case a.startsWith("-") && a !== "-": break; // unknown flag: accept and ignore
      default:
        if (!o.files && o.pattern === null) o.pattern = a;
        else o.paths.push(a);
    }
  }
  return o;
}

export function runRipgrep(args, cwd) {
  const o = parse(args || []);
  if (o.version) return { code: 0, stdout: RG_VERSION, stderr: "" };
  const roots = o.paths.length ? o.paths : [cwd || "/"];
  const match = matcher(o.globs);
  const opts = { hidden: o.hidden, respectIgnore: o.respectIgnore, maxDepth: o.maxDepth, globs: o.globs, match };

  let files = [];
  for (const r of roots) files = files.concat(walk(r, opts));

  if (o.files) {
    if (o.sort === "modified") files.sort((a, b) => mtime(b) - mtime(a) || a.localeCompare(b));
    return { code: files.length ? 0 : 1, stdout: files.length ? files.join("\n") + "\n" : "", stderr: "" };
  }

  if (o.pattern === null) return { code: 2, stderr: "rg: no pattern given\n", stdout: "" };
  let re;
  try { re = new RegExp(o.pattern, "g" + (o.ignoreCase ? "i" : "") + (o.dotall ? "s" : "")); }
  catch (e) { return { code: 2, stdout: "", stderr: `rg: regex parse error: ${e.message}\n` }; }

  const out = [];
  const trunc = (s) => (o.maxColumns && s.length > o.maxColumns ? s.slice(0, o.maxColumns) + " [... omitted end of long line]" : s);
  for (const f of files) {
    let text;
    try { text = String(fs.readFileSync(f, "utf8")); } catch { continue; }
    if (isBinary(text)) continue;
    const lines = text.split("\n");
    const hits = [];
    if (o.multiline) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) && hits.length < o.maxCount) {
        const start = text.slice(0, m.index).split("\n").length - 1;
        const end = start + m[0].split("\n").length - 1;
        for (let i = start; i <= end; i++) if (!hits.includes(i)) hits.push(i);
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } else {
      for (let i = 0; i < lines.length && hits.length < o.maxCount; i++) {
        re.lastIndex = 0;
        if (re.test(lines[i])) hits.push(i);
      }
    }
    if (!hits.length) continue;
    if (o.filesWithMatches) { out.push(f); continue; }
    if (o.count) { out.push(`${f}:${hits.length}`); continue; }
    const shown = new Set();
    for (const h of hits) for (let i = Math.max(0, h - o.before); i <= Math.min(lines.length - 1, h + o.after); i++) shown.add(i);
    for (const i of [...shown].sort((a, b) => a - b)) {
      const sep = hits.includes(i) ? ":" : "-";
      out.push(o.lineNumber || o.before || o.after ? `${f}${sep}${i + 1}${sep}${trunc(lines[i])}` : `${f}${sep}${trunc(lines[i])}`);
    }
  }
  return { code: out.length ? 0 : 1, stdout: out.length ? out.join("\n") + "\n" : "", stderr: "" };
}

export default { isRipgrep, runRipgrep, RG_VERSION };
