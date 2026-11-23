// target 2: the shape as JSON text in the compiled cell (literal types JSON cannot spell), and a user binding named cast
import { tyRow } from "./lib9.ts";
const okStr = (x: unknown) => x === "string" || x === "refused";
export const cands = [
  tyRow("lit-infinity", `const v = () => null;\nconst g = (v: null) => { const r = cast<1e400>(v); return r.ok ? typeof r.value : "refused"; };`, (x) => x === "number" || x === "refused"),
  tyRow("lit-infinity-rec", `const v = () => ({ x: null });\nconst g = (v: { readonly x: null }) => { const r = cast<{ readonly x: 1e400 }>(v); return r.ok ? typeof r.value.x : "refused"; };`, (x) => x === "number" || x === "refused"),
  tyRow("lit-neg-infinity", `const v = () => null;\nconst g = (v: null) => { const r = cast<-1e400>(v); return r.ok ? typeof r.value : "refused"; };`, (x) => x === "number" || x === "refused"),
  tyRow("lit-infinity-union-arr", `const v = () => [1, null];\nconst g = (v: readonly (number | null)[]) => { const r = cast<readonly (1 | 1e400)[]>(v); return r.ok ? r.value.map((x) => typeof x).join() : "refused"; };`, (x) => x === "refused" || (typeof x === "string" && x.split(",").every((t) => t === "number"))),
  tyRow("lit-infinity-arith", `const v = () => null;\nconst g = (v: null) => { const r = cast<1e400>(v); return r.ok ? r.value + 1 : 0; };`, (x) => x === 0 || x === Infinity),
  tyRow("lit-infinity-refuses-infinity", `const v = () => 1e400;\nconst g = (v: number) => { const r = cast<1e400>(v); return r.ok ? "ok" : "refused"; };`, (x) => x === "ok"),
  tyRow("lit-neg-zero", `const v = () => 0;\nconst g = (v: number) => { const r = cast<-0>(v); return r.ok ? "ok" : "refused"; };`, () => true),
  tyRow("lit-marker", `const v = () => "/*ss-*/";\nconst g = (v: string) => { const r = cast<"/*ss-*/">(v); return r.ok ? r.value : "refused"; };`, (x) => x === "/*ss-*/"),
  tyRow("lit-script", `const v = () => "</script>";\nconst g = (v: string) => { const r = cast<"</script>">(v); return r.ok ? r.value : "refused"; };`, (x) => x === "</script>"),
  tyRow("lit-u2028", `const v = () => "\\u2028";\nconst g = (v: string) => { const r = cast<"\\u2028">(v); return r.ok ? "ok" : "refused"; };`, (x) => x === "ok"),
  tyRow("lit-lone-surrogate", `const v = () => "\\ud800";\nconst g = (v: string) => { const r = cast<"\\ud800">(v); return r.ok ? "ok" : "refused"; };`, (x) => x === "ok"),
  tyRow("lit-proto-prop", `const v = () => ({ x: 1 });\nconst g = (v: { readonly x: number }) => { const r = cast<{ readonly __proto__: number }>(v); return r.ok ? typeof r.value.__proto__ : "refused"; };`, (x) => x === "number" || x === "refused"),
  tyRow("annexb-cast", `const v = () => 5;\nconst g = (v: number) => { if (v > 0) { function cast(x: unknown) { return { ok: true as const, value: x }; } void cast; } const r = cast<string>(v); return r.ok ? typeof r.value : "refused"; };`, okStr),
  tyRow("annexb-cast-block", `const v = () => 5;\nconst g = (v: number) => { { function cast(x: unknown) { return { ok: true as const, value: x }; } } const r = cast<string>(v); return r.ok ? typeof r.value : "refused"; };`, okStr),
  tyRow("block-shadow-const", `const v = () => 5;\nconst g = (v: number) => { { const cast = (x: unknown) => ({ ok: true as const, value: x }); void cast(v); } const r = cast<string>(v); return r.ok ? typeof r.value : "refused"; };`, okStr),
  tyRow("for-shadow", `const v = () => 5;\nconst g = (v: number) => { for (const cast of [1]) { void cast; } const r = cast<string>(v); return r.ok ? typeof r.value : "refused"; };`, okStr),
  tyRow("catch-shadow", `const v = () => 5;\nconst g = (v: number) => { try { void 0; } catch (cast) { void cast; } const r = cast<string>(v); return r.ok ? typeof r.value : "refused"; };`, okStr),
  tyRow("param-shadow-inner", `const v = () => 5;\nconst g = (v: number) => { const k = (cast: number) => cast + 1; const r = cast<string>(v); return [k(1), r.ok ? typeof r.value : "refused"]; };`, (x: any) => Array.isArray(x) && okStr(x[1])),
  tyRow("local-named-cast", `const v = () => 5;\nconst g = (v: number) => { const cast = (x: unknown) => ({ ok: true, value: x }); const r = cast(v); return r.ok ? typeof r.value : "no"; };`, () => true),
  tyRow("local-cast-with-targ", `const v = () => 5;\nconst g = (v: number) => { const cast = <T,>(x: unknown) => ({ ok: true as const, value: x as T }); const r = cast<string>(v); return typeof r.value; };`, (x) => x === "string"),
  tyRow("shadow-type-Cast", `type Cast<T> = { readonly ok: boolean; readonly value: T };\nconst v = () => 5;\nconst g = (v: number) => { const r = cast<string>(v); return typeof r.value; };`, (x) => x === "string"),
  tyRow("cast-spread-arg", `const v = () => 5;\nconst g = (v: number) => { const r = cast<string>(...[v]); return r.ok ? typeof r.value : "no"; };`, (x) => x !== "number"),
];
