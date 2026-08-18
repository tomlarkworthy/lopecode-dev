const _17mvjwx = function ___seed(){return(
1
)};
const _1iqd1vs = function _2(md){return(
md`### robocoop-5 tools
Live registry over [\`@tomlarkworthy/plugin-registry\`](https://observablehq.com/@tomlarkworthy/plugin-registry)
(set name \`"rc5-tools"\`). \`registerTool(tool)\` from any cell/notebook adds a tool mid-conversation, or
\`plugins.add("rc5-tools", tool)\` directly. No bash — the default surface is Claude-Code-style file tools +
grep/glob, registered by robocoop-5-srctools.

Situational context uses the same shape under set name \`"rc5-context"\`: \`registerContext({id, label,
scope: 'session'|'turn', priority, budget, weak, render})\` from any cell/notebook teaches the agent about
the current situation (what is on screen, recent edits, the document's own state). \`contextView\` is the
mutable box the engine reads at each turn — like \`toolsView\`, deliberately not reactive so registering a
provider mid-conversation cannot rebuild the session.`
)};
const _17jpbf2 = function _rc5_toolMgr(plugins)
{
  const handles = new Map();
  // tool.id -> remove()
  return {
    register(tool) {
      if (!tool || !tool.id)
        throw new Error('registerTool: tool needs an id');
      const prev = handles.get(tool.id);
      if (prev)
        prev();
      // replace-by-id
      handles.set(tool.id, plugins.add('rc5-tools', tool));
      return tool;
    },
    unregister(id) {
      const remove = handles.get(id);
      if (remove) {
        remove();
        handles.delete(id);
      }
    }
  };
};
const _2b4tt9 = function _registerTool(rc5_toolMgr){return(
tool => rc5_toolMgr.register(tool)
)};
const _15um81e = function _unregisterTool(rc5_toolMgr){return(
id => rc5_toolMgr.unregister(id)
)};
const _1dzamy5 = function _rc5_tools(plugins){return(
plugins.get('rc5-tools')
)};
const _1pxjzps = function _toolsView(plugins,invalidation)
{
  const view = { value: [] };
  const gen = plugins.get('rc5-tools');
  let live = true;
  (async () => {
    while (live) {
      const step = await gen.next();
      if (step.done)
        break;
      view.value = await step.value ?? [];
    }
  })();
  invalidation.then(() => {
    live = false;
    try {
      gen.return && gen.return();
    } catch (e) {
    }
  });
  return view;
};
const _ctxmgr1 = function _rc5_contextMgr(plugins)
{
  // Mirror of rc5_toolMgr for the 'rc5-context' set. id → {remove, weak}; re-register replaces,
  // except a `weak` provider never displaces an existing one (so a tier-1 DOM fallback loses to a
  // richer owner-registered provider regardless of boot order).
  const handles = new Map();
  return {
    register(provider) {
      if (!provider || !provider.id)
        throw new Error('registerContext: provider needs an id');
      const prev = handles.get(provider.id);
      if (prev) {
        if (provider.weak && !prev.weak)
          return provider;
        prev.remove();
      }
      handles.set(provider.id, {
        remove: plugins.add('rc5-context', provider),
        weak: !!provider.weak
      });
      return provider;
    },
    unregister(id) {
      const h = handles.get(id);
      if (h) {
        h.remove();
        handles.delete(id);
      }
    }
  };
};
const _ctxmgr2 = function _registerContext(rc5_contextMgr){return(
provider => rc5_contextMgr.register(provider)
)};
const _ctxmgr3 = function _unregisterContext(rc5_contextMgr){return(
id => rc5_contextMgr.unregister(id)
)};
const _ctxmgr4 = function _contextView(plugins,invalidation)
{
  // Mutable box (NOT a reactive array) — same reason as toolsView: the session must not take a
  // reactive dependency on the provider list, or registering a provider mid-conversation would
  // rebuild the session and wipe the chat history.
  const view = { value: [] };
  const gen = plugins.get('rc5-context');
  let live = true;
  (async () => {
    while (live) {
      const step = await gen.next();
      if (step.done)
        break;
      view.value = await step.value ?? [];
    }
  })();
  invalidation.then(() => {
    live = false;
    try {
      gen.return && gen.return();
    } catch (e) {
    }
  });
  return view;
};
const _16sx9jh = function _rc5_watchBus()
{
  const active = new Map();
  // id -> { label, dispose, last }
  const pending = new Map();
  // label -> latest text since last drain
  return {
    register(id, label, dispose, last) {
      try {
        active.get(id)?.dispose?.();
      } catch (e) {
      }
      active.set(id, {
        label,
        dispose,
        last
      });
    },
    has(id) {
      return active.has(id);
    },
    remove(id) {
      const e = active.get(id);
      if (!e)
        return false;
      try {
        e.dispose && e.dispose();
      } catch (x) {
      }
      active.delete(id);
      return true;
    },
    record(id, text) {
      const e = active.get(id);
      if (!e || e.last === text)
        return;
      const first = e.last === undefined;
      // baseline (set at register) is not streamed
      e.last = text;
      if (!first)
        pending.set(e.label, text);
    },
    list() {
      return [...active.values()].map(e => ({
        label: e.label,
        last: e.last
      }));
    },
    drain() {
      if (!pending.size)
        return [];
      const out = [...pending].map(([l, t]) => l + ' = ' + t);
      pending.clear();
      return out;
    }
  };
};
const _spgate1 = function _rc5_specGate(){return(
{ scorecard: null }
)};
const _spgate2 = function _specGateCheck(){return(
  (scorecard, summary) => {
    if (!scorecard || !Array.isArray(scorecard.failing) || !scorecard.failing.length)
      return null;
    if (String(summary ?? '').includes('SPEC-WAIVER:'))
      return null;
    const k = scorecard.failing.length;
    const n = scorecard.total ?? k;
    const shown = scorecard.failing.slice(0, 6).map(f => f && f.name ? f.name : String(f));
    const names = shown.join(', ') + (k > shown.length ? ', \u2026' : '');
    return 'REJECTED: the spec scorecard reports ' + k + '/' + n + ' examples FAILING (' + names + '). ' + 'Fix /src/@user/solution.js, or if an example itself mis-transcribes the spec, correct ' + '/src/@user/spec.js. To knowingly complete anyway, include ' + '"SPEC-WAIVER: <example name> \u2014 <reason>" in your summary.';
  }
)};
const _1yx9hra = function _9(html,rc5_tools){return(
html`<div style="font:12px ui-monospace,Menlo,monospace;color:#8b949e">${ rc5_tools.length } tool(s): ${ rc5_tools.map(t => t.id).join(', ') || '(none yet \u2014 mount robocoop-5-srctools)' }</div>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  $def("_17mvjwx", "__seed", [], _17mvjwx);  
  $def("_1iqd1vs", null, ["md"], _1iqd1vs);  
  $def("_17jpbf2", "rc5_toolMgr", ["plugins"], _17jpbf2);  
  $def("_2b4tt9", "registerTool", ["rc5_toolMgr"], _2b4tt9);  
  $def("_15um81e", "unregisterTool", ["rc5_toolMgr"], _15um81e);  
  $def("_1dzamy5", "rc5_tools", ["plugins"], _1dzamy5);  
  $def("_1pxjzps", "toolsView", ["plugins","invalidation"], _1pxjzps);
  $def("_ctxmgr1", "rc5_contextMgr", ["plugins"], _ctxmgr1);
  $def("_ctxmgr2", "registerContext", ["rc5_contextMgr"], _ctxmgr2);
  $def("_ctxmgr3", "unregisterContext", ["rc5_contextMgr"], _ctxmgr3);
  $def("_ctxmgr4", "contextView", ["plugins","invalidation"], _ctxmgr4);
  $def("_16sx9jh", "rc5_watchBus", [], _16sx9jh);
  $def("_spgate1", "rc5_specGate", [], _spgate1);
  $def("_spgate2", "specGateCheck", [], _spgate2);
  $def("_1yx9hra", null, ["html","rc5_tools"], _1yx9hra);
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));
  return main;
}