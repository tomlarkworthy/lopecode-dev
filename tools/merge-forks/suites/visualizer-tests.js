const _vzt00 = function _29(md) {return (md`## Tests

Behavioural tests for \`visualizer()\`, written 2026-09-13 so the original's behaviour is pinned before visualizer-2 is merged into it (T3 in \`plan/merging-the-notebook-kit-forks.md\`).

Each \`test_viz_*\` cell makes a throwaway module with runtime-sdk's \`createModule\`, mounts \`visualizer(runtime, options)\` on it in an off-screen host, changes the module's variables, and waits for the DOM to follow. The tests read only what \`visualizer()\` returns, so the same cells can run against visualizer-2. Everything a test creates is deleted in \`finally\`.

A fixture's first cell is a \`title\` string. \`@tomlarkworthy/modules\` computes a module's first cell to find its title, so without it the first cell under test would run before any visualizer observed it. Title cells, implicit builtin variables (\`Generators\`, \`@variable\`) and the builtin import header are left out of the names the tests compare.

**Gate.** Each test resolves to a \`skipped:\` string until *Run visualizer tests* is on. Add \`&viz_tests\` to the hash to start with it on.`);};
const _vzt01 = function _viz_tests_enabled(Inputs,location) {return (Inputs.toggle({
  label: "Run visualizer tests",
  value: /(^#|&)viz_tests(=|&|$)/.test(location.hash)
}));};
const _vzt02 = (G, _) => G.input(_);
const _vzt03 = function _vt(ui,runtime,createModule,deleteModule,visualizer,viz_tests_enabled) {
  const skipped = "skipped: turn on 'Run visualizer tests' (or add &viz_tests to the hash) to run this scenario";
  const host = () => {
    let h = document.getElementById("viz-tests-host");
    if (!h) {
      h = Object.assign(document.createElement("div"), {id: "viz-tests-host"});
      h.style.cssText = "position:absolute;left:-10000px;top:0;width:640px";
      document.body.appendChild(h);
    }
    return h;
  };
  const until = async (fn, what = "condition", timeout = 8000) => {
    const t0 = Date.now();
    for (;;) {
      let ok = false;
      try { ok = fn(); } catch {}
      if (ok) return ok;
      if (Date.now() - t0 > timeout) throw new Error(`vt.until: ${what} not reached within ${timeout}ms`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  // for asserting that nothing happens: long enough for runtime_variables -> cellMap -> syncers to run more than once
  const quiet = (ms = 2500) => new Promise((r) => setTimeout(r, ms));
  const titles = new WeakSet();
  const shown = (n) => n.classList.contains("observablehq") && !titles.has(n.variable) && n.variable?._type !== 2 && n.getAttribute("data-module-name") !== "builtin";
  const nodes = (root) => [...root.children].filter(shown);
  const label = (n) => n.classList.contains("lope-viz-import") ? `import ${n.getAttribute("data-module-name")}` : n.getAttribute("cell") ?? "<anon>";
  const names = (root) => nodes(root).map(label);
  const node = (root, name) => nodes(root).find((n) => n.getAttribute("cell") === name);
  const text = (root, name) => node(root, name)?.textContent ?? null;
  const own = (module) => [...runtime._variables].filter((v) => v._module === module && v._type === 1 && !titles.has(v));
  let counter = 0;
  const scenario = (fn, opts = {}) => !viz_tests_enabled ? Promise.resolve(skipped) : ui.scenario(async (t) => {
    const made = [], mounted = [];
    const fixture = () => {
      const name = `@viz-tests/fixture-${Date.now().toString(36)}-${counter++}`;
      made.push(name);
      const module = createModule(name, runtime);
      titles.add(module.variable().define("title", [], () => name));
      return module;
    };
    const mount = (module, options = {}) => {
      let invalidate;
      const invalidation = new Promise((r) => (invalidate = r));
      const el = visualizer(runtime, {invalidation, module, ...options});
      host().appendChild(el);
      const m = {el, root: el.firstElementChild, unmount: () => { invalidate(); el.remove(); }};
      mounted.push(m);
      return m;
    };
    try {
      return await fn({...t, fixture, mount, until, quiet, nodes, names, node, text, own});
    } finally {
      for (const m of mounted) m.unmount();
      for (const name of made) { try { deleteModule(name, runtime); } catch {} }
      await ui.settle();
    }
  }, {timeout: 30000, ...opts});
  return {scenario, skipped, host, until, quiet, nodes, names, node, text, own};
};
const _vzt10 = function _test_viz_renders_cells_in_runtime_order(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  module.variable().define("b", ["a"], (a) => a + 1);
  module.variable().define(null, ["b"], (b) => b * 10);
  const {root} = t.mount(module);
  await t.until(() => t.nodes(root).length === 3 && t.nodes(root)[2].textContent.includes("20"), "3 rendered cells");
  expect(t.names(root)).toEqual(["a", "b", "<anon>"]);
  const vars = t.own(module);
  expect(t.nodes(root).map((n, i) => n.variable === vars[i])).toEqual([true, true, true]);
  expect(t.text(root, "a")).toContain("1");
  expect(t.text(root, "b")).toContain("2");
  return `rendered ${t.names(root).join(", ")} in runtime order`;
}));};
const _vzt11 = function _test_viz_an_unobserved_cell_computes_once_rendered(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  let runs = 0;
  module.variable().define("lazy", [], () => ++runs);
  await t.quiet(1500);
  expect(runs).toBe(0);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "lazy")?.includes("1"), "lazy rendered");
  await t.quiet(1000);
  expect(runs).toBe(1);
  return "a lazy cell ran once, when the visualizer observed it";
}));};
const _vzt12 = function _test_viz_redefinition_updates_the_same_node(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("b", ["a"], (a) => a + 1);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "b")?.includes("2"), "b = 2");
  const [na, nb] = [t.node(root, "a"), t.node(root, "b")];
  a.define("a", [], () => 41);
  await t.until(() => t.text(root, "b")?.includes("42"), "b = 42 after redefining a");
  expect(t.node(root, "a") === na).toBe(true);
  expect(t.node(root, "b") === nb).toBe(true);
  expect(t.names(root)).toEqual(["a", "b"]);
  return "redefining a updated a and b in their existing nodes";
}));};
const _vzt13 = function _test_viz_renamed_variable_keeps_its_node(vt,expect) {return (vt.scenario(async (t) => {
  // The node's cell= attribute is set when its inspector is made and is not updated on a rename
  // (measured 2026-09-13: still "a" after renaming to z). Not asserted either way.
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b", "a and b");
  const na = t.nodes(root)[0];
  a.define("z", [], () => 26);
  await t.until(() => t.nodes(root)[0]?.textContent.includes("26"), "renamed cell shows 26");
  expect(t.nodes(root)[0] === na).toBe(true);
  expect(t.nodes(root).length).toBe(2);
  return "renaming a to z kept its node and position";
}));};
const _vzt14 = function _test_viz_delete_removes_only_that_node(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  const b = module.variable().define("b", [], () => 2);
  module.variable().define("c", [], () => 3);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b,c" && t.text(root, "c")?.includes("3"), "a, b, c");
  const [na, nc] = [t.node(root, "a"), t.node(root, "c")];
  b.delete();
  await t.until(() => t.names(root).join() === "a,c", "b removed");
  expect(t.node(root, "a") === na).toBe(true);
  expect(t.node(root, "c") === nc).toBe(true);
  return "deleting b removed its node and kept a and c";
}));};
const _vzt1g = function _test_viz_a_cell_leaving_the_map_releases_its_observer(vt,expect) {return (vt.scenario(async (t) => {
  // cell-map drops "dynamic …" variables, so renaming one takes it out of the map while it still exists
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  const b = module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b" && t.text(root, "b")?.includes("2"), "a, b");
  expect(!!b._observer?.__observe_listeners__).toBe(true);
  b.define("dynamic b", [], () => 3);
  await t.until(() => t.names(root).join() === "a", "b's node removed");
  await t.until(() => !b._observer?.__observe_listeners__, "b's observer released");
  return "a variable that left the cell map lost both its node and its observer";
}));};
const _vzt15 = function _test_viz_new_and_moved_cells_follow_runtime_order(vt,runtime,repositionSetElement,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  const b = module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b", "a, b");
  const d = module.variable().define("d", [], () => 4);
  await t.until(() => t.names(root).join() === "a,b,d" && t.text(root, "d")?.includes("4"), "d appended");
  const nd = t.node(root, "d");
  repositionSetElement(runtime._variables, d, [...runtime._variables].indexOf(b));
  await t.until(() => t.names(root).join() === "a,d,b", "d moved before b");
  expect(t.node(root, "d") === nd).toBe(true);
  return "a new cell rendered last, and moving it in runtime._variables moved its node";
}));};
const _vzt16 = function _test_viz_viewof_renders_one_node_holding_the_view(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const input = Object.assign(document.createElement("input"), {type: "range", min: 0, max: 10, step: 1});
  input.value = "3";
  module.variable().define("viewof x", [], () => input);
  module.variable().define("x", ["Generators", "viewof x"], (G, _) => G.input(_));
  module.variable().define("y", ["x"], (x) => x * 2);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "y")?.includes("6"), "y = 6");
  expect(t.names(root)).toEqual(["viewof x", "y"]);
  expect(t.node(root, "viewof x").contains(input)).toBe(true);
  await t.set(input, 7);
  await t.until(() => t.text(root, "y")?.includes("14"), "y = 14 after moving the range");
  expect(t.node(root, "viewof x").contains(input)).toBe(true);
  return "viewof x rendered once, holding its input; moving it updated y";
}));};
const _vzt17 = function _test_viz_mutable_renders_its_live_value(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("initial m", [], () => 1);
  module.variable().define("mutable m", ["Mutable", "initial m"], (M, v) => new M(v));
  module.variable().define("m", ["mutable m"], (_) => _.generator);
  module.variable().define("twice", ["m"], (m) => m * 2);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "twice")?.includes("2"), "twice = 2");
  expect(t.names(root)).toEqual(["m", "twice"]);
  (await module.value("mutable m")).value = 5;
  await t.until(() => t.text(root, "m")?.includes("5") && t.text(root, "twice")?.includes("10"), "m = 5, twice = 10");
  return "mutable m rendered as one node showing m, and followed an assignment";
}));};
const _vzt18 = function _test_viz_imports_render_one_header_per_module(vt,runtime,expect) {return (vt.scenario(async (t) => {
  const urls = [...runtime._variables].find((v) => v._name === "module @tomlarkworthy/lopepage-urls" && v._value)?._value;
  expect(!!urls).toBe(true);
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("module @tomlarkworthy/lopepage-urls", [], () => urls);
  module.variable().define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));
  module.variable().define("nh", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("navHref", "nh", _));
  const {root} = t.mount(module);
  await t.until(() => root.querySelector(".lope-viz-import[data-module-name='@tomlarkworthy/lopepage-urls'] a"), "import header with links");
  const headers = root.querySelectorAll(".lope-viz-import[data-module-name='@tomlarkworthy/lopepage-urls']");
  expect(headers.length).toBe(1);
  const header = headers[0];
  expect(header.getAttribute("data-cell-type")).toBe("import");
  expect(t.names(root)).toEqual(["a", "import @tomlarkworthy/lopepage-urls"]);
  const statement = header.querySelector(".lope-viz-import-statement").textContent;
  expect(statement).toContain("linkTo");
  expect(statement).toContain("as nh");
  expect(statement).toContain('"@tomlarkworthy/lopepage-urls"');
  const link = [...header.querySelectorAll("a")].find((el) => el.textContent === "linkTo");
  expect(link.getAttribute("href")).toContain("open=");
  a.define("a", [], () => 2);
  await t.until(() => t.text(root, "a")?.includes("2"), "a = 2");
  expect(root.querySelector(".lope-viz-import[data-module-name='@tomlarkworthy/lopepage-urls']") === header).toBe(true);
  return `one import header: ${statement}`;
}));};
const _vzt19 = function _test_viz_filter_sees_every_cell_with_its_index(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  module.variable().define("b", [], () => 2);
  module.variable().define("c", [], () => 3);
  const calls = [];
  const filter = (name, variables, i, state) => {
    calls.push({name, i, state, variables});
    return name !== "b";
  };
  const {root} = t.mount(module, {filter});
  await t.until(() => t.names(root).join() === "a,c" && t.text(root, "c")?.includes("3"), "a and c rendered, b filtered out");
  const passes = [];
  for (const c of calls) {
    if (c.i === 0) passes.push([]);
    passes.at(-1).push(c);
  }
  for (const p of passes) {
    expect(p.map((c) => c.i)).toEqual(p.map((_, k) => k));
    expect(new Set(p.map((c) => c.state)).size).toBe(1);
  }
  expect(new Set(passes.map((p) => p[0].state)).size).toBe(passes.length);
  const last = passes.at(-1);
  expect(last.map((c) => c.name)).toEqual(["title", "a", "b", "c"]);
  expect(last.every((c) => Array.isArray(c.variables) && c.variables[0]?._name === c.name)).toBe(true);
  return `${passes.length} sync passes, each calling filter for every cell with i = 0.. and one fresh state object`;
}));};
const _vzt1a = function _test_viz_custom_inspector_nodes_carry_their_variable(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  module.variable().define("b", ["a"], (a) => a + 1);
  const roots = [];
  const inspector = (root) => {
    roots.push(root);
    return (variable) => {
      const node = document.createElement("div");
      node.className = "observablehq viz-custom-probe";
      return {
        _node: node,
        pending() { node.dataset.state = "pending"; },
        fulfilled(value) { node.dataset.state = "fulfilled"; node.textContent = `${variable._name}=${value}`; },
        rejected(error) { node.dataset.state = "rejected"; node.textContent = String(error); }
      };
    };
  };
  const {root} = t.mount(module, {inspector});
  await t.until(() => t.nodes(root).map((n) => n.textContent).join() === "a=1,b=2", "custom nodes a=1, b=2");
  expect(roots.length).toBe(1);
  expect(roots[0] === root).toBe(true);
  for (const n of t.nodes(root)) {
    expect(n.classList.contains("viz-custom-probe")).toBe(true);
    expect(n.variable._name).toBe(n.getAttribute("cell"));
    expect(n.dataset.state).toBe("fulfilled");
  }
  return "the factory was called once with the root; its nodes carry .variable and cell=";
}));};
const _vzt1b = function _test_viz_error_and_pending_states(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  let release;
  module.variable().define("boom", [], () => { throw new Error("boom"); });
  module.variable().define("slow", [], () => new Promise((r) => (release = r)));
  const {root} = t.mount(module);
  await t.until(() => t.node(root, "boom")?.classList.contains("observablehq--error"), "boom shows an error");
  expect(t.text(root, "boom")).toContain("boom");
  await t.until(() => release && t.node(root, "slow")?.classList.contains("observablehq--running"), "slow shows running");
  release(7);
  await t.until(() => t.text(root, "slow")?.includes("7") && !t.node(root, "slow").classList.contains("observablehq--running"), "slow resolves to 7");
  return "a throwing cell renders observablehq--error; a pending one observablehq--running until it resolves";
}));};
const _vzt1c = function _test_viz_two_visualizers_of_one_module_are_independent(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  const A = t.mount(module), B = t.mount(module);
  await t.until(() => t.text(A.root, "a")?.includes("1") && t.text(B.root, "a")?.includes("1"), "a in both");
  expect(t.node(A.root, "a") === t.node(B.root, "a")).toBe(false);
  a.define("a", [], () => 2);
  await t.until(() => t.text(A.root, "a")?.includes("2") && t.text(B.root, "a")?.includes("2"), "a = 2 in both");
  A.unmount();
  a.define("a", [], () => 3);
  await t.until(() => t.text(B.root, "a")?.includes("3"), "a = 3 in B after A unmounted");
  expect(A.root.isConnected).toBe(false);
  return "two visualizers of one module each rendered a; unmounting one left the other live";
}));};
const _vzt1d = function _test_viz_unmount_hands_variables_back(vt,$0,expect) {return (vt.scenario(async (t) => {
  // Disposal runs in syncers, which reruns on the next liveCellMap change, not on invalidation
  // itself (it depends on viewof visualizersToDelete, the view). So the test makes one more change.
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  const m = t.mount(module);
  await t.until(() => t.text(m.root, "a")?.includes("1"), "a rendered");
  expect(!!a._observer?.__observe_listeners__).toBe(true);
  expect($0.value.has(m.root)).toBe(true);
  m.unmount();
  module.variable().define("later", [], () => 0);
  await t.until(() => !a._observer?.__observe_listeners__, "observer handed back");
  await t.until(() => t.nodes(m.root).length === 0, "root emptied");
  await t.until(() => !$0.value.has(m.root), "root dropped from visualizers");
  a.define("a", [], () => 2);
  await t.quiet(1500);
  expect(t.nodes(m.root).length).toBe(0);
  return "after invalidation and the next change: root emptied, dropped from visualizers, observer restored";
}));};
const _vzt1e = function _test_viz_foreign_children_survive_a_sync(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b", "a, b");
  const note = Object.assign(document.createElement("p"), {textContent: "not a cell"});
  root.insertBefore(note, t.node(root, "b"));
  a.define("a", [], () => 5);
  module.variable().define("c", [], () => 3);
  await t.until(() => t.names(root).join() === "a,b,c" && t.text(root, "a")?.includes("5"), "a = 5 and c added");
  expect(note.parentNode === root).toBe(true);
  return "a child without the observablehq class stayed in the root across syncs";
}));};
const _vzt1f = function _test_viz_detachNodes_takes_an_element_value(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const probe = (text) => Object.assign(document.createElement("span"), {className: "viz-probe", textContent: text});
  const el = module.variable().define("el", [], () => probe("one"));
  const A = t.mount(module);
  await t.until(() => A.root.querySelector(".viz-probe"), "element rendered in A");
  const B = t.mount(module, {detachNodes: true});
  await t.until(() => B.root.querySelector(".viz-probe"), "element taken by B");
  expect(A.root.querySelector(".viz-probe")).toBe(null);
  el.define("el", [], () => probe("two"));
  await t.until(() => B.root.querySelector(".viz-probe")?.textContent === "two", "B holds the redefined element");
  expect(A.root.querySelector(".viz-probe")).toBe(null);
  return "a detachNodes visualizer took the element from the first, and kept the redefined one";
}));};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/ui-testing", async () => runtime.module((await import("/@tomlarkworthy/ui-testing.js?v=4")).default));
  main.define("ui", ["module @tomlarkworthy/ui-testing", "@variable"], (_, v) => v.import("ui", _));
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));
  main.define("visualizer", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("visualizer", _));
  main.define("viewof visualizers", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("viewof visualizers", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));
  $def("_vzt00", null, ["md"], _vzt00);
  $def("_vzt01", "viewof viz_tests_enabled", ["Inputs","location"], _vzt01);
  $def("_vzt02", "viz_tests_enabled", ["Generators","viewof viz_tests_enabled"], _vzt02);
  $def("_vzt03", "vt", ["ui","runtime","createModule","deleteModule","visualizer","viz_tests_enabled"], _vzt03);
  $def("_vzt10", "test_viz_renders_cells_in_runtime_order", ["vt","expect"], _vzt10);
  $def("_vzt11", "test_viz_an_unobserved_cell_computes_once_rendered", ["vt","expect"], _vzt11);
  $def("_vzt12", "test_viz_redefinition_updates_the_same_node", ["vt","expect"], _vzt12);
  $def("_vzt13", "test_viz_renamed_variable_keeps_its_node", ["vt","expect"], _vzt13);
  $def("_vzt14", "test_viz_delete_removes_only_that_node", ["vt","expect"], _vzt14);
  $def("_vzt1g", "test_viz_a_cell_leaving_the_map_releases_its_observer", ["vt","expect"], _vzt1g);
  $def("_vzt15", "test_viz_new_and_moved_cells_follow_runtime_order", ["vt","runtime","repositionSetElement","expect"], _vzt15);
  $def("_vzt16", "test_viz_viewof_renders_one_node_holding_the_view", ["vt","expect"], _vzt16);
  $def("_vzt17", "test_viz_mutable_renders_its_live_value", ["vt","expect"], _vzt17);
  $def("_vzt18", "test_viz_imports_render_one_header_per_module", ["vt","runtime","expect"], _vzt18);
  $def("_vzt19", "test_viz_filter_sees_every_cell_with_its_index", ["vt","expect"], _vzt19);
  $def("_vzt1a", "test_viz_custom_inspector_nodes_carry_their_variable", ["vt","expect"], _vzt1a);
  $def("_vzt1b", "test_viz_error_and_pending_states", ["vt","expect"], _vzt1b);
  $def("_vzt1c", "test_viz_two_visualizers_of_one_module_are_independent", ["vt","expect"], _vzt1c);
  $def("_vzt1d", "test_viz_unmount_hands_variables_back", ["vt","viewof visualizers","expect"], _vzt1d);
  $def("_vzt1e", "test_viz_foreign_children_survive_a_sync", ["vt","expect"], _vzt1e);
  $def("_vzt1f", "test_viz_detachNodes_takes_an_element_value", ["vt","expect"], _vzt1f);
  return main;
}
