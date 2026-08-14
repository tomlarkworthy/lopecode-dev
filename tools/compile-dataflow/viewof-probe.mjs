// Does a compiled function's widget work as a `viewof`, and where does Generators.input go?
//
// `viewof w = EXPR` desugars to: `viewof w` = EXPR, and `w` = Generators.input(`viewof w`). So the
// question is what EXPR may be. Answered by running it, not by reading the desugaring — with the
// real vendored Generators.input and a stub widget (an EventTarget carrying .value), because the
// widget being *stateless* is the whole premise: each call builds a fresh node that owns its value.
import { Runtime } from "../../vendor/observable-runtime/src/index.js";
import { input as generatorsInput } from "../../vendor/observable-stdlib/src/generators/input.js";

class StubWidget extends EventTarget {
  constructor(v) { super(); this.type = "text"; this.value = v; }
  set(v) { this.value = v; this.dispatchEvent(new Event("input")); }
}

// A compiled function stands in for compileDataflow's output: no reactive state, one fresh widget
// per call. `buildWidget()` is what `fn().slider` would be.
const buildWidget = () => new StubWidget("start");

const settle = () => new Promise((r) => setTimeout(r, 30));

async function arm(label, viewofDefinition) {
  const rt = new Runtime({ Generators: () => ({ input: generatorsInput }) });
  const m = rt.module();
  const seen = [];
  let failed = null;
  m.define("viewof w", [], viewofDefinition);
  m.define("w", ["Generators", "viewof w"], (G, v) => G.input(v)); // exactly the desugaring
  m.variable({
    fulfilled: (v) => seen.push(v),
    rejected: (e) => (failed = String(e.message || e).slice(0, 90))
  }).define(["w"], (w) => w);
  await settle();
  let node = null;
  try { node = await m.value("viewof w"); } catch (e) { failed ||= "viewof: " + e.message; }
  // drive it the way a user would
  if (node instanceof StubWidget) { node.set("typed"); await settle(); }
  console.log(`${label.padEnd(34)} values=${JSON.stringify(seen)}${failed ? "  FAILED: " + failed : ""}`);
  rt.dispose();
}

console.log("`viewof w` = each EXPR below; `w` = Generators.input(viewof w)\n");
await arm("A: EXPR = the widget", () => buildWidget());
await arm("B: EXPR = Generators.input(widget)", () => generatorsInput(buildWidget()));
await arm("C: EXPR = await (async widget)", async () => buildWidget());
