// M2 static: every shipped SoundScript section (ts-cells.ts SS_SOURCES, checked as sectionCheck checks it) under the
// switches in the environment; per own cell its verdict and its conversion sites, each site classed as removable when
// nothing writes the converted local after it (TypeScript AST; a write = assignment/update/delete through it, or a call
// of a mutating method name on it; approximate: by name within the cell, a loop around the site counts as "after").
// bun m2-static.ts > out/m2-<mode>.json
import ts from "typescript";
import { PROTO } from "./tree/lite/proto-flags.ts";
import { checkSources } from "./tree/lite/core.ts";
import { SS_SOURCES, sectionSource } from "./tree/lite/soundscript/ts-cells.ts";

const MUTATORS = new Set(["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin", "set", "add", "delete", "clear"]);
const isLoop = (n: ts.Node) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n);
const isFn = (n: ts.Node) => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n);
function writes(id: ts.Identifier): boolean {
  const p = id.parent;
  if (ts.isBinaryExpression(p) && p.left === id && p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) return true;
  if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === id) {
    const g = p.parent;
    if (ts.isBinaryExpression(g) && g.left === p && g.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && g.operatorToken.kind <= ts.SyntaxKind.LastAssignment) return true;
    if (ts.isPrefixUnaryExpression(g) || ts.isPostfixUnaryExpression(g) || ts.isDeleteExpression(g)) return true;
    if (ts.isCallExpression(g) && g.expression === p && ts.isPropertyAccessExpression(p) && MUTATORS.has(p.name.text)) return true;
  }
  return false;
}
const units = new Map<string, string>();
for (const f of SS_SOURCES) { const u = sectionSource(f).unit; if (!units.has(u)) units.set(u, f); }
const out: any[] = [];
for (const [unit, file] of units) {
  const { src, ownFrom, shell } = sectionSource(file);
  PROTO.sites = []; PROTO.nonRet.clear();
  let r: any;
  try { r = checkSources({ cells: src, tsx: true, shell } as any); } catch (x) { out.push({ unit, crash: String((x as Error).message) }); continue; }
  const sites = PROTO.sites; PROTO.sites = null;
  const sf = ts.createSourceFile("s.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = new Map<string, ts.Node>(); const ids: ts.Identifier[] = [];
  const walk = (n: ts.Node) => { const k = `${n.getStart(sf)}:${n.end}`; if (!nodes.has(k)) nodes.set(k, n); if (ts.isIdentifier(n)) ids.push(n); ts.forEachChild(n, walk); };
  walk(sf);
  const facts: Map<string, any> = r.facts;
  const spanOf = (name: string) => facts?.get(name)?.span as [number, number] | undefined;
  const removable = (name: string, at: number, end: number, cell: [number, number]): boolean => {
    const site = nodes.get(`${at}:${end}`);
    let loop: ts.Node | undefined;
    for (let p = site?.parent; p; p = p.parent) { if (isFn(p) && p.pos <= cell[0]) break; if (isLoop(p)) { loop = p; break; } }
    return !ids.some((i) => i.text === name && i.getStart(sf) >= cell[0] && i.end <= cell[1] && (i.getStart(sf) >= end || (loop && i.getStart(sf) >= loop.getStart(sf) && i.end <= loop.end)) && writes(i));
  };
  const seen = new Set<string>();
  for (const c of r.cells) {
    const sp = spanOf(c.name);
    if (!sp || sp[0] < ownFrom) continue;
    const cs = sites.filter((s) => s.start >= sp[0] && s.end <= sp[1]).filter((s) => { const k = `${s.kind[1]}:${s.start}:${s.end}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const rows = cs.map((s) => {
      const n = nodes.get(`${s.start}:${s.end}`);
      const names = s.kind.startsWith("R3") ? s.names ?? [] : n && ts.isIdentifier(n) ? [n.text] : n && ts.isShorthandPropertyAssignment(n) ? [n.name.text] : [];
      const fresh = !s.kind.startsWith("R3") && !!n && (ts.isArrayLiteralExpression(n) || ts.isObjectLiteralExpression(n) || ts.isNewExpression(n));
      const rem = fresh || (names.length > 0 && names.every((x) => removable(x, s.start, s.end, sp)));
      const line = src.slice(0, s.start).split("\n").length - src.slice(0, sp[0]).split("\n").length + 1;
      return { kind: s.kind, text: src.slice(s.start, s.end).slice(0, 80), names, removable: rem, fresh, lineInCell: line };
    });
    out.push({ unit, cell: c.name, status: c.status, errors: c.errors.map((e: any) => `${e.rule}: ${e.msg.slice(0, 120)}`), sites: rows, src: src.slice(sp[0], sp[1]).slice(0, 4000) });
  }
}
console.log(JSON.stringify(out));
process.exit(0);
