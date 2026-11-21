// bun selfhost/typed-imports/probes.ts [--show]: every probe program checked as one program (ti cells); each
// expected verdict and message compared; for a probe's `today` modules, the module's check compared with the shipped
// checkSources of it alone, its imports cells in another language.
import { checkSources } from "../../lite/core.ts";
import { checkProgram, toLite } from "./ti-link.ts";
import { PROBES, type Probe } from "./probes-data.ts";
import type { TiModResult, TiSources } from "./ti-types.ss.ts";

const verdictOf = (r: TiModResult, cell: string): string => {
  const c = r.result.cells.find((x) => x.name === cell);
  if (!c) return "missing";
  if (c.status === "rejected") return `rejected ${[...new Set(c.errors.map((e) => e.rule))].join(",")}`;
  if (c.status === "blocked") return `blocked ${c.blockedBy.join(",")}`;
  return c.status;
};
const outsideOf = (m: Probe["mods"][number]) => [...(m.js ?? []).map((n) => ({ name: n, view: false })), ...(m.imports ?? []).map(([l]) => ({ name: l, view: false }))];
const strip = (r: any) => JSON.stringify({ ok: r.ok, module: r.module, cells: r.cells, facts: [...(r.facts?.values() ?? [])] });

export function runProbe(p: Probe) {
  const notSs = new Set(p.mods.filter((m) => m.notSs).map((m) => m.name));
  const after = (_S: TiSources, r: TiModResult) => (notSs.has(r.name) ? { ...r, ss: false, why: "marked another language" } : r);
  const P = checkProgram(p.mods.map((m) => ({ name: m.name, cells: m.cells, outside: (m.js ?? []).map((n) => ({ name: n, view: false })), imports: (m.imports ?? []).map(([local, imported, from]) => ({ local, imported, from, view: false })) })), after);
  const got: Record<string, string> = {}, bad: string[] = [];
  for (const [k, want] of Object.entries(p.expect)) {
    const [mod, cell] = k.split(".") as [string, string | undefined];
    const r = P.modules.get(mod);
    const v = !r ? "no module" : cell === undefined ? `module ${[...new Set(r.result.module.map((e) => e.rule))].join(",")}` : verdictOf(r, cell);
    got[k] = v;
    if (v !== want) bad.push(`${k}: expected "${want}", got "${v}"`);
  }
  for (const [k, msg] of Object.entries(p.msg ?? {})) {
    const [mod, cell] = k.split(".") as [string, string | undefined];
    const r = P.modules.get(mod);
    const msgs = !r ? [] : cell === undefined ? r.result.module.map((e) => e.msg) : (r.result.cells.find((c) => c.name === cell)?.errors ?? []).map((e) => e.msg);
    if (!msgs.includes(msg)) bad.push(`${k}: no message "${msg}" in ${JSON.stringify(msgs)}`);
  }
  for (const name of p.today ?? []) {
    const m = p.mods.find((x) => x.name === name)!;
    const shipped = strip(checkSources({ cells: m.cells, tsx: true, outside: outsideOf(m) }));
    const mine = strip(toLite(P.modules.get(name)!.result));
    if (shipped !== mine) bad.push(`${name}: differs from today's check\n    today ${shipped.slice(0, 400)}\n    ti    ${mine.slice(0, 400)}`);
  }
  return { P, got, bad };
}

if (import.meta.main) {
  const show = process.argv.includes("--show");
  let ok = 0;
  const byCat = new Map<string, [number, number]>();
  const t0 = performance.now();
  for (const p of PROBES) {
    const { P, bad } = runProbe(p);
    const c = byCat.get(p.cat) ?? [0, 0];
    c[1]++;
    if (!bad.length) { ok++; c[0]++; } else console.log(`SURPRISE ${p.id}\n  ${bad.join("\n  ")}`);
    byCat.set(p.cat, c);
    if (show) for (const n of P.order) { const r = P.modules.get(n)!; console.log(`  ${p.id} ${n}${r.ss ? "" : " (another language)"} module=${JSON.stringify(r.result.module.map((e) => `[${e.rule}] ${e.msg}`))}`); for (const c of r.result.cells) console.log(`    ${c.name} ${c.status} ${JSON.stringify(c.errors.map((e) => `[${e.rule}] ${e.msg}`))} ${c.blockedBy.join(",")}`); }
  }
  console.log(`probes ${PROBES.length}: as expected ${ok}, surprises ${PROBES.length - ok}; ${(performance.now() - t0).toFixed(0)} ms`);
  console.log([...byCat].map(([k, [a, b]]) => `${k} ${a}/${b}`).join(", "));
}
