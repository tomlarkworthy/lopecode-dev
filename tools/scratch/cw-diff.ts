// Full per-cell diff of a canonical against ObservableHQ, using cellwise's own extractor
// and its comparator, so what it prints is exactly what cellwise counts.
import { loadCanonical, upstreamFor } from "../lope-sync.ts";
import { cells, contentOf, sameDef, sameInputs } from "../triage/cellwise.ts";
import { readFileSync } from "fs";
const [mod, repo] = process.argv.slice(2);
const obs = cells(await (await fetch(`https://api.observablehq.com/${upstreamFor(mod).slug}.js?v=4`)).text());
// second arg is a repo name, or a path to a working copy
const loc = repo.endsWith(".js")
  ? cells(readFileSync(repo, "utf8"))
  : cells(contentOf((loadCanonical() as any)[mod][repo], mod)!);
const known = (n: string) => { const b = n.replace(/^(viewof|mutable|initial) /, ""); return loc.has(n) || obs.has(n) || loc.has(b) || obs.has(b); };
for (const [k, o] of obs) if (!loc.has(k)) console.log(`\n##### ONLY ON OBSERVABLE: ${k}  inputs=${JSON.stringify(o.inputs)}\n${o.def}`);
for (const [k, l] of loc) if (!obs.has(k)) console.log(`\n##### ONLY LOCAL: ${k}  inputs=${JSON.stringify(l.inputs)}\n${l.def}`);
for (const [k, o] of obs) {
  const l = loc.get(k);
  if (!l || (sameDef(l, o) && sameInputs(l, o, known))) continue;
  console.log(`\n##### DIFFER: ${k}${sameDef(l, o) ? " (deps only)" : ""}\n--- observable inputs=${JSON.stringify(o.inputs)}\n${o.def}\n--- local inputs=${JSON.stringify(l.inputs)}\n${l.def}`);
}
