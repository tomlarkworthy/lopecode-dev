// bun --preload ./redirect.ts <shipped test>: the shipped tests run unmodified against this folder's shells.
// SHELLS=events,pool,store picks which shipped shell files become a re-export of the copy here.
// STEP_TRACE=<file> makes lite/runtime-ss.ts a re-export whose step and poolStep append each event and the
// effects it gave to <file>, one JSON line each; objects that are not plain data are named #<kind><n> by first use.
import { plugin } from "bun";
import { appendFileSync, writeFileSync } from "node:fs";

const LITE = new URL("../../lite/", import.meta.url).pathname, HERE = import.meta.dir;
const SHELLS: Record<string, [string, string]> = {
  events: [`${LITE}browser/cells.ts`, `${HERE}/events-shell.ts`],
  pool: [`${LITE}browser/workers.ts`, `${HERE}/pool-shell.ts`],
  store: [new URL("../../prelude.runtime.ts", import.meta.url).pathname, `${HERE}/store-shell.ts`],
};
const chosen = (process.env.SHELLS ?? "").split(",").filter(Boolean);
const map = new Map<string, string>();
for (const k of chosen) {
  const s = SHELLS[k];
  if (!s) throw new Error(`SHELLS: no shell ${k}`);
  map.set(s[0], s[1]);
}
const TRACE = process.env.STEP_TRACE;
if (TRACE) {
  writeFileSync(TRACE, "");
  map.set(`${LITE}runtime-ss.ts`, `${HERE}/trace/runtime-ss.traced.ts`);
}
console.error(`redirect: ${[...map.values()].map((p) => p.slice(HERE.length + 1)).join(", ") || "nothing"}`);
plugin({
  name: "effect-runner-redirect",
  setup(build) {
    // onLoad must return contents for every path its filter matches: the filter is the exact paths
    const exact = [...map.keys()].map((p) => `^${p.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`).join("|");
    if (exact) build.onLoad({ filter: new RegExp(exact) }, (args) => ({ contents: `export * from ${JSON.stringify(map.get(args.path))};`, loader: "ts" }));
  },
});
if (TRACE) {
  // the trace's sha256 and counts; STEP_TRACE_FULL=1 also writes every line to <file>.lines
  const full = process.env.STEP_TRACE_FULL === "1" ? `${TRACE}.lines` : null;
  if (full) writeFileSync(full, "");
  const hash = new Bun.CryptoHasher("sha256"), counts: Record<string, number> = {};
  let lines = 0, buf: string[] = [];
  const bump = (k: string) => void (counts[k] = (counts[k] ?? 0) + 1);
  (globalThis as any).__stepTrace = (line: string, tag: string, t: string, fxs: readonly string[]) => {
    hash.update(line + "\n"); lines++;
    bump(`step ${tag}`); bump(`${tag} event ${t}`);
    for (const f of fxs) bump(`${tag} effect ${f}`);
    if (full) { buf.push(line); if (buf.length > 5000) { appendFileSync(full, buf.join("\n") + "\n"); buf = []; } }
  };
  process.on("exit", () => {
    if (full && buf.length) appendFileSync(full, buf.join("\n") + "\n");
    writeFileSync(TRACE, JSON.stringify({ lines, sha256: hash.digest("hex"), counts: Object.fromEntries(Object.entries(counts).sort()) }, null, 1) + "\n");
  });
}
