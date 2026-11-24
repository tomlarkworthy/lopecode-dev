import { callN, toSrcs, type Cand } from "./h.ts";
const S = (name: string, ty: string, init: string, extra = "", drive?: Cand["drive"]): Cand => ({ name, src: `const s = (): StateCell<${ty}> => state<${ty}>(${init});\n${extra}`, ...(drive ? { drive } : {}) });
export const cands: Cand[] = [
  S("accept-set", "Set<number>", "new Set([1])", `const toggle = (s: State<Set<number>>) => action((n: number) => s.update((old) => { const next = new Set(old); if (next.has(n)) next.delete(n); else next.add(n); return next; }));
const shown = (s: Set<number>) => [...s].join(",");`, callN((p) => p.value("toggle"), 1, ["shown"], [2])),
  S("accept-map", "Map<string, number>", "new Map<string, number>()", `const put = (s: State<Map<string, number>>) => action((k: string) => s.update((old) => { const m = new Map(old); m.set(k, (m.get(k) ?? 0) + 1); return m; }));
const shown = (s: Map<string, number>) => [...s.entries()].map((e) => e[0] + "=" + e[1]).join(",");`, callN((p) => p.value("put"), 2, ["shown"], ["a"])),
  S("reject-write-state-set-in-place", "Set<number>", "new Set([1])", `const add = (s: State<Set<number>>) => action((n: number) => s.update((old) => { old.add(n); return old; }));`),
  S("accept-record-literal-keys", "{ readonly a: number; readonly b: string }", `{ a: 1, b: "x" }`),
  S("index-signature-record-spread-unsupported", "{ readonly [k: string]: number }", `{}`, `const put = (s: State<{ readonly [k: string]: number }>) => action(() => s.update((o) => ({ ...o, x: 1 })));
const shown = (s: { readonly [k: string]: number }) => Object.keys(s).join(",");`, callN((p) => p.value("put"), 1, ["shown"])),
  S("accept-index-signature-record", "{ readonly [k: string]: number }", `{}`, `const put = (s: State<{ readonly [k: string]: number }>) => action((k: string) => s.update((o) => Object.fromEntries([...Object.entries(o), [k, 1]])));
const shown = (s: { readonly [k: string]: number }) => Object.keys(s).join(",");`, callN((p) => p.value("put"), 1, ["shown"], ["x"])),
  S("accept-array", "readonly number[]", "[]"),
  S("accept-mutable-array-type", "number[]", "[]", `const push1 = (s: State<number[]>) => action(() => s.update((xs) => [...xs, 1]));
const shown = (s: number[]) => s.length;`, callN((p) => p.value("push1"), 2, ["shown"])),
  S("state-function", "(n: number) => number", "(n: number) => n + 1", `const r = (s: (n: number) => number) => s(1);`, async (p: any) => `r=${p.value("r")} ${p.status("r")}`),
  S("accept-number-or-null", "number | null", "null"),
  S("reject-undefined-content", "number | undefined", "undefined"),
  S("reject-optional-field-content", "{ readonly a?: number }", "{}"),
  S("state-in-state", "{ readonly inner: State<number> }", "{ inner: null }"),
  S("state-elem", "Elem", "<span>x</span>"),
  S("state-typed-array", "Float64Array", "new Float64Array(2)"),
  S("state-url", "URL", `new URL("https://x.org")`),
  { name: "state-of-action", src: `const n = (): StateCell<number> => state(0);
const inc = (n: State<number>) => action(() => n.update((x) => x + 1));
const s = (inc: Action<[]>): StateCell<Action<[]>> => state(inc);
const view = (s: Action<[]>) => <button onClick={s}>x</button>;`, drive: async (p: any) => { const a = p.value("s"); if (typeof a !== "function") return "s=" + p.status("s") + " " + p.error("s"); a(); await p.settle(400); return "n=" + p.value("n"); } },
];
export const srcs = toSrcs(cands);
