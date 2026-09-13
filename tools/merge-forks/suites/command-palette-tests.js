const _cpt00 = function _cpt00(md) {return (md`## Tests

Written 2026-09-14, before cell-map-2 is merged into cell-map (T7 in \`plan/merging-the-notebook-kit-forks.md\`). The palette's cell search reads \`liveCellMap\` and \`modules\` from cell-map, so these tests are how a change to the map's shape shows up here.

Each test adds a throwaway module with runtime-sdk's \`createModule\` holding one uniquely named cell, waits for the palette to find it, and deletes the module in \`finally\`. The palette overlay is driven through its own \`_openPalette\` / input events / Enter key.

**Gate.** Each test resolves to a \`skipped:\` string until *Run command-palette tests* is on. Add \`&cp_tests\` to the hash to start with it on. The navigation test changes \`location.hash\` and puts it back.`);};
const _cpt01 = function _cp_tests_enabled(Inputs,location) {return (Inputs.toggle({
  label: "Run command-palette tests",
  value: /(^#|&)cp_tests(=|&|$)/.test(location.hash)
}));};
const _cpt02 = (G, _) => G.input(_);
const _cpt03 = function _cpFixture(createModule,deleteModule,runtime,commandPaletteOverlay,cp_tests_enabled) {
  const skipped = "skipped: turn on 'Run command-palette tests' (or add &cp_tests to the hash) to run this scenario";
  let serial = 0;
  const rows = () => [...commandPaletteOverlay.querySelectorAll(".command-palette-result")].map((row) => ({
    row,
    label: row.querySelector(".command-palette-label")?.textContent ?? "",
    module: row.querySelector(".command-palette-module")?.textContent ?? "",
    href: row.getAttribute("href")
  }));
  const type = (text) => {
    const input = commandPaletteOverlay.querySelector(".command-palette-input");
    input.value = text;
    input.dispatchEvent(new Event("input"));
    return input;
  };
  const until = async (fn, what, timeout = 15000) => {
    const t0 = Date.now();
    for (;;) {
      const got = fn();
      if (got) return got;
      if (Date.now() - t0 > timeout) throw new Error(`${what} not reached within ${timeout}ms`);
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  return async (fn) => {
    if (!cp_tests_enabled) return skipped;
    const id = `${Date.now().toString(36)}${serial++}`;
    const moduleName = `@cp-test/m-${id}`, cellName = `cp_fixture_${id}`;
    const module = createModule(moduleName, runtime);
    try {
      module.variable(true).define(cellName, [], () => 42);
      commandPaletteOverlay._openPalette();
      const found = await until(() => {
        type(cellName);
        return rows().find((r) => r.label === cellName);
      }, `a result row for ${cellName}`);
      return await fn({found, rows, type, until, moduleName, cellName});
    } finally {
      commandPaletteOverlay._closePalette();
      deleteModule(moduleName, runtime);
    }
  };
};
const _cpt10 = function _test_cp_search_lists_a_new_cell(cpFixture,linkTo,expect) {return (
cpFixture(({found, moduleName, cellName}) => {
  expect({label: found.label, module: found.module}).toEqual({label: cellName, module: moduleName});
  expect(found.href).toBe(linkTo(`${moduleName}#${cellName}`));
  return "ok";
})
)};
const _cpt11 = function _test_cp_enter_navigates_to_the_cell(cpFixture,commandPaletteOverlay,linkTo,location,expect) {return (
cpFixture(async ({found, until, moduleName, cellName}) => {
  const before = location.hash;
  try {
    const input = commandPaletteOverlay.querySelector(".command-palette-input");
    const target = found.href.slice(found.href.indexOf("#"));
    expect(target).toBe(linkTo(`${moduleName}#${cellName}`).slice(linkTo(`${moduleName}#${cellName}`).indexOf("#")));
    input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
    await until(() => location.hash !== before, "the hash to change");
    expect(commandPaletteOverlay._isOpen()).toBe(false);
    expect(decodeURIComponent(location.hash)).toContain(cellName);
    return "ok";
  } finally {
    location.hash = before;
  }
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_cpt00", null, ["md"], _cpt00);
  $def("_cpt01", "viewof cp_tests_enabled", ["Inputs","location"], _cpt01);
  $def("_cpt02", "cp_tests_enabled", ["Generators","viewof cp_tests_enabled"], _cpt02);
  $def("_cpt03", "cpFixture", ["createModule","deleteModule","runtime","commandPaletteOverlay","cp_tests_enabled"], _cpt03);
  $def("_cpt10", "test_cp_search_lists_a_new_cell", ["cpFixture","linkTo","expect"], _cpt10);
  $def("_cpt11", "test_cp_enter_navigates_to_the_cell", ["cpFixture","commandPaletteOverlay","linkTo","location","expect"], _cpt11);
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}
