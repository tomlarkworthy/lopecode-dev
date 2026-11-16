// Completion for one cell of a module, from the checker's types. The cell text is usually incomplete
// while typing, so a copy is checked with a placeholder identifier at the cursor; if the copy does not
// parse, the cell is cut at the cursor and its open brackets closed. When neither copy can be checked
// the answer is an empty list, never a guess from runtime values.
import { checkSources, type Outside } from "./core.ts";
import type { Checker, Env, Scope } from "./infer.ts";
import { Registry } from "./registry.ts";
import { type Ty, show, named, isNamed, propT, members, UNKNOWN } from "./types.ts";
import { CAPABILITIES, PRELUDE_FNS, PRELUDE_DECLS, JSX_DECLS } from "./intrinsics.ts";
import type { Node } from "./parse.ts";

export type Completion = { label: string; type: string; detail?: string };
export type Completions = { from: number; to: number; options: Completion[]; mode: "member" | "name" | "param" | "type" | "jsx" | "none" };

const PH = "__ss_complete__";
const KEYWORDS = "const let return if else for of in while do break continue switch case default function true false null undefined typeof async await yield try catch finally throw".split(" ");
// types whose members a cell may not read: handles and actions are used whole
const NO_MEMBERS = new Set(["Action", "RefCell", "Events", "Listener", "Compile"]);

// Where offset sits in text: in a string or comment, and the brackets open there (as closers).
function scan(text: string, end: number): { quoted: boolean; closers: string[] } {
  const stack: string[] = [];
  const CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  let i = 0;
  while (i < end) {
    const c = text[i], d = text[i + 1];
    if (c === "/" && d === "/") { const n = text.indexOf("\n", i); if (n < 0 || n >= end) return { quoted: true, closers: stack }; i = n + 1; continue; }
    if (c === "/" && d === "*") { const n = text.indexOf("*/", i + 2); if (n < 0 || n + 2 > end) return { quoted: true, closers: stack }; i = n + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < end && text[j] !== c && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
      if (j >= end) return { quoted: true, closers: stack };
      i = j + 1; continue;
    }
    if (stack.at(-1) === "`") {
      if (c === "`") { stack.pop(); i++; continue; }
      if (c === "\\") { i += 2; continue; }
      if (c === "$" && d === "{") { stack.push("${"); i += 2; continue; }
      i++; continue;
    }
    if (c === "`") { stack.push("`"); i++; continue; }
    if (c in CLOSE) stack.push(c);
    else if (c === ")" || c === "]" || c === "}") stack.pop();
    i++;
  }
  if (stack.at(-1) === "`") return { quoted: true, closers: stack };
  return { quoted: false, closers: stack.map((o) => (o === "${" ? "}" : o === "`" ? "`" : ({ "(": ")", "[": "]", "{": "}" } as any)[o])).reverse() };
}

// <tag attr… with the cursor at an attribute name: the tag, else null
function tagAt(before: string): string | null {
  if (!/\s$/.test(before)) return null;
  let depth = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const c = before[i];
    if (c === "}") depth++;
    else if (c === "{") { if (depth === 0) return null; depth--; }
    else if (depth === 0) {
      if (c === ">") return null;
      if (c === "<") return /^<([a-z][\w]*)\s/.exec(before.slice(i))?.[1] ?? null;
    }
  }
  return null;
}

// inside the cell's own parameter list at a name position: the names already there, else null
function paramListAt(before: string): string[] | null {
  const head = /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:export\s+)?(?:(?:const|let)\s+[\w$]+\s*=\s*(?:async\s+)?(?:function\*?\s*[\w$]*\s*)?|(?:async\s+)?function\*?\s+[\w$]+\s*)\(/.exec(before);
  if (!head) return null;
  const inside = before.slice(head[0].length);
  let depth = 0;
  for (const c of inside) { if ("([{<".includes(c)) depth++; else if (")]}>".includes(c)) { if (depth === 0) return null; depth--; } }
  if (depth !== 0) return null;
  const last = inside.split(",").at(-1)!;
  if (last.trim() !== "") return null;
  return inside.split(",").slice(0, -1).map((p) => /^\s*([\w$]+)/.exec(p)?.[1] ?? "").filter(Boolean);
}

// Whether the cursor is in a type: after a parameter's colon in the cell's own parameter list, or
// in the return type after it.
function typeAt(before: string): boolean {
  const head = /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:export\s+)?(?:(?:const|let)\s+[\w$]+\s*=\s*(?:async\s+)?(?:function\*?\s*[\w$]*\s*)?|(?:async\s+)?function\*?\s+[\w$]+\s*)\(/.exec(before);
  if (!head) return false;
  const inside = before.slice(head[0].length);
  let depth = 0, seg = "";
  for (let i = 0; i < inside.length; i++) {
    const c = inside[i];
    if ("([{<".includes(c)) depth++;
    else if (")]}>".includes(c) && !(c === ">" && inside[i - 1] === "=")) {
      if (depth === 0) return c === ")" && /^\s*:[^={]*$/.test(inside.slice(i + 1));
      depth--;
    }
    if (depth === 0 && c === ",") { seg = ""; continue; }
    seg += c;
  }
  return /^\s*[\w$]+\s*\??\s*:/.test(seg);
}
const declared = (src: string) => [...src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:interface|type)\s+([\w$]+)/g)].map((m) => m[1]);
// the types a cell may name: the prelude's, JSX's, the handle and ownership types, and the library generics
const TYPE_NAMES = [...new Set([...declared(PRELUDE_DECLS), ...declared(JSX_DECLS), "Action", "RefCell", "Mut", "Borrowed", "Array", "ReadonlyArray", "Map", "Set", "Promise", "Generator", "Record", "number", "string", "boolean", "bigint", "unknown", "null", "undefined", "void", "readonly"])]
  .filter((n) => !["FetchResponse", "Child"].includes(n));

const kindOf = (reg: Registry, t: Ty) => (reg.callSigs(t).length ? "method" : "property");

// The members a read of `t.` may name: banned ones never, mutating ones only on a Mut receiver.
export function membersOf(reg: Registry, t: Ty): Completion[] | null {
  const ms = members(reg.expand(t)).filter((m) => m.k !== "null" && m.k !== "undef" && m.k !== "void");
  if (!ms.length) return null;
  let common: Map<string, Completion> | null = null;
  for (const m of ms) {
    if (m.k === "err" || m.k === "unknown" || m.k === "tv") return null;
    const own = new Map<string, Completion>();
    const mut = isNamed(m, "Mut");
    const inner = isNamed(m, "Mut") || isNamed(m, "Borrowed") ? m.args[0] : m;
    const x = reg.expand(inner);
    if (x.k === "named" && NO_MEMBERS.has(x.n)) return [];
    for (const name of memberNames(reg, x)) {
      const p = reg.member(m, name);
      if (!p || p.flags?.banned || (p.flags?.mutates && !mut)) continue;
      own.set(name, { label: name, type: kindOf(reg, p.t), detail: show(propT(p)) });
    }
    if (!common) common = own;
    else for (const k of [...common.keys()]) if (!own.has(k)) common.delete(k);
  }
  return [...(common ?? new Map()).values()].sort((a, b) => a.label.localeCompare(b.label));
}
function memberNames(reg: Registry, x: Ty): string[] {
  switch (x.k) {
    case "rec": return [...x.props.keys()];
    case "named": return reg.types.has(x.n) && x.n !== "Iterable" && x.n !== "ArrayLike" ? [...reg.ifaceRec(x.n).props.keys()] : [];
    case "arr": return memberNames(reg, named("Array"));
    case "tup": return [...memberNames(reg, named("Array"))];
    case "str": return memberNames(reg, named("String"));
    case "num": return memberNames(reg, named("Number"));
    case "lit": return memberNames(reg, typeof x.v === "string" ? named("String") : typeof x.v === "number" ? named("Number") : named("Boolean"));
    case "union": return x.ts.every((y) => y.k === "lit" && typeof y.v === "boolean") ? memberNames(reg, named("Boolean")) : [];
    default: return [];
  }
}

// Names in scope at the placeholder: locals, parameters, the prelude and the allowed intrinsics.
function scopeNames(ch: Checker, env: Env): Completion[] {
  const out = new Map<string, Completion>();
  for (let s: Scope | null = env.scope; s; s = s.parent) {
    for (const [name, b] of s.vars) {
      if (out.has(name) || name === PH) continue;
      // read is offered only inside an action body, the one place it is legal
      if (b.kind === "prelude") { if (name !== "read" || env.fi?.inAction) out.set(name, { label: name, type: "function", detail: name === "read" ? "prelude: a ref's value inside an action" : "prelude" }); continue; }
      const t = env.flow.get("#" + b.id) ?? b.t;
      const type = b.kind === "global" ? (ch.reg.callSigs(t).length ? "function" : "namespace") : b.kind === "fn" || ch.reg.callSigs(t).length ? "function" : "variable";
      out.set(name, { label: name, type, detail: b.kind === "global" ? "intrinsic" : show(t) });
    }
  }
  return [...out.values()];
}

// outside: the module's cells in other languages (core.ts Outside), so a parameter that reads one has its annotated type
export function completionsAt(cells: readonly string[], at: number, offset: number, tsx = true, outside: readonly Outside[] | null = null): Completions {
  const text = cells[at] ?? "";
  const before0 = text.slice(0, offset);
  const prefix = /[\w$]*$/.exec(before0)![0];
  const from = offset - prefix.length;
  const before = text.slice(0, from);
  const none = (): Completions => ({ from, to: offset, options: [], mode: "none" });
  const pick = (mode: Completions["mode"], options: Completion[]): Completions =>
    ({ from, to: offset, mode, options: options.filter((o) => o.label.startsWith(prefix)) });
  const sc = scan(text, from);
  if (sc.quoted) return none();
  if (/\.\.\.\s*$/.test(before) || /(^|[^\w$.])\d+\.$/.test(before)) return none();

  if (tsx) {
    const tag = tagAt(before);
    if (tag) {
      const reg = new Registry();
      const p = reg.member(named("IntrinsicElements"), tag);
      if (!p) return none();
      const have = new Set([...before.slice(before.lastIndexOf("<" + tag)).matchAll(/\s([\w-]+)=/g)].map((m) => m[1]));
      const opts = memberNames(reg, reg.expand(p.t)).filter((n) => n !== "children" && !have.has(n)).map((n) => {
        const q = reg.member(p.t, n)!;
        return { label: n, type: "property", detail: show(q.t) };
      });
      return pick("jsx", opts.sort((a, b) => a.label.localeCompare(b.label)));
    }
  }

  if (typeAt(before)) {
    const own = cells.flatMap((c, i) => (i === at ? [] : declared(c)));
    const opts = [...new Set([...TYPE_NAMES, ...own])].map((n) => ({ label: n, type: "type", detail: own.includes(n) ? "type in this module" : "prelude" }));
    return pick("type", opts.sort((a, b) => a.label.localeCompare(b.label)));
  }

  const params = paramListAt(before);
  if (params) {
    const self = /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:export\s+)?(?:const|let|(?:async\s+)?function\*?)\s+([\w$]+)/.exec(before)?.[1];
    const others = cells.filter((_, i) => i !== at).join("\n\n");
    let types = new Map<string, string>();
    try { types = new Map(checkSources({ cells: others, tsx, outside }).cells.map((c) => [c.name, c.value ?? ""])); } catch {}
    const opts: Completion[] = [];
    for (const [n, t] of types) if (n !== self && !params.includes(n)) opts.push({ label: n, type: "variable", detail: `cell: ${t}` });
    for (const [n, t] of Object.entries(CAPABILITIES)) if (!params.includes(n) && !types.has(n)) opts.push({ label: n, type: "variable", detail: `capability: ${t}` });
    return pick("param", opts.sort((a, b) => a.label.localeCompare(b.label)));
  }

  const member = /(\?\.|\.)\s*$/.test(before);
  if (!member && !prefix) return { ...none(), mode: "name" };
  // copies of the cell with the placeholder where the typed word is
  // the rest of a word the cursor is inside goes with the placeholder, so it does not join it
  const after = text.slice(offset).replace(/^[\w$]*/, "");
  // the last: an unclosed `if (` or `while (` takes an empty body
  const cl = sc.closers.join("");
  const variants = [before + PH + after, before + PH + cl + ";", before + PH + ";" + cl, before + PH + cl.replace(")", ") {}")];
  for (const v of variants) {
    const texts = cells.map((c, i) => (i === at ? v : c));
    let got: { kind: "member"; t: Ty; reg: Registry } | { kind: "name"; list: Completion[] } | null = null;
    try {
      checkSources({ cells: texts.join("\n\n"), tsx, outside }, {
        onCell: (_name, ch) => {
          ch.identHook = (e, env) => {
            if (e.name !== PH || got) return;
            if (!member) got = { kind: "name", list: scopeNames(ch, env) };
          };
          if (member) {
            const orig = ch.member.bind(ch);
            ch.member = (e: Node, env: Env) => {
              const t = orig(e, env);
              if (!got && !e.computed && e.property?.name === PH) got = { kind: "member", t: ch.facts.types.get(e.object) ?? UNKNOWN, reg: ch.reg };
              return t;
            };
          }
        },
      });
    } catch { continue; }
    if (!got) continue;
    const g = got as any;
    if (g.kind === "member") return pick("member", membersOf(g.reg, g.t) ?? []);
    const kw = KEYWORDS.map((k) => ({ label: k, type: "keyword" }));
    return pick("name", [...g.list, ...kw.filter((k) => !g.list.some((x: Completion) => x.label === k.label))].sort((a, b) => a.label.localeCompare(b.label)));
  }
  return { ...none(), mode: member ? "member" : "name" };
}

export { PRELUDE_FNS };
