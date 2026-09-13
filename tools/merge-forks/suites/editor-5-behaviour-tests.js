const _e5t20 = function _e5t20(md) {return (md`## Editor behaviour tests

Written 2026-09-14 (T5 in \`plan/merging-the-notebook-kit-forks.md\`), before editor-6 is merged into this module. Each test adds a throwaway module with runtime-sdk's \`createModule\` holding three classic cells, \`alpha = 1\`, \`beta = alpha + 1\` and \`gamma = 3\`, opens it in a pane, waits for an editor beside every cell, and then drives the editor through its hotbar, CodeMirror, the add button, the delete button and a hotbar drag. The module is closed and deleted in \`finally\`, and any options the test wrote for it are removed.

Gated by *run editor-5 tests* (\`&e5_tests\`), like the tests above.`);};
const _e5t21 = function _e5Fixture(createModule,deleteModule,runtime,realize,linkTo,navigate,editors,divToVar,$0,Event) {
  let serial = 0;
  const cellNode = (variable) => [...document.querySelectorAll(".observablehq")].find((div) => divToVar(runtime, div) === variable);
  const moduleNodes = (module) => [...document.querySelectorAll(".observablehq")].filter((div) => divToVar(runtime, div)?._module === module);
  const until = async (fn, what, timeout = 15000) => {
    const t0 = Date.now();
    for (;;) {
      const got = await fn();
      if (got) return got;
      if (Date.now() - t0 > timeout) throw new Error(`${what} not reached within ${timeout}ms`);
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  return async (t, fn) => {
    const name = `@e5-test/m-${Date.now().toString(36)}${serial++}`;
    const module = createModule(name, runtime);
    const go = async (intent) => {
      navigate(linkTo(intent, {baseURI: location.href}));
      await t.settle();
    };
    try {
      const [alpha, beta, gamma] = await realize([
        "function _alpha(){return(\n1\n)}",
        "function _beta(alpha){return(\nalpha + 1\n)}",
        "function _gamma(){return(\n3\n)}"
      ], runtime);
      const v = {
        alpha: module.variable(true).define("alpha", [], alpha),
        beta: module.variable(true).define("beta", ["alpha"], beta),
        gamma: module.variable(true).define("gamma", [], gamma)
      };
      await go({open: name});
      await until(() => Object.values(v).every((x) => editors.get(x)?.querySelector(".hotbar") && cellNode(x)?.nextSibling === editors.get(x)), `an editor beside each cell of ${name}`);
      return await fn({module, name, v, cellNode, moduleNodes, until, host: (x) => editors.get(x)});
    } finally {
      await go({close: name});
      deleteModule(name, runtime);
      if ($0.value && name in $0.value) {
        delete $0.value[name];
        $0.dispatchEvent(new Event("input"));
      }
      await t.settle();
    }
  };
};
const _e5t22 = function _test_e5_hotbar_opens_the_decompiled_source(e5_tests_enabled,ui,e5Fixture,expect) {return (!e5_tests_enabled ? "skipped" : ui.scenario((t) => e5Fixture(t, async ({v, host, until}) => {
  const h = host(v.beta);
  await t.click(h.querySelector(".hotbar"));
  const content = await until(() => h.querySelector(".cm-content"), "CodeMirror in beta's editor");
  const text = await until(() => (content.textContent ?? "").trim(), "decompiled source in the editor");
  expect(text).toBe("beta = alpha + 1");
  return "ok";
}), {timeout: 60000}));};
const _e5t23 = function _test_e5_shift_enter_recompiles_the_cell_in_place(e5_tests_enabled,ui,e5Fixture,EditorView,runtime,expect) {return (!e5_tests_enabled ? "skipped" : ui.scenario((t) => e5Fixture(t, async ({module, v, host, cellNode, until}) => {
  const h = host(v.beta);
  await t.click(h.querySelector(".hotbar"));
  const cm = await until(() => h.querySelector(".cm-editor"), "CodeMirror in beta's editor");
  await until(() => (cm.querySelector(".cm-content")?.textContent ?? "").trim(), "decompiled source in the editor");
  const view = EditorView.findFromDOM(cm);
  view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: "beta = alpha + 100"}});
  view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", code: "Enter", keyCode: 13, shiftKey: true, bubbles: true, cancelable: true}));
  await until(() => v.beta._value === 101, "beta computing 101");
  const betas = [...runtime._variables].filter((x) => x._module === module && x._name === "beta");
  expect(betas).toEqual([v.beta]);
  expect(cellNode(v.beta)?.nextSibling).toBe(host(v.beta));
  expect(view.state.doc.toString()).toBe("beta = alpha + 100");
  return "ok";
}), {timeout: 60000}));};
const _e5t24 = function _test_e5_add_button_places_the_new_cell_after_its_anchor(e5_tests_enabled,ui,e5Fixture,runtime,expect) {return (!e5_tests_enabled ? "skipped" : ui.scenario((t) => e5Fixture(t, async ({module, v, host, cellNode, moduleNodes, until}) => {
  const before = new Set(runtime._variables);
  await t.click(host(v.alpha).querySelector(".add-cell-btn"));
  const [added] = await until(() => {
    const fresh = [...runtime._variables].filter((x) => x._module === module && !before.has(x));
    return fresh.length ? fresh : null;
  }, "a new variable in the module");
  const order = [...runtime._variables].filter((x) => x._module === module);
  expect(order.indexOf(added)).toBe(order.indexOf(v.alpha) + 1);
  const node = await until(() => cellNode(added), "a node for the new cell");
  const nodes = moduleNodes(module);
  expect(nodes.indexOf(node)).toBe(nodes.indexOf(cellNode(v.alpha)) + 1);
  return "ok";
}), {timeout: 60000}));};
const _e5t25 = function _test_e5_delete_button_removes_the_cell(e5_tests_enabled,ui,e5Fixture,runtime,editors,expect) {return (!e5_tests_enabled ? "skipped" : ui.scenario((t) => e5Fixture(t, async ({v, host, cellNode, until}) => {
  const h = host(v.gamma);
  await t.click(h.querySelector(".hotbar"));
  const bin = await until(() => [...h.querySelectorAll("button")].find((b) => b.textContent.trim() === "🗑️"), "the delete button in gamma's editor");
  await t.click(bin);
  await until(() => ![...runtime._variables].includes(v.gamma), "gamma leaving the runtime");
  await until(() => !cellNode(v.gamma), "gamma's node leaving the page");
  await until(() => !editors.has(v.gamma), "gamma's editor being released");
  expect(cellNode(v.alpha)?.nextSibling).toBe(host(v.alpha));
  return "ok";
}), {timeout: 60000}));};
const _e5t26 = function _test_e5_hotbar_drag_reorders_and_the_editor_follows(e5_tests_enabled,ui,e5Fixture,runtime) {return (!e5_tests_enabled ? "skipped" : ui.scenario((t) => e5Fixture(t, async ({module, v, host, cellNode, moduleNodes, until}) => {
  const grip = host(v.gamma).querySelector(".hotbar");
  grip.scrollIntoView({block: "center"});
  const g = grip.getBoundingClientRect();
  const a = cellNode(v.alpha).getBoundingClientRect();
  const x = g.left + 10, y = g.top + g.height / 2, ty = a.top + 2;
  const fire = (type, clientY) => grip.dispatchEvent(new PointerEvent(type, {pointerId: 71, button: 0, clientX: x, clientY, bubbles: true, cancelable: true}));
  fire("pointerdown", y);
  for (let i = 1; i <= 10; i++) fire("pointermove", y + ((ty - y) * i) / 10);
  fire("pointerup", ty);
  await until(() => {
    const order = [...runtime._variables].filter((x) => x._module === module);
    return order.indexOf(v.gamma) < order.indexOf(v.alpha);
  }, "gamma before alpha in the runtime");
  await until(() => {
    const nodes = moduleNodes(module);
    return nodes.indexOf(cellNode(v.gamma)) === 0 && Object.values(v).every((x) => cellNode(x)?.nextSibling === host(x));
  }, "gamma's node first, every editor beside its cell");
  return "ok";
}), {timeout: 60000}));};
const _e5t27 = function _test_e5_cell_options_round_trip(e5_tests_enabled,ui,e5Fixture,$0,expect) {return (!e5_tests_enabled ? "skipped" : ui.scenario((t) => e5Fixture(t, async ({name, v, until}) => {
  // read at call time: findCell (and so setOption/getOption) is redefined when the fixture adds a module,
  // and a test cell depending on them would restart part way through
  const setOption = await t.value("setOption"), getOption = await t.value("getOption");
  // findCell reads liveCellMap, which learns of the module a tick after its variables exist
  let last;
  await until(() => {
    try { last = getOption(v.alpha, "e5_probe", "absent"); } catch (e) { last = String(e); }
    return last === "absent";
  }, "alpha in the cell map").catch((e) => { throw new Error(`${e.message}; last getOption: ${JSON.stringify(last)}`); });
  setOption(v.alpha, "e5_probe", 7);
  expect(getOption(v.alpha, "e5_probe", 0)).toBe(7);
  expect($0.value?.[name]?.alpha?.e5_probe).toBe(7);
  expect(getOption(v.beta, "e5_probe", 0)).toBe(0);
  return "ok";
}), {timeout: 60000}));};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_e5t20", null, ["md"], _e5t20);
  $def("_e5t21", "e5Fixture", ["createModule","deleteModule","runtime","realize","linkTo","navigate","editors","divToVar","viewof options","Event"], _e5t21);
  $def("_e5t22", "test_e5_hotbar_opens_the_decompiled_source", ["e5_tests_enabled","ui","e5Fixture","expect"], _e5t22);
  $def("_e5t23", "test_e5_shift_enter_recompiles_the_cell_in_place", ["e5_tests_enabled","ui","e5Fixture","EditorView","runtime","expect"], _e5t23);
  $def("_e5t24", "test_e5_add_button_places_the_new_cell_after_its_anchor", ["e5_tests_enabled","ui","e5Fixture","runtime","expect"], _e5t24);
  $def("_e5t25", "test_e5_delete_button_removes_the_cell", ["e5_tests_enabled","ui","e5Fixture","runtime","editors","expect"], _e5t25);
  $def("_e5t26", "test_e5_hotbar_drag_reorders_and_the_editor_follows", ["e5_tests_enabled","ui","e5Fixture","runtime"], _e5t26);
  $def("_e5t27", "test_e5_cell_options_round_trip", ["e5_tests_enabled","ui","e5Fixture","viewof options","expect"], _e5t27);
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));
  main.define("navigate", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("navigate", _));
  return main;
}
