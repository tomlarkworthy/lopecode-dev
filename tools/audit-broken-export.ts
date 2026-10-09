// Offline test of the placeholder theory: if the host's populated toolchain was named
// "<unknown 0.…>", the broken export should carry its 200-odd cells under that garbage id while
// the real slug block is the empty stub. Parse blocks, report ids, $def counts, and who defines
// toolchain's signature cells. (Previous inline awk died on zsh quoting -- nothing was measured.)
const path = process.argv[2] ?? "scratch/@tomlarkworthy_exporter-3_20260924T024420Z.html";
const html = await Bun.file(path).text();
console.log(`artifact ${path}  ${html.length} bytes`);
const re = /<script id="([^"]*)"([^>]*)>([\s\S]*?)<\/script>/g;
const blocks: { id: string; bytes: number; defs: number; names: string[] }[] = [];
let m;
while ((m = re.exec(html))) {
  const body = m[3];
  const names = [...body.matchAll(/\$def\("[^"]*",\s*"([^"]+)"/g)].map(x => x[1]);
  blocks.push({ id: m[1], bytes: body.length, defs: (body.match(/\$def\(/g) || []).length, names });
}
console.log(`\n${blocks.length} script blocks`);
const odd = blocks.filter(b => /unknown/i.test(b.id) || /^d\//.test(b.id) || /^\d+$/.test(b.id));
console.log(`\n=== oddly-named blocks (unknown / d\/… / integer): ${odd.length}`);
for (const b of odd) console.log(`  ${JSON.stringify(b.id).padEnd(34)} ${String(b.bytes).padStart(7)}B  $def=${String(b.defs).padStart(4)}  e.g. ${b.names.slice(0, 6).join(", ")}`);
console.log(`\n=== the three suspect slugs`);
for (const slug of ["@tomlarkworthy/observablejs-toolchain", "@tomlarkworthy/editor-5", "@tomlarkworthy/dataflow-templating"]) {
  const b = blocks.find(x => x.id === slug);
  console.log(`  ${slug.padEnd(40)} ${b ? `${b.bytes}B  $def=${b.defs}` : "ABSENT"}`);
}
console.log(`\n=== who defines toolchain's signature cells?`);
for (const sym of ["observableToJs", "decompile", "compile", "allCells", "cellMaps"]) {
  const owners = blocks.filter(b => b.names.includes(sym)).map(b => `${b.id} ($def=${b.defs})`);
  console.log(`  ${sym.padEnd(16)} -> ${owners.length ? owners.join(" | ") : "(defined nowhere)"}`);
}
console.log(`\n=== 12 biggest blocks`);
for (const b of [...blocks].sort((a, b) => b.defs - a.defs).slice(0, 12))
  console.log(`  ${b.id.padEnd(44)} ${String(b.bytes).padStart(8)}B  $def=${String(b.defs).padStart(4)}`);
