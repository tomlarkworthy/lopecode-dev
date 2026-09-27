// Does carrying the host page's `resolutions` pin change the URLs the served module imports?
//
// That is the actual dedupe key: es-module-shims returns the same module object for the same
// resolved URL, and runtime.module(define) memoises on define identity. So two copies of themes
// exist iff lopepage-2's served body imports themes at a URL the host page did not use.
//
// The host page (old.observablehq.com/@tomlarkworthy/exporter-3) carries ONE pin on every loader,
// measured 2026-09-24 with tools/probe-sniff-match.ts: resolutions=c5bd58fe29172a81@17342.
//
//   bun tools/probe-pin-closure.ts
import * as acorn from "acorn";

const HOST_PIN = process.argv[2] ?? "c5bd58fe29172a81@17342";
const SLUG = process.argv[3] ?? "@tomlarkworthy/lopepage-2";

const specifiersOf = (src: string): string[] => {
  const ast: any = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (n.type === "ImportExpression") {
      const s = n.source;
      if (s?.type === "Literal" && typeof s.value === "string") out.push(s.value);
      else if (s?.type === "NewExpression" && s.arguments?.[0]?.type === "Literal") out.push(s.arguments[0].value);
    }
    if (n.type === "ImportDeclaration" && typeof n.source?.value === "string") out.push(n.source.value);
    for (const k of Object.keys(n)) {
      const c = n[k];
      if (Array.isArray(c)) c.forEach(walk);
      else if (c && typeof c === "object" && c.type) walk(c);
    }
  };
  walk(ast);
  return out;
};

const pinOf = (spec: string) => new URL(spec, "https://api.observablehq.com/").searchParams.get("resolutions");
const pathOf = (spec: string) => new URL(spec, "https://api.observablehq.com/").pathname;

const fetchSpecs = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) return { url, status: r.status, specs: [] as string[] };
  return { url, status: r.status, specs: specifiersOf(await r.text()) };
};

const unpinned = await fetchSpecs(`https://api.observablehq.com/${SLUG}.js?v=4`);
const pinned = await fetchSpecs(`https://api.observablehq.com/${SLUG}.js?v=4&resolutions=${HOST_PIN}`);

console.log(`host pin: ${HOST_PIN}`);
console.log(`unpinned: HTTP ${unpinned.status}, ${unpinned.specs.length} imports`);
console.log(`pinned  : HTTP ${pinned.status}, ${pinned.specs.length} imports\n`);

const byPath = new Map<string, { un?: string; pin?: string }>();
for (const s of unpinned.specs) byPath.set(pathOf(s), { ...byPath.get(pathOf(s)), un: s });
for (const s of pinned.specs) byPath.set(pathOf(s), { ...byPath.get(pathOf(s)), pin: s });

let matches = 0, differs = 0;
for (const [p, { un, pin }] of byPath) {
  const a = un ? pinOf(un) : "(absent)", b = pin ? pinOf(pin) : "(absent)";
  const verdict = b === HOST_PIN ? "MATCHES HOST" : b === a ? "unchanged" : "changed";
  if (b === HOST_PIN) matches++; else differs++;
  console.log(`${p.padEnd(46)} unpinned=${String(a).padEnd(24)} pinned=${String(b).padEnd(24)} ${verdict}`);
}
console.log(`\n${matches} of ${byPath.size} imports resolve to the host's own pin under the pinned request; ${differs} do not.`);
