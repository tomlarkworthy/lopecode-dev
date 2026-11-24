import { callN, toSrcs, type Cand } from "./h.ts";
const V = (name: string, jsx: string, pre = ""): Cand => ({ name, src: `${pre}const v = () => ${jsx};` });
const ACT = `const age = (): StateCell<string> => state("");
const setAge = (age: State<string>) => action((s: string) => age.set(s));\n`;
export const cands: Cand[] = [
  { name: "accept-input-type-number-onInput-string", src: ACT + `const v = (age: string, setAge: Action<[string]>) => <input type="number" min={0} max={130} step={1} value={age} onInput={setAge} />;
const n = (age: string) => (age === "" ? null : Number(age));`, drive: callN((p) => p.value("setAge"), 1, ["age", "n"], ["42"]) },
  V("accept-input-value-number", `<input type="range" value={3} />`),
  { name: "reject-input-onInput-number-action", src: `const n = (): StateCell<number> => state(0);
const setN = (n: State<number>) => action((x: number) => n.set(x));
const w = (setN: Action<[number]>) => <input type="number" onInput={setN} />;` },
  V("accept-button-without-onClick", `<button>plain</button>`),
  V("accept-button-disabled", `<button disabled={true}>x</button>`),
  V("reject-button-value", `<button value="1">x</button>`),
  V("accept-checkbox-checked", `<input type="checkbox" checked={false} />`),
  V("reject-checked-string", `<input type="checkbox" checked="yes" />`),
  V("accept-style-string-class", `<div class="c" style="color: red" title="t" id="i">x</div>`),
  V("reject-style-object", `<div style={{ color: "red" }}>x</div>`),
  V("reject-className", `<div className="c">x</div>`),
  V("reject-data-attr", `<div data-x="1">x</div>`),
  V("reject-tag-a", `<a>x</a>`),
  V("reject-tag-ul", `<ul>x</ul>`),
  V("accept-canvas-size", `<canvas width={10} height={10} />`),
  { name: "reject-onClick-on-div", src: `const k = (): StateCell<number> => state(0);
const go = (k: State<number>) => action(() => k.set(1));
const w = (go: Action<[]>) => <div onClick={go}>x</div>;` },
  V("accept-fragment", `<><span>a</span><span>b</span></>`),
  V("accept-label-strong-fieldset-legend-output-p", `<fieldset><legend>l</legend><label>a<strong>b</strong></label><output>o</output><p>p</p></fieldset>`),
];
export const srcs = toSrcs(cands);
