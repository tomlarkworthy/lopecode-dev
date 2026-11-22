// bun audit.ts: sizes classes C and N over the prototype's INTRINSIC_DECLS, on the TypeScript AST of the declaration
// text, then measures each candidate on the real JS intrinsic.
// C: every function-typed parameter (a callback). Measured: how many arguments the real method passes, and whether an
//    argument past the declared ones is the receiver (or a container of it).
// N: every parameter of a member not marked @retains whose type is a type parameter (bare, rest, or in a union) that
//    also occurs in the result type. Measured: whether the result holds the argument object itself.
import ts from "typescript";
import { INTRINSIC_DECLS } from "../proto/tree/lite/intrinsics.ts";

const sf = ts.createSourceFile("decls.ts", INTRINSIC_DECLS, ts.ScriptTarget.Latest, true);
type M = { owner: string; static: boolean; name: string; tags: Set<string>; node: ts.SignatureDeclarationBase };
const members: M[] = [];
const tagsOf = (n: ts.Node) => new Set(ts.getJSDocTags(n).map((t) => t.tagName.text));
const visitMembers = (owner: string, isStatic: boolean, ms: ts.NodeArray<ts.TypeElement>) => {
  for (const m of ms) {
    if (ts.isMethodSignature(m)) members.push({ owner, static: isStatic, name: m.name.getText(sf), tags: tagsOf(m), node: m });
    else if (ts.isConstructSignatureDeclaration(m)) members.push({ owner, static: isStatic, name: "new", tags: tagsOf(m), node: m });
    else if (ts.isCallSignatureDeclaration(m)) members.push({ owner, static: isStatic, name: "()", tags: tagsOf(m), node: m });
  }
};
for (const s of sf.statements) {
  if (ts.isInterfaceDeclaration(s)) visitMembers(s.name.text, false, s.members);
  else if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) { if (d.type && ts.isTypeLiteralNode(d.type)) visitMembers(d.name.getText(sf), true, d.type.members); }
  else if (ts.isFunctionDeclaration(s) && s.name) members.push({ owner: "global", static: true, name: s.name.text, tags: tagsOf(s), node: s });
}
const typeParamsIn = (t: ts.Node | undefined, names: Set<string>, out = new Set<string>()) => {
  if (!t) return out;
  if (ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName) && names.has(t.typeName.text)) out.add(t.typeName.text);
  ts.forEachChild(t, (c) => void typeParamsIn(c, names, out));
  return out;
};
// a parameter whose value itself may be a T: T, T | X, ...xs: T[]
const bareTP = (p: ts.ParameterDeclaration, names: Set<string>): string | null => {
  let t = p.type;
  if (!t) return null;
  if (p.dotDotDotToken && ts.isArrayTypeNode(t)) t = t.elementType;
  const one = (x: ts.TypeNode): string | null => ts.isTypeReferenceNode(x) && ts.isIdentifier(x.typeName) && names.has(x.typeName.text) ? x.typeName.text : null;
  if (ts.isUnionTypeNode(t)) { for (const u of t.types) { const r = one(u); if (r) return r; } return null; }
  return one(t);
};

const ownerTP = new Map<string, string[]>();
for (const s of sf.statements) if (ts.isInterfaceDeclaration(s)) ownerTP.set(s.name.text, (s.typeParameters ?? []).map((t) => t.name.text));

// receivers and globals for the measurement
const marker = () => ({ marker: 1 });
const recvFor = (owner: string, el: unknown): any => {
  if (owner === "Array") return [el, el];
  if (owner === "Map") return new Map([["k", el]]);
  if (owner === "Set") return new Set([el]);
  if (owner === "Promise") return Promise.resolve(el);
  if (/Array$/.test(owner) && owner !== "Array") return new (globalThis as any)[owner](2);
  return null;
};
const callbacks: string[] = [], nRows: string[] = [];
let cTotal = 0, cExtra = 0, cRecv = 0, nCand = 0, nKeeps = 0;
const deepHas = (v: any, target: object, d = 0, seen = new Set()): boolean => {
  if (v === target) return true;
  if (!v || typeof v !== "object" || d > 4 || seen.has(v)) return false;
  seen.add(v);
  if (v instanceof Map) return [...v].some(([a, b]) => deepHas(a, target, d + 1, seen) || deepHas(b, target, d + 1, seen));
  if (v instanceof Set) return [...v].some((a) => deepHas(a, target, d + 1, seen));
  return Object.values(v).some((x) => deepHas(x, target, d + 1, seen));
};
const sampleArg = (p: ts.ParameterDeclaration, tps: Set<string>, m: object): unknown => {
  const t = p.type?.getText(sf) ?? "unknown";
  if (p.dotDotDotToken) return m;
  if (/^number\b/.test(t)) return 0;
  if (/^string\b/.test(t)) return "a";
  if (/^\(/.test(t)) return (...a: unknown[]) => a[0];
  if (/Iterable<readonly \[/.test(t) || /Iterable<\[/.test(t)) return [["k", m]];
  if (/Iterable|\[\]|ArrayLike/.test(t)) return [m];
  if (/\{ readonly \[k: string\]/.test(t)) return { k: m };
  return m;
};
const globalOf = (owner: string): any => owner === "global" ? globalThis : (globalThis as any)[owner];
for (const m of members) {
  const n = m.node;
  const tps = new Set([...(n.typeParameters ?? []).map((t) => t.name.text), ...(m.static ? [] : ownerTP.get(m.owner) ?? [])]);
  // C
  n.parameters.forEach((p, pi) => {
    if (!p.type || !ts.isFunctionTypeNode(p.type)) return;
    cTotal++;
    const declared = p.type.parameters.length;
    let got = "-", recvSeen = false;
    const el = marker(), recv = recvFor(m.owner, el);
    if (recv && !m.static) {
      let max = 0;
      const probe = (...a: unknown[]) => { max = Math.max(max, a.length); if (a.slice(declared).some((x) => x === recv || deepHas(x, recv))) recvSeen = true; return m.name === "reduce" ? a[0] : m.name === "sort" || m.name === "toSorted" ? 0 : true; };
      const args = n.parameters.map((q, qi) => qi === pi ? probe : sampleArg(q, tps, marker()));
      try { const r = (recv as any)[m.name](...args); if (r instanceof Promise) r.catch(() => {}); } catch (x) { got = `throws ${(x as Error).message}`; }
      if (m.owner === "Promise") got = "async (not measured)"; else if (got === "-") got = String(max);
    } else if (m.static) {
      let max = 0;
      const probe = (...a: unknown[]) => { max = Math.max(max, a.length); return a[0]; };
      const src = [marker()];
      const args = n.parameters.map((q, qi) => qi === pi ? probe : sampleArg(q, tps, src));
      try { globalOf(m.owner)[m.name](...args); got = String(max); } catch (x) { got = `throws ${(x as Error).message.slice(0, 40)}`; }
    }
    const extra = /^\d+$/.test(got) && Number(got) > declared;
    if (extra) cExtra++;
    if (recvSeen) cRecv++;
    callbacks.push(`${m.owner}${m.static ? "." : "#"}${m.name} param ${pi}: declared ${declared} args, real ${got}${recvSeen ? ", an extra argument is the receiver" : ""}`);
  });
  // N
  if (m.tags.has("retains")) continue;
  const resTPs = typeParamsIn(n.type, tps);
  n.parameters.forEach((p, pi) => {
    const tp = bareTP(p, tps);
    if (!tp || !resTPs.has(tp)) return;
    nCand++;
    const arg = marker();
    let keeps = "not measured";
    try {
      const args = n.parameters.map((q, qi) => qi === pi ? arg : sampleArg(q, tps, marker()));
      let r: any;
      if (m.static) r = m.name === "new" ? new (globalOf(m.owner))(...args) : globalOf(m.owner)[m.name](...args);
      else { const recv = recvFor(m.owner, marker()); r = m.name === "reduce" ? recv.reduce((acc: unknown) => acc, arg) : recv[m.name](...args); }
      if (r instanceof Promise) keeps = "async"; else keeps = deepHas(r, arg) ? "KEEPS the argument" : "does not keep it";
    } catch (x) { keeps = `throws ${(x as Error).message.slice(0, 50)}`; }
    if (keeps.startsWith("KEEPS")) nKeeps++;
    nRows.push(`${m.owner}${m.static ? "." : "#"}${m.name} param ${pi} (${p.getText(sf)}) -> ${n.type?.getText(sf)}: ${keeps}`);
  });
}
console.log(`== C: ${cTotal} callback parameters over ${members.length} members; ${cExtra} get more arguments than declared; in ${cRecv} an extra argument is the receiver`);
for (const l of callbacks) console.log("  " + l);
console.log(`== N: ${nCand} non-@retains parameters whose type parameter reaches the result; ${nKeeps} keep the argument itself`);
for (const l of nRows) console.log("  " + l);
