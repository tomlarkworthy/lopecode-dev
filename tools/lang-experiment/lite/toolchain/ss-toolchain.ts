// ss_toolchain: SoundScript cells <-> Lopecode runtime variables.
// A compiled cell is ordinary JS whose first comment is /*{lang:"ss"}*/. The typed source is kept in
// it (types as /*ss:...*/ comments, JSX as /*ss<...*/, the text around the function in a /*ss^{...}*/
// header), so decompile recovers the cell exactly from the variable's definition text.
import * as acorn from "acorn";
import { parse, type Node } from "../parse.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { cellsOf } from "../browser/run.ts";
import { commentTypes, uncommentTypes, langOf, LANG } from "./comment-types.ts";

export type Variable = { name: string; inputs: string[]; definition: string };
export { langOf, LANG };

const SS = "$ss$"; // wrapper parameter bound to the stdlib runtime object
export const STDLIB_INPUT = "ss";
const PRELUDE = ["ref", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "h"];
// Capability parameter -> the variable the stdlib provides. invalidation is the runtime's own.
export const CAP_INPUTS: Record<string, string> = { now: "ss_now", random: "ss_random", fetch: "ss_fetch", log: "ss_log", invalidation: "invalidation" };
const PROJECTION = "/*ss@ref*/";

const header = (o: object) => `/*ss^${JSON.stringify(o).replaceAll("*/", "*\\/")}*/`;

function reserved(text: string) {
  for (const m of ["/*ss", LANG, "*\\/"]) if (text.includes(m)) throw new Error(`cell source contains the reserved text ${m}`);
}

// Split a SoundScript file into cell texts (leading comments included), in order.
export function splitCells(src: string, tsx: boolean): string[] {
  const P = parse(src, { jsx: tsx });
  const out: string[] = [];
  let end = 0;
  for (const st of P.program.body as Node[]) {
    const lead = P.leading(st);
    const start = lead.length ? lead[0].start : st.start;
    out.push(src.slice(start, st.end));
    end = st.end;
  }
  if (P.comments.some((c) => c.start >= end)) throw new Error("a comment after the last cell has no cell to belong to");
  return out;
}

const identifiers = (n: Node, acc = new Set<string>()): Set<string> => {
  if (!n || typeof n !== "object") return acc;
  if (n.type === "Identifier") acc.add(n.name);
  for (const k in n) {
    if (k === "loc") continue;
    const v = (n as any)[k];
    if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === "string" && identifiers(x, acc));
    else if (v && typeof v.type === "string") identifiers(v, acc);
  }
  return acc;
};

export function compileCell(text: string, tsx: boolean): Variable[] {
  reserved(text);
  const P = parse(text, { jsx: tsx });
  if (P.program.body.length !== 1) throw new Error("a cell is exactly one top-level statement");
  const st: Node = P.program.body[0];
  const d: Node | null = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  if (d && /^TS(TypeAlias|Interface)Declaration$/.test(d.type)) {
    return [{ name: `type ${d.id.name}`, inputs: [], definition: `() => ${LANG}${header({ d: text })}undefined` }];
  }
  let fn: Node | null = null;
  if (st.type === "ExportNamedDeclaration" && d?.type === "FunctionDeclaration") fn = d;
  else if (st.type === "ExportNamedDeclaration" && d?.type === "VariableDeclaration" && d.declarations.length === 1 &&
    /^(Arrow)?FunctionExpression$/.test(d.declarations[0].init?.type ?? "")) fn = d.declarations[0].init;
  if (!fn) throw new Error(`unsupported top-level statement (${st.type}); a cell is an exported function`);

  const info = cellsOf(tsx ? lowerJsx(text) : text)[0];
  if (!info) throw new Error("not a cell");
  for (const p of info.params) {
    if (p.sourceTyped) throw new Error(`${info.name}: Source parameters are not supported by ss_toolchain yet`);
    if (p.name === "pool" || p.name === "compile") throw new Error(`${info.name}: the ${p.name} capability is not supported by ss_toolchain yet`);
  }
  if (info.compiles.length) throw new Error(`${info.name}: compile(...) is not supported by ss_toolchain yet`);

  // an anonymous function* (...) is not a statement, so each pass sees the function as an expression
  const asExpr = (f: (s: string) => string, s: string) => f(`(${s})`).slice(1, -1);
  const fnSrc = text.slice(fn.start, fn.end);
  const lowered = tsx ? asExpr((s) => lowerJsx(s, { keep: true }), fnSrc) : fnSrc;
  const typed = asExpr(commentTypes, lowered);
  const params = info.params.map((p) => p.name);
  const used = [...identifiers(parse(`(${lowered})`).program)].filter((n) => PRELUDE.includes(n) && !params.includes(n));
  const inputs = [STDLIB_INPUT, ...info.params.map((p) => (p.refTyped ? `ref ${p.name}` : CAP_INPUTS[p.name] ?? p.name))];
  const kind = info.returnsRef ? "ref" : "cell";
  const inner = `${LANG}${header({ h: text.slice(0, fn.start), t: text.slice(fn.end) })}${typed}`;
  const destructure = used.length ? `const {${used.join(", ")}} = ${SS}; ` : "";
  const definition = `(${[SS, ...params].join(", ")}) => { ${destructure}return ${SS}.cell(${inner}, ${JSON.stringify(kind)}, ${JSON.stringify(info.name)}, [${params.join(", ")}]); }`;
  if (kind === "ref") {
    return [
      { name: `ref ${info.name}`, inputs, definition },
      { name: info.name, inputs: [STDLIB_INPUT, `ref ${info.name}`], definition: `(${SS}, _) => ${LANG}${PROJECTION}${SS}.refValues(_)` },
    ];
  }
  return [{ name: info.name, inputs, definition }];
}

export const compileModule = (src: string, tsx: boolean): Variable[] => splitCells(src, tsx).flatMap((c) => compileCell(c, tsx));

const unesc = (s: string) => s.replaceAll("*\\/", "*/");

// The cell source a variable holds; null for a variable that is not SoundScript or is a generated part of a cell.
export function decompileVariable(definition: string): string | null {
  if (langOf(definition) !== "ss") return null;
  const at = definition.indexOf(LANG) + LANG.length;
  if (definition.startsWith(PROJECTION, at)) return null;
  if (!definition.startsWith("/*ss^", at)) throw new Error("SoundScript variable without a header comment");
  const hEnd = definition.indexOf("*/", at) + 2;
  const hdr = JSON.parse(definition.slice(at + 5, hEnd - 2));
  if (typeof hdr.d === "string") return hdr.d;
  const ast: any = acorn.parseExpressionAt(definition, 0, { ecmaVersion: "latest" });
  const ret = ast.body.body.find((s: any) => s.type === "ReturnStatement");
  let end = ret.argument.arguments[0].end;
  // a JSX element that ends the function body closes after the function node does
  while (definition.startsWith("/*ss>*/", end)) end += 7;
  const fnJs = definition.slice(hEnd, end);
  const jsx = fnJs.replace(/\/\*ss<([\s\S]*?)\*\/[\s\S]*?\/\*ss>\*\//g, (_m, orig: string) => `\u0000${orig}\u0001`);
  // restore types outside the JSX originals, then the originals themselves
  const parts = jsx.split(/(\u0000[\s\S]*?\u0001)/);
  const fn = parts.map((p) => (p.startsWith("\u0000") ? unesc(p.slice(1, -1)) : uncommentTypes(p))).join("");
  return hdr.h + fn + hdr.t;
}

// Variables of one cell, by any one of their names.
export const cellOfVariable = (name: string): string => name.replace(/^(ref|type) /, "");

export function decompileModule(definitions: string[]): string {
  return definitions.map(decompileVariable).filter((s): s is string => s !== null).join("\n\n") + "\n";
}
