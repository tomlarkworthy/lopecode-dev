// @tomlarkworthy/robocoop-4-tools — the live, pluggable tool registry.
//
// This is the seam other notebooks plug into. `viewof rc4_tools` is a reactive array of tool
// objects (the idiomatic Inputs.input([]) pattern). The engine's session reads it LIVE on every
// step, so a tool registered here mid-conversation is offered to the model on the next turn — no
// restart. Tools are core tool objects: { id, description, parameters, execute }.
//
// Exports: viewof rc4_tools, rc4_tools, registerTool, unregisterTool, rc4_watchBus.

const _seed = () => 1;

const _title = function _title(md){return(
md`### robocoop-4 tools
Live registry. \`registerTool(tool)\` from any cell/notebook adds a tool mid-conversation.`
)};

// viewof rc4_tools — reactive array of tool objects, seeded with the bash tool from the core.
const _rc4_tools = function _rc4_tools(Inputs, createBashTool){
  return Inputs.input([ createBashTool() ]);
};

// registerTool(tool) — add (or replace by id) a tool in the live registry, firing the input event
// so dependents (the session's toolsProvider) see it immediately. $0 = viewof rc4_tools element.
const _registerTool = function _registerTool($0){
  return function registerTool(tool){
    if (!tool || !tool.id) throw new Error("registerTool: tool needs an id");
    const el = $0;
    const cur = Array.isArray(el.value) ? el.value : [];
    el.value = cur.filter(t => t.id !== tool.id).concat([tool]);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return tool;
  };
};

// unregisterTool(id) — remove a tool by id from the live registry.
const _unregisterTool = function _unregisterTool($0){
  return function unregisterTool(id){
    const el = $0;
    const cur = Array.isArray(el.value) ? el.value : [];
    el.value = cur.filter(t => t.id !== id);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
};

// toolsView — plain-named alias of the viewof element, so other modules can read the live registry
// WITHOUT importing a `viewof`-named symbol (editor-5 mangles `viewof X` imports → bare `viewof`).
const _toolsView = function _toolsView($0){ return $0; };

// rc4_watchBus — shared buffer for variable WATCHES. The watch tools (host integration) attach observers to
// cells and push value-CHANGE events here; the engine's agent session drains them at the top of every step
// and injects them, so changes to watched runtime values STREAM to the model automatically (no polling). It is
// a singleton across modules for the same reason registerTool above reaches the session's view: the runtime
// dedupes a module instance by its definition. `pending` is coalesced to the latest value per watch.
const _rc4_watchBus = function _rc4_watchBus(){
  const active = new Map();    // id -> { label, dispose, last }
  const pending = new Map();   // label -> latest text since last drain
  return {
    register(id, label, dispose, last) { try { active.get(id)?.dispose?.(); } catch (e) {} active.set(id, { label, dispose, last }); },
    has(id) { return active.has(id); },
    remove(id) { const e = active.get(id); if (!e) return false; try { e.dispose && e.dispose(); } catch (x) {} active.delete(id); return true; },
    record(id, text) {
      const e = active.get(id); if (!e || e.last === text) return;
      const first = e.last === undefined;   // baseline (set at register) is not streamed
      e.last = text;
      if (!first) pending.set(e.label, text);
    },
    list() { return [...active.values()].map((e) => ({ label: e.label, last: e.last })); },
    drain() { if (!pending.size) return []; const out = [...pending].map(([l, t]) => l + ' = ' + t); pending.clear(); return out; },
  };
};

// status — small reactive readout of the current tool ids.
const _status = function _status(html, rc4_tools){
  return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#8b949e">${rc4_tools.length} tool(s): ${rc4_tools.map(t => t.id).join(", ")}</div>`;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("rc4t_seed", "__seed", [], _seed);
  $def("rc4t_title", null, ["md"], _title);

  // Import the bash tool from the literate core (was window.__rc4core).
  main.define("module @tomlarkworthy/robocoop-4-core", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-core.js?v=4")).default));
  main.define("createBashTool", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("createBashTool", _));

  $def("rc4t_tools_view", "viewof rc4_tools", ["Inputs", "createBashTool"], _rc4_tools);
  main.variable(observer("rc4_tools")).define("rc4_tools", ["Generators", "viewof rc4_tools"], (G, _) => G.input(_));
  $def("rc4t_register", "registerTool", ["viewof rc4_tools"], _registerTool);
  $def("rc4t_unregister", "unregisterTool", ["viewof rc4_tools"], _unregisterTool);
  $def("rc4t_toolsView", "toolsView", ["viewof rc4_tools"], _toolsView);
  $def("rc4t_watch_bus", "rc4_watchBus", [], _rc4_watchBus);
  $def("rc4t_status", null, ["html", "rc4_tools"], _status);
  return main;
}
