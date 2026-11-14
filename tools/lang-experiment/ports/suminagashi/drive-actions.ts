// Run from tools/lang-experiment: bun ports/suminagashi/drive-actions.ts
// Calls the port's actions headless and prints ref values and the live mirror after each settle.
import { loadPort } from "/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/run.ts";
for (const order of ["forward", "reverse"] as const) {
  const h = await loadPort("/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/ports/suminagashi", { order });
  await h.settle(2000);
  const show = (label: string) => console.log(`${order} ${label}: turn=${JSON.stringify(h.value("turn"))} pointer=${JSON.stringify(h.value("pointer"))} finished=${JSON.stringify(h.value("finished"))} live=${JSON.stringify(h.value("live"))} evals(turn,nextTests)=${h.evals("turn")}`);
  const call = async (name: string, ...a: unknown[]) => { (h.value(name) as Function)(...a); await h.settle(2000); };
  show("initial");
  await call("pointerMove", 5, 6); show("pointerMove while no pointer");
  await call("pointerDown", { touch: 1, tool: "brush", fluid: 0, x: 10, y: 20, down: true }, true); show("pointerDown brush");
  await call("pointerMove", 11, 21); show("pointerMove while down");
  await call("pointerUp"); show("pointerUp");
  await call("pointerMove", 12, 22); show("pointerMove after up");
  await call("finishPicture", 123, "why"); show("finishPicture");
  await call("resetPicture"); show("resetPicture");
  h.dispose();
}
