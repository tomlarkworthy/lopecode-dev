// Round trip: the table re-nested equals the acorn AST on the corpus (and the synthetic sources), for both unions,
// up to the stated normalisations: loc becomes line (loc.start.line), extra is dropped, a field that is absent or
// undefined is null, a Literal's RegExp or bigint value is null. A control alters one table and must fail.
// Second part, on the AST of the checker sources: every read of a dropped field, every `.loc` read that is not
// `.loc.start.line` / `.loc?.start.line`, and every comparison of a member read with undefined (where absent → null
// changes the meaning; a port writes null there).
// Run: bun selfhost/flat-ast/roundtrip.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../lite/parse.ts";
import { flatten, SPECS } from "./adapter.ts";
import { corpus } from "./corpus.ts";
import { SYNTHETIC } from "./synthetic.ts";
import { CHECKER_FILES } from "./kinds.ts";
import CENSUS from "./out/census.json";

const ROOT = join(import.meta.dir, "../..");
const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";

// the acorn node as the table should hold it
function normal(n: any): any {
  const o: any = { type: n.type, start: n.start, end: n.end, line: n.loc.start.line };
  for (const k in n) {
    if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "extra") continue;
    const v = n[k];
    o[k] = isNode(v) ? normal(v) : Array.isArray(v) && v.every((x) => x === null || isNode(x)) ? v.map((x) => (x ? normal(x) : null))
      : v === undefined || v instanceof RegExp || typeof v === "bigint" ? null : v && typeof v === "object" ? { ...v } : v;
  }
  return o;
}
// the table re-nested; a spec field the acorn node lacked comes back as null, so `normal` gets them too (fill)
function renest(nodes: any[], i: number): any {
  const r = nodes[i];
  if (r.type === "Other") {
    const o: any = { type: r.kind, start: r.start, end: r.end, line: r.line };
    for (const f of r.fields) o[f.key] = f.list ? f.nodes.map((j: number | null) => (j === null ? null : renest(nodes, j))) : renest(nodes, f.nodes[0]);
    for (const p of r.props) o[p.key] = p.value;
    return o;
  }
  const o: any = {};
  for (const k in r) {
    if (k === "parent" || k === "field" || k === "after") continue;
    const v = r[k];
    const child = k !== "start" && k !== "end" && k !== "line" && k !== "type";
    o[k] = child && typeof v === "number" && isChildField(r.type, k) ? renest(nodes, v)
      : child && Array.isArray(v) && isChildField(r.type, k) ? v.map((j: number | null) => (j === null ? null : renest(nodes, j))) : v;
  }
  return o;
}
let spec: Record<string, { key: string; how: string }[]> = SPECS.a;
const isChildField = (t: string, k: string) => spec[t]?.some((f) => f.key === k && f.how !== "value") ?? false;
const fill = (o: any): any => {
  if (Array.isArray(o)) return o.map(fill);
  if (!o || typeof o !== "object" || typeof o.type !== "string") return o;
  const out: any = {};
  for (const f of spec[o.type] ?? []) if (!(f.key in o)) out[f.key] = f.how === "list" ? [] : null;
  for (const k in o) out[k] = fill(o[k]);
  return out;
};
// parent and field agree with where the node sits; a subtree is the rows i .. after-1
function parentsOk(nodes: any[]): boolean {
  for (let i = 1; i < nodes.length; i++) {
    const r = nodes[i], p = nodes[r.parent];
    if (!p || r.parent >= i || r.after <= i || r.after > p.after) return false;
    const held = p.type === "Other" ? p.fields.find((f: any) => f.key === r.field)?.nodes : [p[r.field]].flat();
    if (!held?.includes(i)) return false;
  }
  return true;
}

if (import.meta.main) {
  const inputs = [...corpus(), ...SYNTHETIC];
  for (const [name, s] of Object.entries(SPECS)) {
    spec = s;
    let same = 0, differ = 0, unparsed = 0, nodesN = 0, others = 0, parentBad = 0;
    const firstDiff: string[] = [];
    for (const c of inputs) {
      let P;
      try { P = parse(c.src, { jsx: c.tsx }); } catch { unparsed++; continue; }
      const nodes = flatten(P.program, s);
      nodesN += nodes.length;
      others += nodes.filter((r) => r.type === "Other").length;
      if (!parentsOk(nodes)) parentBad++;
      if (Bun.deepEquals(fill(normal(P.program)), renest(nodes, 0), true)) same++;
      else { differ++; if (firstDiff.length < 3) firstDiff.push(c.id); }
    }
    console.log(`union ${name}: ${inputs.length} inputs, ${unparsed} do not parse, ${same} round-trip equal, ${differ} differ ${firstDiff.join(", ")}; ${nodesN} nodes, ${others} Other rows; parent/field wrong in ${parentBad}`);
  }
  // identity: acorn objects reachable by two paths become two rows (Bun.deepEquals above cannot see this)
  {
    const shared = new Map<string, number>();
    let objects = 0;
    for (const c of inputs) {
      let P;
      try { P = parse(c.src, { jsx: c.tsx }); } catch { continue; }
      const seen = new Map<object, string>();
      const w = (n: any, path: string) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) { n.forEach((x, i) => w(x, path)); return; }
        if (typeof n.type !== "string") return;
        if (seen.has(n)) { const k = `${n.type} at ${seen.get(n)} and ${path}`; shared.set(k, (shared.get(k) ?? 0) + 1); return; }
        seen.set(n, path); objects++;
        for (const k in n) if (k !== "loc") w(n[k], `${n.type}.${k}`);
      };
      w(P.program, "root");
    }
    console.log(`node objects: ${objects}; reached by a second path: ${[...shared.values()].reduce((a, b) => a + b, 0)} ${[...shared].map(([k, v]) => `${k} ×${v}`).join("; ")}`);
  }
  // control: one altered row must fail the comparison
  spec = SPECS.a;
  {
    const c = corpus().find((x) => x.id.startsWith("lite/"))!;
    const P = parse(c.src, { jsx: c.tsx });
    const nodes = flatten(P.program, SPECS.a);
    const k = nodes.findIndex((r) => r.type === "MemberExpression");
    nodes[k] = { ...nodes[k], property: nodes[k].object };
    console.log(`control (${c.id}: MemberExpression #${k} property := object): round-trip equal = ${Bun.deepEquals(fill(normal(P.program)), renest(nodes, 0), true)}`);
  }

  // the checker sources, on their AST
  const walk = (n: any, f: (x: any, parent: any) => void, parent: any = null) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { for (const x of n) walk(x, f, parent); return; }
    if (typeof n.type !== "string") return;
    f(n, parent);
    for (const k in n) if (k !== "loc") walk(n[k], f, n);
  };
  const extraReads: string[] = [], locOther: string[] = [], undefCmp: string[] = [], nullCmp: string[] = [], inOps: string[] = [];
  let locLine = 0;
  // fields the census saw absent on some node: comparing one with null now also matches where acorn left it out
  const absent = new Set<string>();
  for (const e of Object.values(CENSUS as any) as any[]) for (const [k, ks] of Object.entries(e.fields) as any) if (ks.includes("absent")) absent.add(k);
  const { FILES: SURVEY_FILES } = await import("../checker-survey/inventory.ts");
  const files = [...new Set([...CHECKER_FILES, ...SURVEY_FILES])];
  for (const file of files) {
    const src = readFileSync(join(ROOT, file), "utf8");
    const P = parse(src);
    walk(P.program, (x, parent) => {
      if (x.type === "BinaryExpression" && x.operator === "in" && x.left.type === "Literal" && typeof x.left.value === "string") inOps.push(`${file}:${P.line(x.start)} ${src.slice(x.start, x.end)}`);
      if (x.type === "MemberExpression" && !x.computed && x.property.name === "extra") extraReads.push(`${file}:${P.line(x.start)}`);
      if (x.type === "MemberExpression" && !x.computed && x.property.name === "loc") {
        // x.loc . start . line
        const up = parent?.type === "MemberExpression" && parent.object === x && parent.property.name === "start" ? parent : null;
        if (up) locLine++; else locOther.push(`${file}:${P.line(x.start)} ${src.slice(x.start, x.end + 12)}`);
      }
      if (x.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(x.operator)) {
        for (const [a, b] of [[x.left, x.right], [x.right, x.left]]) {
          const m = a.type === "ChainExpression" ? a.expression : a;
          if (m.type === "MemberExpression" && b.type === "Identifier" && b.name === "undefined") undefCmp.push(`${file}:${P.line(x.start)} ${src.slice(x.start, x.end)}`);
          if (m.type === "MemberExpression" && !m.computed && absent.has(m.property.name) && b.type === "Literal" && b.value === null) nullCmp.push(`${file}:${P.line(x.start)} ${src.slice(x.start, x.end)}`);
        }
      }
    });
  }
  console.log(`member reads of a field the census saw absent, compared with null (absent → null makes these true where acorn left the field out): ${nullCmp.length}`);
  for (const u of nullCmp) console.log(`  ${u}`);
  console.log(`"key" in x tests: ${inOps.length}`);
  for (const u of inOps) console.log(`  ${u}`);
  console.log(`files scanned (lite/*.ts and the survey's FILES): ${files.length}; reads of .extra: ${extraReads.length}; .loc.start reads: ${locLine}; other .loc reads: ${locOther.length} ${locOther.join("; ")}`);
  console.log(`member reads compared with undefined (absent → null changes these): ${undefCmp.length}`);
  for (const u of undefCmp) console.log(`  ${u}`);
}
