// Modules for cp-diff.ts at the kinds of position the corpus reaches fewer than 20 times. Each of a probe's cells is a
// position (`‸` marks the cursor) in a module of BASE's cells and that cell.
const BASE = [
  `type Ev = { readonly kind: "add"; readonly by: number } | { readonly kind: "undo" };`,
  `type Pt = { readonly x: number; readonly y: number; readonly label?: string };`,
  `function count(): StateCell<number> {\n  return state(0);\n}`,
  `const ticks = function* (now: Clock) {\n  for (;;) yield now();\n};`,
  `const xs = () => [1, 2, 3];`,
];
// prefixes typed after the dot: none, one letter, a longer start, a whole name
const PRE = ["", "t", "to", "s", "le", "m", "f", "x", "y", "k", "by", "se", "up", "lab", "length", "e", "i", "c", "r", "zz"];
// the first letters of a name the cursor sits after, 1 to all of them
const head = (n: string, i: number) => n.slice(0, 1 + (i % n.length));
const rows = (f: (p: string, i: number) => string) => PRE.map((p, i) => f(p, i));
// the cells and capabilities a parameter can name
const PARAM_PRE = ["", "c", "co", "t", "ti", "x", "n", "no", "r", "ra", "f", "fe", "l", "lo", "i", "in", "com", "p", "po", "cou"];
const mod = (kind: string, cells: string[], tsx = false) => ({ kind, tsx, base: BASE, cells });

export const PROBES: { kind: string; tsx: boolean; base: string[]; cells: string[] }[] = [
  mod("member-record", rows((p, i) => `const r${i} = (pt: Pt) => pt.${p}‸`)),
  mod("member-array", rows((p, i) => `const a${i} = (xs: number[]) => ${i % 2 ? "xs.map((v) => v)" : "xs"}.${p}‸`)),
  mod("member-string", rows((p, i) => `const s${i} = (s: string) => ${i % 3 === 0 ? "s.trim()" : i % 3 === 1 ? "`${s}`" : "s"}.${p}‸`)),
  mod("member-number", rows((p, i) => `const n${i} = (n: number) => ${i % 2 ? "(n + 1)" : "n"}.${p}‸`)),
  mod("member-state", rows((p, i) => `const st${i} = (count: State<number>) => action(() => count.${p}‸)`)),
  mod("member-events", rows((p, i) => `const ev${i} = (ticks: Events<number>) => ticks.${p}‸`)),
  mod("member-mut", rows((p, i) => `const mu${i} = () => {\n  const b = mut(${i % 2 ? "new Map<string, number>()" : "[1, 2]"});\n  b.${p}‸\n  return freeze(b);\n};`)),
  mod("member-borrowed", rows((p, i) => `const bo${i} = () => {\n  const m = mut([1, 2]);\n  const v = borrow(m);\n  v.${p}‸\n  return freeze(m);\n};`)),
  mod("member-union", rows((p, i) => `const u${i} = (e: Ev${i % 2 ? " | null" : ""}) => e${i % 2 ? "?" : ""}.${p}‸`)),
  mod("member-optional-chain", rows((p, i) => `const o${i} = (pt: Pt | undefined) => pt?.${i % 2 ? "label?." : ""}${p}‸`)),
  mod("member-type-parameter", rows((p, i) => `const tp${i} = () => <T>(x: T): T => { x.${p}‸; return x; };`)),
  mod("member-unknown", rows((p, i) => `const un${i} = (v: unknown) => v.${p}‸`)),
  mod("member-literal-bool", rows((p, i) => `const lb${i} = (b: boolean, l: "a" | "b") => ${i % 2 ? "b" : "l"}.${p}‸`)),
  ...["Action<[]>", "Listener", "StateCell<number>"].map((t, k) => mod(`member-${t.split("<")[0]}`, rows((p, i) => `const h${k}_${i} = (v: ${t}) => v.${p}‸`))),
  mod("member-literal", rows((p, i) => `const li${i} = (l: ${['"abc"', "7", "true", '"x" | "y"'][i % 4]}) => l.${p}‸`)),
  mod("member-map-set", rows((p, i) => `const ms${i} = (m: ${i % 2 ? "Map<string, number>" : "Set<string>"}) => m.${p}‸`)),
  mod("copy-unclosed-test", rows((p, i) => `const uc${i} = (x: number, pt: Pt) => { ${["if", "while", "if", "while"][i % 4]} (${i % 2 ? "pt" : "x"}.${p}‸`)),
  mod("copy-unclosed-call", rows((p, i) => `const ucc${i} = (pt: Pt) => { const q = [pt.${p}‸`)),
  mod("name-fn", rows((p, i) => `const nf${i} = (x: number) => {\n  function helper${i}(y: number): number { return y + x; }\n  return ${head(`helper${i}`, i)}‸\n};`)),
  mod("name-let", rows((p, i) => `const nl${i} = (x: number) => {\n  let total${i} = x;\n  total${i} = total${i} + 1;\n  return ${head(`total${i}`, i)}‸\n};`)),
  mod("name-const", rows((p, i) => `const nc${i} = (x: number) => {\n  const value${i} = x + 1;\n  return ${head(`value${i}`, i)}‸\n};`)),
  mod("name-param", rows((p, i) => `const np${i} = (width${i}: number, w: string) => ${head(`width${i}`, i)}‸`)),
  mod("name-global", rows((p, i) => `const ng${i} = (x: number) => ${head(["Math", "JSON", "Object", "Number", "String", "Array", "Map", "Set", "parseInt", "Infinity"][i % 10], i)}‸`)),
  mod("name-prelude", rows((p, i) => `const nr${i} = (x: number) => ${head(["state", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "messageOf", "read"][i % 10], i)}‸`)),
  mod("name-loop-catch-block", rows((p, i) => i % 3 === 0 ? `const nb${i} = (xs: number[]) => {\n  let s = 0;\n  for (const item of xs) { s = s + ${head("item", i)}‸; }\n  return s;\n};` : i % 3 === 1 ? `const nb${i} = (t: string) => {\n  try { return JSON.parse(t); } catch (err) { return ${head("err", i)}‸; }\n};` : `const nb${i} = (x: number) => {\n  { const inner = x; return ${head("inner", i)}‸; }\n};`)),
  mod("name-nested-fn", rows((p, i) => `const nn${i} = (xa: number) => (ya: number) => (za: number) => ${["x", "y", "z", "xa", "ya"][i % 5]}‸`)),
  mod("name-in-action", rows((p, i) => `const na${i} = (count: State<number>) => action((n: number) => count.set(${["re", "n", "co", "m", "fr"][i % 5]}‸))`)),
  mod("type-annotation", rows((p, i) => [`const ta${i} = (x: ${"ESNMBRP"[i % 7]}${p}‸`, `const ta${i} = (x: number): ${"SMPL"[i % 4]}${p}‸`, `const ta${i} = (x: Map<string, ${"nPA"[i % 3]}${p}‸`, `const ta${i} = (e: Events<${"nsb"[i % 3]}${p}‸`][i % 4])),
  mod("jsx-attr", rows((p, i) => `const j${i} = (count: number) => <${["button", "input", "div", "span", "svg"][i % 5]} ${["on", "", "cl", "st", "va"][i % 5]}${p}‸`), true),
  mod("jsx-attr-given", rows((p, i) => `const jg${i} = (count: number) => <input type="number" ${["v", "on", "mi", "", "ma"][i % 5]}${p}‸ />;`), true),
  mod("jsx-child", rows((p, i) => `const jc${i} = (count: number, label: string) => <div>{${["co", "la", "M", "", "cou"][i % 5]}${p}‸}</div>;`), true),
  mod("param-list", PARAM_PRE.map((p, i) => [`const pl${i} = (${p}‸`, `const pl${i} = (xs: number[], ${p}‸`, `function pl${i}(${p}‸`, `export const pl${i} = async (${p}‸`, `// note\nconst pl${i} = function* (${p}‸`][i % 5])),
  mod("incomplete", rows((p, i) => [`const ic${i} = (x: number) => { if (x.${p}‸`, `const ic${i} = (x: number) => ((x.${p}‸`, `const ic${i} = (pt: Pt) => [pt.${p}‸`, `const ic${i} = (pt: Pt) => { const q = { a: pt.${p}‸`, `const ic${i} = (x: number) => x +* ${p}‸`][i % 5])),
  mod("none", rows((p, i) => [`const nq${i} = (x: number) => "abc.${p}‸"`, `const nq${i} = (x: number) => x // x.${p}‸`, `const nq${i} = (xs: number[]) => [...${p}‸`, `const nq${i} = (x: number) => 1.${p}‸`, `const nq${i} = (x: number) => \`a\${x} b.${p}‸\``, `const nq${i} = (x: number) => /* x.${p}‸ */ x`][i % 6])),
];
