// Loads the standard OJS toolchain (@tomlarkworthy/observablejs-toolchain) headlessly: compile, decompile.
const NB = new URL("../../../lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html", import.meta.url).pathname;
process.on("unhandledRejection", () => {});
export async function loadOjs() {
  const { loadNotebook } = await import("../../lope-runtime.js");
  const ex: any = await loadNotebook(NB, { settleTimeout: 20000, log: () => {}, hash: "#view=R100(S100(@tomlarkworthy/observablejs-toolchain))" });
  const decompile = (await ex.waitForVariable("decompile", 30000)).value;
  const compile = (await ex.waitForVariable("compile", 30000)).value;
  return { decompile, compile, dispose: () => ex.dispose() };
}
if (import.meta.main) {
  const o = await loadOjs();
  console.log(o.compile("x = 1 + y"));
  console.log(await o.decompile([{ _name: "x", _inputs: ["y"], _definition: "function _x(y) {return (1 + y);}" }]));
  process.exit(0);
}
