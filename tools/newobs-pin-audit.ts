// Audit which of our Observable notebooks still pin @mootari/access-runtime to a version
// that predates the notebook-kit `Mutable` fix (anything < @947 -> breaks on
// new.observablehq.com with "Cannot create property 'value' on number '0'").
//
// A notebook's own `resolutions` map overrides the version its IMPORTS would resolve, so a
// stale pin in ANY notebook on the path to @tomlarkworthy/runtime-sdk re-breaks the chain --
// fixing the pin in the notebook you are viewing is not enough.
//
//   bun tools/newobs-pin-audit.ts [slug ...]
const FIXED_FROM = 947; // @mootari/access-runtime version that added the duck-typed Mutable box

const DEFAULT_SLUGS = [
  "editor-5", "svg-lens", "runtime-sdk", "module-map", "visualizer", "modules",
  "observablejs-toolchain", "lopepage-urls", "cell-map", "fileattachments",
  "codemirror-6-v2", "dataflow-templating", "cells-to-clipboard", "observablehq-lezer",
  "reversible-attachment", "flow-queue", "exporter-3", "view", "themes", "tests",
  "local-storage-view", "dom-view", "stream-operators", "invoke-variable", "spectral-layout",
  "grid-container", "lopepage-2", "js-toolchain", "svg-lens-tools",
];

const slugs = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_SLUGS;

async function fetchDoc(slug: string, tries = 4): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`https://api.observablehq.com/document/@tomlarkworthy/${slug}`);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return undefined;
}

const stale: string[] = [];
for (const slug of slugs) {
  const doc = await fetchDoc(slug);
  if (doc === null) { console.log(`${slug.padEnd(24)} (not found)`); continue; }
  if (doc === undefined) { console.log(`${slug.padEnd(24)} (fetch failed)`); continue; }
  const pin = (doc.resolutions ?? []).find(
    (r: any) => r.specifier === "@mootari/access-runtime" || String(r.value).startsWith("e1c39d41e8e944b0")
  );
  if (!pin) { console.log(`${slug.padEnd(24)} v${doc.version}  no pin  (resolves latest)`); continue; }
  const v = Number(String(pin.value).split("@")[1] ?? NaN);
  const bad = Number.isFinite(v) && v < FIXED_FROM;
  if (bad) stale.push(slug);
  console.log(
    `${slug.padEnd(24)} v${doc.version}  access-runtime ${Number.isFinite(v) ? "@" + v : "unversioned"}  ${bad ? "*** STALE ***" : "ok"}`
  );
}

console.log(`\n${stale.length} notebook(s) still stale: ${stale.join(", ") || "-"}`);
console.log(
  stale.length
    ? "Fix: open each on observablehq.com -> Dependencies panel -> update the @mootari/access-runtime row only."
    : "All clear."
);
