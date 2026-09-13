const _17gav8v = function _e5_tests_enabled(Inputs) {return (Inputs.toggle({
  label: "run editor-5 tests",
  value: /[#&]e5_tests\b/.test(window.location.hash)
}));};
const _pchmem = (G, _) => G.input(_);
const _1pxteeb = function _test_e5_factory_change_reaches_attached_editors(e5_tests_enabled,ui,expect) {return (!e5_tests_enabled ? "skipped" : ui.scenario(async (t) => {
  // The reviewer's report (LIVE 2026, #8C): a change to the editor reached only editors
  // created after it. Everything attached is memoised in `editors`, so a redefined
  // `cellEditor` must evict and rebuild them.
  const settled = async (pred) => { for (let i = 0; i < 100 && !pred(); i++) await new Promise((r) => setTimeout(r, 200)); };
  // editors are attached by auto_attach after boot; this test can start before that
  const editorsMap = await t.value("editors");
  await settled(() => editorsMap.size > 0);
  const attached = [...editorsMap.values()];
  expect(attached.length).toBeGreaterThan(0);
  const v = t.findVariable("cellEditor");
  const inputs = v._inputs.map((i) => i._name);
  const definition = v._definition;
  const original = await t.value("cellEditor");
  const marked = (variable, opts) => {
    const host = original(variable, opts);
    host.dataset.e5probe = "1";
    return host;
  };
  try {
    v.define("cellEditor", [], () => marked);
    await t.settle();
    const now = [...(await t.value("editors")).values()];
    const stamped = now.filter((h) => h.dataset.e5probe === "1");
    const mounted = now.filter((h) => window.document.contains(h));
    expect(stamped.length).toBe(now.length);
    expect(mounted.length).toBe(now.length);
    return `${stamped.length}/${now.length} attached editors rebuilt by the new factory`;
  } finally {
    v.define("cellEditor", inputs, definition);
    await t.settle();
  }
}, {timeout: 40000}));};
const _1864toh = function _test_e5_factory_change_keeps_an_open_editor_open(e5_tests_enabled,ui,expect) {return (!e5_tests_enabled ? "skipped" : ui.scenario(async (t) => {
  // Rebuilding on a factory change must not close an editor the reader had open.
  // Open state is persisted per cell via getOption/setOption("pinned"), so a rebuilt
  // host should come back open.
  const isOpen = (h) => {
    const b = h && h.querySelector(".cell-editor-body");
    return !!b && b.childNodes.length > 0;
  };
  const until = async (fn, tries = 20) => {
    for (let i = 0; i < tries; i++) {
      if (fn()) return true;
      await t.settle();
    }
    return fn();
  };
  const settled = async (pred) => { for (let i = 0; i < 100 && !pred(); i++) await new Promise((r) => setTimeout(r, 200)); };
  const editorsMap = await t.value("editors");
  await settled(() => [...editorsMap.values()].some((h) => h.querySelector(".cell-editor-body") && !isOpen(h)));
  const entry = [...editorsMap.entries()].find(([, h]) => h.querySelector(".cell-editor-body") && !isOpen(h));
  expect(!!entry).toBe(true);
  const [variable, host] = entry;
  const v = t.findVariable("cellEditor");
  const inputs = v._inputs.map((i) => i._name);
  const definition = v._definition;
  const original = await t.value("cellEditor");
  try {
    await t.click(host.querySelector(".hotbar"));
    expect(await until(() => isOpen(host))).toBe(true);
    v.define("cellEditor", [], () => (vr, opts) => original(vr, opts));
    await t.settle();
    const rebuilt = (await t.value("editors")).get(variable);
    expect(rebuilt === host).toBe(false);
    expect(await until(() => isOpen(rebuilt))).toBe(true);
    return "an open editor stayed open across the factory swap";
  } finally {
    v.define("cellEditor", inputs, definition);
    await t.settle();
    const back = (await t.value("editors")).get(variable);
    if (isOpen(back)) await t.click(back.querySelector(".hotbar"));
  }
}, {timeout: 40000}));};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/ui-testing", async () => runtime.module((await import("/@tomlarkworthy/ui-testing.js?v=4")).default));  
  main.define("ui", ["module @tomlarkworthy/ui-testing", "@variable"], (_, v) => v.import("ui", _));  
  main.define("module @tomlarkworthy/testing", async () => runtime.module((await import("/@tomlarkworthy/testing.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("expect", _));  
  $def("_17gav8v", "viewof e5_tests_enabled", ["Inputs"], _17gav8v);  
  $def("_pchmem", "e5_tests_enabled", ["Generators","viewof e5_tests_enabled"], _pchmem);  
  $def("_1pxteeb", "test_e5_factory_change_reaches_attached_editors", ["e5_tests_enabled","ui","expect"], _1pxteeb);  
  $def("_1864toh", "test_e5_factory_change_keeps_an_open_editor_open", ["e5_tests_enabled","ui","expect"], _1864toh);
  return main;
}
