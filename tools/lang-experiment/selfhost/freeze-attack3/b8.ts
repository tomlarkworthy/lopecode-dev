// 4b/5b/6. host objects and odd shapes: a fetch Response shared by two cells (body read once), RegExp flags, cyclic and
// deep values, fail-stop shapes (an action whose second argument fails to freeze; a publish that throws, then reruns)
import { C, L, W } from "./harness.ts";
const callW = (p: any) => { try { p.value("w")(); } catch (x) { return "w threw " + (x as Error).message; } };
const deepRec = (n: number) => { let s = "xs"; for (let i = 0; i < n; i++) s = `{ a: ${s} }`; return s; };
export const cands = [
  C("resp-shared", "const r = async (fetch: Fetch) => { const x = await fetch(\"https://x.test/\"); return { x }; };\nconst b = async (r: { x: FetchResponse }) => [await r.x.text()];\nconst c = async (r: { x: FetchResponse }) => [await r.x.text()];", { fetchBody: "hello", show: ["b", "c"] }),
  C("resp-direct", "const r = (fetch: Fetch) => fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => [await r.text()];\nconst c = async (r: FetchResponse) => [r.ok, r.status];", { fetchBody: "hello", show: ["b", "c"] }),
  C("resp-json-twice", "const r = (fetch: Fetch) => fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => [JSON.stringify(await r.json())];\nconst c = async (r: FetchResponse) => [JSON.stringify(await r.json())];", { fetchBody: "[1]", show: ["b", "c"] }),
  C("resp-arraybuffer", "const r = async (fetch: Fetch) => { const x = await fetch(\"https://x.test/\"); const b = await x.arrayBuffer(); " + L("new Uint8Array(b).fill(7);") + "return { b }; };", { fetchBody: "hi" }),
  C("re-sticky-test", "const a = () => /a/y;\nconst b = (a: RegExp) => [a.test(\"aa\"), a.test(\"aa\")];", { show: ["b"] }),
  C("re-global-match", "const a = () => /a/g;\nconst b = (a: RegExp) => \"aa\".match(a);", { show: ["b"] }),
  C("re-dflag-exec", "const a = () => { const m = /(?<g>a)/d.exec(\"ab\"); return { m }; };", { show: ["a"] }),
  C("re-split", "const a = () => /,/y;\nconst b = (a: RegExp) => \"a,b\".split(a);", { show: ["b"] }),
  C("re-replaceall", "const a = () => /a/g;\nconst b = (a: RegExp) => [\"aa\".replaceAll(a, \"b\"), \"aa\".replace(a, \"c\")];", { show: ["b"] }),
  C("cyclic-map", "const a = () => { const m = new Map<string, unknown>(); m.set(\"self\", m); const t = new Uint8Array(2); m.set(\"t\", t); " + L("t[0] = 1;") + "return m; };"),
  C("deep-2000", "const a = () => { const xs = [0]; " + L("xs.push(1);") + "return " + deepRec(2000) + "; };"),
  C("same-obj-two-cells", "const k = () => { const t = new Uint8Array(2); return { t }; };\nconst a = (k: { t: Uint8Array }) => ({ k });\nconst b = (k: { t: Uint8Array }) => ({ k });\nconst c = (a: { k: { t: Uint8Array } }, b: { k: { t: Uint8Array } }) => [a.k.t === b.k.t];", { show: ["c"] }),
  // fail-stop: an action called with a record then an iterator (banned): the first argument is frozen in the caller
  C("act-partial-freeze", "const s = () => state(0);\nconst add = (s: State<number>) => action((a: number[], b: Iterable<number>) => { s.set(a.length); });\nconst w = (add: Action<[number[], Iterable<number>]>) => action(() => { const xs = [0]; try { add(xs, [1].values()); } catch (e) { xs.push(1); } });", { drive: callW, show: ["s"] }),
  C("act-partial-freeze2", "const s = () => state(0);\nconst add = (s: State<number>) => action((a: number[], b: Iterable<number>) => { s.set(a.length); });\nconst w = (add: Action<[number[], Iterable<number>]>) => () => { const xs = [0]; try { add(xs, [1].values()); } catch (e) { return messageOf(e); } xs.push(1); return \"ok\"; };", { drive: callW, show: ["s"] }),
  C("publish-throws-then-ok", "const n = function* () { yield 0; yield 1; };\nconst a = (n: number) => { const xs = [0]; return n === 0 ? { it: xs.values() } : { xs }; };", { show: ["a"] }),
  C("gen-yield-throws-continues", "const a = function* () { const xs = [0]; try { yield { it: xs.values() }; } catch (e) { } xs.push(1); yield xs; };", { show: ["a"] }),
  C("state-init-throw", "const s = () => { const xs = [0]; return state({ it: xs.values(), xs }); };", { show: ["s"] }),
];
