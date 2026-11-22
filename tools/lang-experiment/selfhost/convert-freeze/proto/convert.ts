// convert-freeze prototype compile step: the checker's conversion sites (tree/lite/proto-sites.ts) as ss_f insertions.
// R2 site e -> ss_f(e) (shorthand {m} -> {m: ss_f(m)}); R3 kept function f capturing Mut a, b -> (ss_f(a), ss_f(b), f);
// R3m (a method) wraps its object literal; R3d (a function declaration) puts `;ss_f(a);` after the declaration.
// Nodes are found on the TypeScript AST by span, not by text matching.
import ts from "typescript";
import type { Site } from "./tree/lite/proto-flags.ts";

type Edit = { pos: number; text: string; open: boolean; len: number };
export type Unplaced = { site: Site; why: string };

export function rewrite(src: string, sites: Site[], tsx: boolean): { out: string; unplaced: Unplaced[]; placed: number } {
  const sf = ts.createSourceFile("cells.tsx", src, ts.ScriptTarget.Latest, true, tsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const bySpan = new Map<string, ts.Node[]>();
  const walk = (n: ts.Node) => { const k = `${n.getStart(sf)}:${n.end}`; (bySpan.get(k) ?? bySpan.set(k, []).get(k)!).push(n); ts.forEachChild(n, walk); };
  walk(sf);
  const edits: Edit[] = [], unplaced: Unplaced[] = [];
  let placed = 0;
  const wrap = (s: number, e: number, a: string, b: string) => { edits.push({ pos: s, text: a, open: true, len: e - s }, { pos: e, text: b, open: false, len: e - s }); placed++; };
  for (const site of sites) {
    const ns = bySpan.get(`${site.start}:${site.end}`);
    if (!ns || !ns.length) { unplaced.push({ site, why: "no TypeScript node with this span" }); continue; }
    const n = ns[0]!;
    const conv = (site.names ?? []).map((x) => `ss_f(${x}${(site as any).label ? ", " + JSON.stringify((site as any).label) : ""}), `).join("");
    if (site.kind.startsWith("R2")) {
      if (n.parent && ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n) wrap(site.start, site.end, `${n.getText(sf)}: ss_f(`, ")");
      else if (ts.isShorthandPropertyAssignment(n)) wrap(site.start, site.end, `${n.name.getText(sf)}: ss_f(`, ")");
      else wrap(site.start, site.end, "ss_f(", (site as any).label ? `, ${JSON.stringify((site as any).label)})` : ")");
    } else if (site.kind === "R3d" && (globalThis as any).__ssProto?.H) {
      for (const name of site.names ?? []) {
        let init: ts.Expression | undefined;
        for (let p: ts.Node | undefined = n.parent; p && !init; p = p.parent) {
          const stmts = ts.isBlock(p) || ts.isSourceFile(p) ? p.statements : null;
          if (!stmts) continue;
          for (const s of stmts) if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer) init = d.initializer;
        }
        if (init) wrap(init.getStart(sf), init.end, "ss_f(", ")");
        else { edits.push({ pos: site.end, text: `;ss_f(${name});`, open: false, len: -1 }); unplaced.push({ site, why: `H: no initialiser found for ${name}; converted after the declaration` }); }
      }
    } else if (site.kind === "R3d") {
      edits.push({ pos: site.end, text: `;${(site.names ?? []).map((x) => `ss_f(${x});`).join("")}`, open: false, len: -1 });
      placed++;
    } else wrap(site.start, site.end, `(${conv}`, ")");
  }
  // same position: closes before opens; outer opens first, inner closes first
  edits.sort((a, b) => a.pos - b.pos || (a.open === b.open ? (a.open ? b.len - a.len : a.len - b.len) : a.open ? 1 : -1));
  let out = "", at = 0;
  for (const e of edits) { out += src.slice(at, e.pos) + e.text; at = e.pos; }
  out += src.slice(at);
  return { out, unplaced, placed };
}
