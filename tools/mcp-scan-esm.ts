// Research probe for exporter-mcp: inventory the *real* ESM syntax used by every JS
// payload in a lopecode HTML (module blocks + .js/.js.gz file attachments), so we know
// what a Function()-based linker must support. Uses Bun.Transpiler for a real parse
// (regexes mis-fire on markdown cells that merely quote `import`/`export`).
// Usage: bun tools/mcp-scan-esm.ts <notebook.html>
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Block = { id: string | null; mime?: string; enc?: string; body: string };

function splitBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;
  const closeRe = /<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = closeRe.exec(html))) {
    const closeEnd = m.index + m[0].length;
    const startIdx = html.indexOf("<script", cursor);
    if (startIdx === -1 || startIdx > m.index) { cursor = closeEnd; continue; }
    const tagEnd = html.indexOf(">", startIdx);
    const startTag = html.slice(startIdx, tagEnd + 1);
    const attr = (n: string) => startTag.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
    blocks.push({
      id: attr("id") ?? null,
      mime: attr("data-mime"),
      enc: attr("data-encoding"),
      body: html.slice(tagEnd + 1, m.index),
    });
    cursor = closeEnd;
  }
  return blocks;
}

function decode(b: Block): string | null {
  const t = b.body.trim();
  try {
    if (b.enc === "base64+gzip") return gunzipSync(Buffer.from(t, "base64")).toString("utf8");
    if (b.enc === "base64") {
      const raw = Buffer.from(t, "base64");
      // .js.gz attachments are base64 of the gzip bytes, not base64+gzip text
      return (raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw).toString("utf8");
    }
    return b.body;
  } catch { return null; }
}

const path = process.argv[2];
const blocks = splitBlocks(readFileSync(path, "utf8"));
const transpiler = new Bun.Transpiler({ loader: "js" });

const isJs = (b: Block) =>
  b.mime === "application/javascript" ||
  (b.id ?? "").endsWith(".js.gz") || (b.id ?? "").endsWith(".js");

const rows: Array<{ id: string; kb: number; imports: string[]; exports: string[]; dyn: string[]; meta: boolean }> = [];
const failures: string[] = [];

for (const b of blocks.filter(isJs)) {
  const src = decode(b);
  if (src === null) { failures.push(`${b.id}: decode failed`); continue; }
  try {
    const scan = transpiler.scan(src);
    const statics = scan.imports.filter(i => i.kind === "import-statement").map(i => i.path);
    const dyn = scan.imports.filter(i => i.kind === "dynamic-import").map(i => i.path);
    rows.push({
      id: b.id ?? "(anon)",
      kb: Math.round(src.length / 1024),
      imports: statics,
      exports: scan.exports,
      dyn,
      meta: /\bimport\.meta\b/.test(src),
    });
  } catch (e: any) {
    failures.push(`${b.id}: parse failed — ${e.message?.split("\n")[0]}`);
  }
}

console.log(`${path}\n${blocks.length} blocks, ${rows.length} JS payloads parsed, ${failures.length} failures\n`);

const withStatic = rows.filter(r => r.imports.length);
console.log(`== payloads with REAL static imports: ${withStatic.length}`);
for (const r of withStatic) console.log(`   ${r.id} (${r.kb}k) -> ${JSON.stringify(r.imports)}`);

const exportShapes = new Map<string, string[]>();
for (const r of rows) {
  const key = r.exports.length === 0 ? "(none)"
    : r.exports.length === 1 && r.exports[0] === "default" ? "default only"
      : r.exports.includes("default") ? `default + ${r.exports.length - 1} named` : `${r.exports.length} named`;
  (exportShapes.get(key) ?? exportShapes.set(key, []).get(key)!).push(`${r.id} (${r.kb}k)`);
}
console.log(`\n== export shapes`);
for (const [k, v] of exportShapes) {
  console.log(`   ${k}: ${v.length}`);
  for (const x of v.slice(0, 6)) console.log(`      ${x}`);
  if (v.length > 6) console.log(`      ... +${v.length - 6} more`);
}

const withDyn = rows.filter(r => r.dyn.length);
console.log(`\n== payloads with dynamic import(): ${withDyn.length}`);
const dynSpecs = new Set(withDyn.flatMap(r => r.dyn));
console.log(`   distinct statically-known specifiers: ${JSON.stringify([...dynSpecs])}`);

console.log(`\n== import.meta users: ${rows.filter(r => r.meta).map(r => r.id).join(", ") || "none"}`);
if (failures.length) console.log(`\n== failures\n   ${failures.join("\n   ")}`);
