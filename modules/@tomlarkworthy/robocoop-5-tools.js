// @tomlarkworthy/robocoop-5-tools — the live, pluggable tool registry (robocoop-5).
//
// Backed by @tomlarkworthy/plugin-registry: tools live in the shared `plugins` set named "rc5-tools".
// ANY notebook can `import {plugins}` and `plugins.add("rc5-tools", tool)` to offer the agent a tool —
// no import of this module required (N providers ↔ 1 consumer, the engine). This module keeps the
// id-keyed `registerTool`/`unregisterTool` convenience API (replace-by-id) over that bus, plus a stable
// `toolsView` the engine reads live each step, so a tool registered mid-conversation is offered on the
// next turn — no restart. Tools are core tool objects: { id, description, parameters, execute }.
//
// Exports: registerTool, unregisterTool, toolsView, rc5_tools, rc5_watchBus.

const _seed = () => 1;

const _title = function _title(md){return(
md`### robocoop-5 tools
Live registry over [\`@tomlarkworthy/plugin-registry\`](https://observablehq.com/@tomlarkworthy/plugin-registry)
(set name \`"rc5-tools"\`). \`registerTool(tool)\` from any cell/notebook adds a tool mid-conversation, or
\`plugins.add("rc5-tools", tool)\` directly. No bash — the default surface is Claude-Code-style file tools +
grep/glob, registered by robocoop-5-srctools.`
)};

// rc5_toolMgr — id-keyed adapter over the shared plugins bus. Holds a tool.id→remove() map so
// re-registering an id replaces (rather than duplicates) the prior value in the "rc5-tools" set.
const _rc5_toolMgr = function _rc5_toolMgr(plugins){
  const handles = new Map();   // tool.id -> remove()
  return {
    register(tool){
      if (!tool || !tool.id) throw new Error("registerTool: tool needs an id");
      const prev = handles.get(tool.id);
      if (prev) prev();                                  // replace-by-id
      handles.set(tool.id, plugins.add("rc5-tools", tool));
      return tool;
    },
    unregister(id){
      const remove = handles.get(id);
      if (remove) { remove(); handles.delete(id); }
    },
  };
};

// registerTool(tool) — add (or replace by id) a tool in the live registry. Fires through plugins so every
// consumer (the engine's toolsProvider) sees it immediately.
const _registerTool = function _registerTool(rc5_toolMgr){
  return (tool) => rc5_toolMgr.register(tool);
};

// unregisterTool(id) — remove a tool by id from the live registry.
const _unregisterTool = function _unregisterTool(rc5_toolMgr){
  return (id) => rc5_toolMgr.unregister(id);
};

// rc5_tools — reactive array of the current tool set (re-yields on every add/remove). Drives the status
// readout; a generator cell, so dependents recompute on change.
const _rc5_tools = function _rc5_tools(plugins){
  return plugins.get("rc5-tools");
};

// toolsView — a STABLE handle whose `.value` tracks the live "rc5-tools" set. The engine's session is
// created once (depends on this stable object) and reads `toolsView.value` synchronously each step, so
// tool changes never recreate the session. Kept current by a subscription to plugins.get; the double
// await reads both Generators.observe protocols (legacy sync-iter-of-promises and 2.0 async-gen).
const _toolsView = function _toolsView(plugins, invalidation){
  const view = { value: [] };
  const gen = plugins.get("rc5-tools");
  let live = true;
  (async () => {
    while (live) {
      const step = await gen.next();
      if (step.done) break;
      view.value = (await step.value) ?? [];
    }
  })();
  invalidation.then(() => { live = false; try { gen.return && gen.return(); } catch (e) {} });
  return view;
};

// rc5_watchBus — shared buffer for variable WATCHES. The watch tools attach observers to cells and push
// value-CHANGE events here; the engine's agent session drains them at the top of every step and injects
// them, so changes to watched runtime values STREAM to the model automatically (no polling). Singleton
// across modules (the runtime dedupes a module instance by its definition). `pending` is coalesced to
// the latest value per watch.
const _rc5_watchBus = function _rc5_watchBus(){
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
const _status = function _status(html, rc5_tools){
  return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#8b949e">${rc5_tools.length} tool(s): ${rc5_tools.map(t => t.id).join(", ") || "(none yet — mount robocoop-5-srctools)"}</div>`;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/plugin-registry", async () =>
    runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));

  $def("rc5t_seed", "__seed", [], _seed);
  $def("rc5t_title", null, ["md"], _title);
  $def("rc5t_tool_mgr", "rc5_toolMgr", ["plugins"], _rc5_toolMgr);
  $def("rc5t_register", "registerTool", ["rc5_toolMgr"], _registerTool);
  $def("rc5t_unregister", "unregisterTool", ["rc5_toolMgr"], _unregisterTool);
  $def("rc5t_tools", "rc5_tools", ["plugins"], _rc5_tools);
  $def("rc5t_toolsView", "toolsView", ["plugins", "invalidation"], _toolsView);
  $def("rc5t_watch_bus", "rc5_watchBus", [], _rc5_watchBus);
  $def("rc5t_status", null, ["html", "rc5_tools"], _status);
  return main;
}
