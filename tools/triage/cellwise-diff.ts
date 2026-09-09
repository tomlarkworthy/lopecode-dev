// The "why" behind a cellwise line: prints the two sides of every cell it counts, so a
// divergence can be read rather than guessed at. Same extractor and same comparator as
// cellwise.ts — imported, never copied, so the two can't drift apart and disagree.
//
//   bun tools/triage/cellwise-diff.ts @tomlarkworthy/at-write lopecode
//   bun tools/triage/cellwise-diff.ts @tomlarkworthy/at-write modules/@tomlarkworthy/at-write.js
//
// The second argument is a repo name (compare its declared canonical) or a path to a
// working copy — the latter is how a merge in progress gets checked before it is synced.
import { loadCanonical, upstreamFor } from "../lope-sync.ts";
import { contentOf, parseModule, sameDef, sameInputs } from "./cellwise.ts";
import { readFileSync } from "fs";

const [mod, source] = process.argv.slice(2);
if (!mod || !source) {
  console.error("Usage: bun tools/triage/cellwise-diff.ts <@author/module> <lopecode|lopebooks|path.js>");
  process.exit(1);
}
const up = upstreamFor(mod);
if (up.kind === "none") { console.error(`${mod} declares no upstream — nothing to compare against.`); process.exit(1); }

const obs = parseModule(await (await fetch(`https://api.observablehq.com/${up.slug}.js?v=4`)).text());
const loc = parseModule(
  source.endsWith(".js") ? readFileSync(source, "utf8") : contentOf((loadCanonical() as any)[mod][source], mod)!
);

const base = (n: string) => n.replace(/^(viewof|mutable|initial) /, "");
const known = (n: string) =>
  loc.cells.has(n) || obs.cells.has(n) || loc.cells.has(base(n)) || obs.cells.has(base(n));

for (const [k, o] of obs.cells)
  if (!loc.cells.has(k)) console.log(`\n##### ONLY ON OBSERVABLE: ${k}  inputs=${JSON.stringify(o.inputs)}\n${o.def}`);
for (const [k, l] of loc.cells)
  if (!obs.cells.has(k)) console.log(`\n##### ONLY LOCAL: ${k}  inputs=${JSON.stringify(l.inputs)}\n${l.def}`);
for (const [k, o] of obs.cells) {
  const l = loc.cells.get(k);
  if (!l || (sameDef(l, o) && sameInputs(l, o, known))) continue;
  console.log(
    `\n##### DIFFER: ${k}${sameDef(l, o) ? " (deps only)" : ""}` +
    `\n--- observable inputs=${JSON.stringify(o.inputs)}\n${o.def}` +
    `\n--- local inputs=${JSON.stringify(l.inputs)}\n${l.def}`
  );
}

const impAbsent = [...obs.imports].filter((k) => !loc.imports.has(k));
const impExtra = [...loc.imports].filter((k) => !obs.imports.has(k));
if (impAbsent.length) console.log(`\n##### IMPORTS ONLY ON OBSERVABLE: ${impAbsent.join(", ")}`);
if (impExtra.length) console.log(`\n##### IMPORTS ONLY LOCAL: ${impExtra.join(", ")}`);
