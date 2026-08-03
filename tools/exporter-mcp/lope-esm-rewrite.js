// ESM -> Function-body rewriter for exporter-mcp.
//
// A lopecode notebook normally executes every JS payload as a real ES module, which
// es-module-shims implements by minting a blob: URL per module and native-importing it.
// Sandboxes that forbid blob: script URLs (Claude for Work) break that. This rewriter
// turns module source into a body that `new Function("__lope", body)` can run, so the
// only privilege needed is eval.
//
// Contract for the generated body — the host passes one argument, `__lope`:
//   __lope.x     module namespace object to populate (exports write here)
//   __lope.imp   (specifier, opts?) -> Promise<namespace>   (import + import())
//   __lope.meta  stand-in for import.meta
//   __lope.star  (ns) -> void, splat a re-export
//
// Positions come from es-module-lexer (asm.js build, no wasm — `wasm-unsafe-eval` is
// not assumed). The lexer gives exact ranges for imports; for exports it gives only the
// name ranges, so we walk back to the nearest `export` keyword, which is safe because
// only code (never a string or comment) can sit between `export` and an exported name.
//
// Known deviations from real ESM, all acceptable for the notebook corpus (verified with
// tools/mcp-scan-esm.ts: 78 payloads, 1 with static imports, 0 with re-exports):
//   - imports are not hoisted; they execute where they are written
//   - bindings are snapshots, not live
//   - import cycles are not resolved (the corpus has none)

const KW = "export";

function isIdentChar(c) {
  return /[A-Za-z0-9_$]/.test(c);
}

// nearest `export` keyword at or before `from`, as a standalone token
function findExportKeyword(src, from) {
  let i = from;
  while (i >= 0) {
    i = src.lastIndexOf(KW, i);
    if (i < 0) return -1;
    const before = i === 0 ? "" : src[i - 1];
    const after = src[i + KW.length] ?? "";
    if ((!before || !isIdentChar(before)) && !isIdentChar(after)) return i;
    i -= 1;
  }
  return -1;
}

function skipSpace(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

// end index (exclusive) of the `}` closing an export clause that starts at `open`
function matchBrace(src, open) {
  let i = open + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c) i += src[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (c === "}") return i + 1;
    i++;
  }
  throw new Error("unterminated export clause");
}

// `{a as b, "c-d" as e}` -> destructuring pattern `{a: b, "c-d": e}` plus the name pairs
function parseNamedClause(text) {
  const inner = text.trim().replace(/^\{/, "").replace(/\}$/, "");
  return inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\S+)\s+as\s+(\S+)$/);
      return m ? { from: m[1], to: m[2] } : { from: part, to: part };
    });
}

// binding clause of a static import, i.e. everything between `import` and the specifier
function parseImportClause(clause, tmp) {
  let text = clause.trim();
  if (text.endsWith("from")) text = text.slice(0, -4).trim();
  if (!text) return "";
  const out = [];
  const braceAt = text.indexOf("{");
  const head = (braceAt === -1 ? text : text.slice(0, braceAt)).replace(/,\s*$/, "").trim();
  if (head) {
    const star = head.match(/^\*\s+as\s+(\S+)$/);
    if (star) out.push(`const ${star[1]} = ${tmp};`);
    else out.push(`const ${head} = ${tmp}.default;`);
  }
  if (braceAt !== -1) {
    const pairs = parseNamedClause(text.slice(braceAt));
    if (pairs.length) out.push(`const {${pairs.map((p) => `${p.from}: ${p.to}`).join(", ")}} = ${tmp};`);
  }
  return out.join(" ");
}

/**
 * @param {string} src      module source
 * @param {Function} parse  es-module-lexer's parse()
 * @returns {{body: string, exports: string[]}}
 */
export function rewriteModule(src, parse) {
  const [imports, exportRecords] = parse(src);
  /** @type {{start:number,end:number,text:string}[]} */
  const edits = [];
  const tail = []; // assignments appended after the body (declaration exports)
  const exportNames = [];
  let tmpN = 0;

  for (const imp of imports) {
    const spec = imp.n !== undefined && imp.n !== null ? JSON.stringify(imp.n) : null;
    if (imp.d === -2) {
      edits.push({ start: imp.s, end: imp.e, text: "__lope.meta" });
      continue;
    }
    if (imp.d > -1) {
      // dynamic import(...) — keep the argument expression, swap the callee
      edits.push({ start: imp.ss, end: imp.d, text: "__lope.imp" });
      continue;
    }
    // static: `import ... from "spec"` or the re-export forms `export * / {x} from "spec"`
    const stmt = src.slice(imp.ss, imp.se);
    const tmp = `__lope_i${tmpN++}`;
    if (!spec) throw new Error(`dynamic specifier in a static import: ${stmt.slice(0, 80)}`);
    if (stmt.startsWith(KW)) {
      const afterKw = skipSpace(src, imp.ss + KW.length);
      if (src[afterKw] === "*") {
        const asName = src.slice(afterKw + 1, imp.ss + stmt.length).match(/^\s*as\s+(\S+)\s+from/);
        const text = asName
          ? `const ${tmp} = await __lope.imp(${spec}); __lope.x[${JSON.stringify(asName[1])}] = ${tmp};`
          : `__lope.star(await __lope.imp(${spec}));`;
        edits.push({ start: imp.ss, end: imp.se, text });
      } else if (src[afterKw] === "{") {
        const close = matchBrace(src, afterKw);
        const pairs = parseNamedClause(src.slice(afterKw, close));
        const assigns = pairs
          .map((p) => `__lope.x[${JSON.stringify(p.to)}] = ${tmp}[${JSON.stringify(p.from)}];`)
          .join(" ");
        pairs.forEach((p) => exportNames.push(p.to));
        edits.push({ start: imp.ss, end: imp.se, text: `const ${tmp} = await __lope.imp(${spec}); ${assigns}` });
      } else {
        throw new Error(`unsupported re-export: ${stmt.slice(0, 80)}`);
      }
      continue;
    }
    const quote = src.lastIndexOf(src[imp.s - 1], imp.s - 1); // opening quote of the specifier
    const clause = src.slice(imp.ss + "import".length, quote);
    edits.push({
      start: imp.ss,
      end: imp.se,
      text: `const ${tmp} = await __lope.imp(${spec}); ${parseImportClause(clause, tmp)}`,
    });
  }

  // group export records by the `export` keyword that introduces them
  const groups = new Map();
  for (const ex of exportRecords) {
    const anchor = ex.s >= 0 ? ex.s : ex.ls;
    const kw = findExportKeyword(src, anchor);
    if (kw < 0) throw new Error(`no export keyword before ${JSON.stringify(ex.n)}`);
    if (!groups.has(kw)) groups.set(kw, []);
    groups.get(kw).push(ex);
  }

  for (const [kw, recs] of groups) {
    if (edits.some((e) => e.start <= kw && kw < e.end)) continue; // already handled as a re-export
    const after = skipSpace(src, kw + KW.length);
    recs.forEach((r) => exportNames.push(r.n));
    if (src.startsWith("default", after) && !isIdentChar(src[after + 7] ?? "")) {
      edits.push({ start: kw, end: after + 7, text: "__lope.x.default =" });
    } else if (src[after] === "{") {
      const close = matchBrace(src, after);
      const pairs = parseNamedClause(src.slice(after, close));
      const text = pairs.map((p) => `__lope.x[${JSON.stringify(p.to)}] = ${p.from};`).join(" ");
      edits.push({ start: kw, end: close, text });
    } else {
      // `export const/let/var/function/class ...` — drop the keyword, publish at the end
      edits.push({ start: kw, end: after, text: "" });
      for (const r of recs) {
        const local = r.ln ?? r.n;
        tail.push(`__lope.x[${JSON.stringify(r.n)}] = ${local};`);
      }
    }
  }

  edits.sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const e of edits) {
    if (e.start < cursor) throw new Error("overlapping rewrite");
    out += src.slice(cursor, e.start) + e.text;
    cursor = e.end;
  }
  out += src.slice(cursor);
  if (tail.length) out += "\n" + tail.join("\n");
  return { body: out, exports: exportNames };
}
