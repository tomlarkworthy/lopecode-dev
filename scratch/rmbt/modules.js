const _s7bl1p = function _1(md){return(
md`# Modules

\`modules(options?)\` is an async generator that yields a **cumulative \`Map\`** (module → \`{name, title, module, variable}\`) of every fully-formed record known so far, growing as modules resolve. 

It's an effecient alternative to [moduleMap](https://observablehq.com/@tomlarkworthy/module-map) that blocks until all modules are loaded.
`
)};
const _1eaa9lr = function _currentModules(modules){return(
modules()
)};
const _dmem61 = function _modules(runtime,observeVariable,moduleTitle)
{
  const _runtime = runtime;
  // default: the current runtime
  return function modules({runtime = _runtime, titleTimeoutMs = 2000, rescanMs = 1000, load = true} = {}) {
    if (!runtime || !runtime._variables)
      throw 'Invalid runtime passed to modules';
    return async function* () {
      const records = new Map();
      // module -> fully-formed record (title resolved before it lands here)
      const watchers = new Map();
      // module -> cancel fn (stops its title watch)
      const peeking = new Map();
      // unresolved `module X` variable -> stop fn (its force-load observer)
      let pending = false, wake = null, dirty = true;
      const bump = () => {
        pending = true;
        if (wake) {
          const w = wake;
          wake = null;
          w();
        }
      };
      const touch = () => {
        dirty = true;
        bump();
      };
      // Recover a module's @user/slug from its loader definition. On Observable's runtime the
      // `module X` variable is named numerically ("module 1"), so v._name.slice(7) is a useless id;
      // the real slug lives in the loader's import URL — import("/@user/slug.js?…") or
      // importShim("/@user/slug.js", …). Matches both runtimes; null if no URL is found.
      const slugFromDef = v => {
        const m = v._definition && String(v._definition).match(/import(?:Shim)?\(\s*["'`]\/?([^"'`?]+?)\.js(?:[?"'`)]|$)/);
        return m ? m[1].replace(/^\//, '') : null;
      };
      // Live candidate modules: Map<module, {name, variable?, title?}>. Side effect: force-loads
      // unresolved `module X` variables via observe (which marks them reachable) so their modules
      // become resolvable on a later scan.
      const scan = () => {
        const out = new Map();
        const put = (m, r) => {
          if (m && !out.has(m))
            out.set(m, r);
        };
        const builtin = runtime._builtin, bootloader = runtime.bootloader;
        if (builtin)
          put(builtin, {
            name: 'builtin',
            title: 'Standard library'
          });
        if (bootloader)
          put(bootloader, {
            name: 'bootloader',
            title: 'Bootloader'
          });
        for (const [name, mod] of runtime.mains || new Map())
          put(mod, { name });
        // main modules: variable-graph roots — own variables but aren't imported (nor builtin/
        // bootloader). Catches the top-level main of a plain runtime where runtime.mains is empty.
        const imported = new Set((runtime._modules || new Map()).values());
        const owners = new Set();
        for (const v of runtime._variables)
          if (v._module)
            owners.add(v._module);
        for (const m of owners)
          if (m !== builtin && m !== bootloader && !imported.has(m))
            put(m, { name: 'main' });
        // imported modules carried by `module X` variables
        for (const v of runtime._variables) {
          if (!v._name || !v._name.startsWith('module ') || v._name.startsWith('module <unknown'))
            continue;
          const mod = v._value;
          if (mod && typeof mod === 'object')
            put(mod, {
              name: slugFromDef(v) || v._name.slice(7),
              variable: v
            });
          else if (load && !peeking.has(v))
            peeking.set(v, observeVariable(v, {
              fulfilled: bump,
              error: bump
            }));
        }
        return out;
      };
      // Reconcile the snapshot with the live runtime each scan.
      const reconcile = () => {
        const cand = scan();
        // DELETE: drop modules no longer present; cancel their title watcher.
        for (const m of [...watchers.keys()]) {
          if (!cand.has(m)) {
            const cancel = watchers.get(m);
            watchers.delete(m);
            if (records.delete(m))
              touch();
            try {
              cancel();
            } catch (e) {
            }
          }
        }
        // CREATE: start a persistent title watch for each new module. The module enters `records`
        // only once its title resolves (or the timeout fires). Later title changes update in place.
        for (const [m, c] of cand) {
          if (watchers.has(m))
            continue;
          if (c.title != null) {
            // static title (builtin / bootloader)
            records.set(m, {
              name: c.name,
              title: c.title,
              module: m,
              variable: c.variable
            });
            watchers.set(m, () => {
            });
            touch();
            continue;
          }
          const apply = title => {
            if (!watchers.has(m))
              return;
            // module was pruned -> ignore late title callbacks
            const t = title ?? c.name;
            const prev = records.get(m);
            if (!prev) {
              records.set(m, {
                name: c.name,
                title: t,
                module: m,
                variable: c.variable
              });
              touch();
            } else if (prev.title !== t) {
              records.set(m, {
                ...prev,
                title: t
              });
              touch();
            }
          };
          const cancel = moduleTitle(m, apply);
          watchers.set(m, () => {
            try {
              cancel();
            } catch (e) {
            }
          });
          // title never resolved within the budget -> show the name so the module isn't withheld.
          setTimeout(() => {
            if (watchers.has(m) && !records.has(m))
              apply(null);
          }, titleTimeoutMs);
        }
      };
      let stopped = false;
      (async () => {
        while (!stopped) {
          try {
            reconcile();
          } catch (e) {
          }
          await new Promise(r => setTimeout(r, rescanMs));
        }
      })();
      try {
        while (true) {
          pending = false;
          if (dirty) {
            dirty = false;
            yield new Map(records);
          }
          // cumulative snapshot
          if (!pending)
            await new Promise(resolve => {
              wake = resolve;
              if (pending) {
                wake = null;
                resolve();
              }
            });
        }
      } finally {
        stopped = true;
        for (const cancel of watchers.values()) {
          try {
            cancel();
          } catch (e) {
          }
        }
        for (const stop of peeking.values()) {
          try {
            stop();
          } catch (e) {
          }
        }
      }
    }();
  };
};
const _up9atj = function _moduleTitle(observeVariable)
{
  return function moduleTitle(module, onTitle) {
    // Observes a module's title-defining cell and calls onTitle(title|null) on every change.
    // Returns a cancel fn. The fixed observe() forces a lazy title cell to compute (and replays
    // the current value on attach), so no in-module forcing helper is needed — works for named
    // and anonymous cells alike, even in a fresh runtime nothing else observes.
    const rt = module._runtime;
    const candidates = [...rt._variables].filter(v => {
      if (!v || v._module !== module || !v._definition || v._type != 1)
        return false;
      const n = v._name;
      if (typeof n === 'string' && (n.startsWith('dynamic observe ') || n.startsWith('module ')))
        return false;
      return true;
    });
    if (candidates.length === 0) {
      onTitle(null);
      return () => {
      };
    }
    const first = candidates.reduce((a, b) => (a._id ?? Infinity) <= (b._id ?? Infinity) ? a : b);
    const extract = v => {
      if (v == null)
        return null;
      if (typeof v === 'string')
        return v.trim() || null;
      if (v.tagName) {
        if (v.tagName == 'H1')
          return v.textContent;
        const h1 = v.querySelector?.('h1');
        if (h1)
          return (h1.textContent ?? '').trim() || null;
        return null;
      }
      if (v.textContent)
        return (v.textContent ?? '').trim() || null;
      return null;
    };
    const stop = observeVariable(first, {
      fulfilled: value => onTitle(extract(value)),
      error: () => onTitle('Err')
    });
    return () => {
      try {
        stop();
      } catch (e) {
      }
    };
  };
};
const _qpensj = function _5(Inputs,currentModules){return(
Inputs.table([...currentModules.values()], {
  columns: [
    'name',
    'title'
  ],
  format: { name: x => x }
})
)};
const _1x0q6zt = function _7(md){return(
md`## Tests`
)};
const _e0sbyj = function _8(tests,modulesModule){return(
tests({
  filter: (t) => t.variable._module == modulesModule
})
)};
const _p3rq3v = function _modulesModule(thisModule){return(
thisModule()
)};
const _16g1ab = (G, _) => G.input(_);
const _cayyvt = function _testRuntime(Runtime){return(
new Runtime()
)};
const _1j4p6g3 = function _testModulesLatest(modules,testRuntime){return(
modules({
  runtime: testRuntime
})
)};
const _1oq6y7s = function _newModule(testRuntime)
{
  const m = testRuntime.module();
  m.variable().define("greeting", [], () => {
    const div = document.createElement("div");
    div.innerHTML = "<h1>New Module</h1>";
    return div;
  });
  return m;
};
const _1li1bty = function _test_detectsBuiltin(testModulesLatest)
{
  if (![...testModulesLatest.values()].find((m) => m.name == "builtin"))
    throw Error();
  return "ok";
};
const _vr1kp6 = function _test_detectsNewModule(testModulesLatest,newModule)
{
  const rec = testModulesLatest.get(newModule);
  if (!rec) throw Error("newModule not detected yet");
  if (rec.title !== "New Module")
    throw Error(
      "expected title 'New Module', got " + JSON.stringify(rec.title)
    );
  return "ok";
};
const _1p0sqk = async function _test_reflectsDelete(Runtime,modules)
{
  const rt = new Runtime();
  const gen = modules({
    runtime: rt,
    rescanMs: 100,
    titleTimeoutMs: 500
  });
  let snap = new Map();
  (async () => {
    for await (const s of gen) snap = s;
  })();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (pred, ms = 3000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (pred()) return true;
      await wait(50);
    }
    return false;
  };
  try {
    const m = rt.module();
    m.variable().define("title", [], () => {
      const d = document.createElement("div");
      d.innerHTML = "<h1>Temp</h1>";
      return d;
    });
    if (!(await waitFor(() => snap.has(m))))
      throw Error("create not reflected");
    for (const v of [...rt._variables]) if (v._module === m) v.delete();
    if (!(await waitFor(() => !snap.has(m))))
      throw Error("delete not reflected");
    return "ok";
  } finally {
    if (gen.return) gen.return();
  }
};
const _1315qaf = async function _test_reflectsTitleUpdate(Runtime,modules)
{
  const rt = new Runtime();
  const gen = modules({
    runtime: rt,
    rescanMs: 100,
    titleTimeoutMs: 500
  });
  let snap = new Map();
  (async () => {
    for await (const s of gen) snap = s;
  })();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (pred, ms = 3000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (pred()) return true;
      await wait(50);
    }
    return false;
  };
  try {
    const m = rt.module();
    const tv = m.variable().define("title", [], () => {
      const d = document.createElement("div");
      d.innerHTML = "<h1>First</h1>";
      return d;
    });
    if (!(await waitFor(() => snap.get(m)?.title === "First")))
      throw Error("initial title not detected");
    tv.define("title", [], () => {
      const d = document.createElement("div");
      d.innerHTML = "<h1>Second</h1>";
      return d;
    });
    if (!(await waitFor(() => snap.get(m)?.title === "Second")))
      throw Error("title update not reflected");
    return "ok";
  } finally {
    if (gen.return) gen.return();
  }
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  main.define("module @tomlarkworthy/observable-runtime-v6", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime-v6.js?v=4")).default));  
  $def("_s7bl1p", null, ["md"], _s7bl1p);  
  $def("_1eaa9lr", "currentModules", ["modules"], _1eaa9lr);  
  $def("_dmem61", "modules", ["runtime","observeVariable","moduleTitle"], _dmem61);  
  $def("_up9atj", "moduleTitle", ["observeVariable"], _up9atj);  
  $def("_qpensj", null, ["Inputs","currentModules"], _qpensj);  
  main.define("observeVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", "observeVariable", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  $def("_1x0q6zt", null, ["md"], _1x0q6zt);  
  $def("_e0sbyj", null, ["tests","modulesModule"], _e0sbyj);  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime-v6", "@variable"], (_, v) => v.import("Runtime", _));  
  $def("_p3rq3v", "viewof modulesModule", ["thisModule"], _p3rq3v);  
  $def("_16g1ab", "modulesModule", ["Generators","viewof modulesModule"], _16g1ab);  
  $def("_cayyvt", "testRuntime", ["Runtime"], _cayyvt);  
  $def("_1j4p6g3", "testModulesLatest", ["modules","testRuntime"], _1j4p6g3);  
  $def("_1oq6y7s", "newModule", ["testRuntime"], _1oq6y7s);  
  $def("_1li1bty", "test_detectsBuiltin", ["testModulesLatest"], _1li1bty);  
  $def("_vr1kp6", "test_detectsNewModule", ["testModulesLatest","newModule"], _vr1kp6);  
  $def("_1p0sqk", "test_reflectsDelete", ["Runtime","modules"], _1p0sqk);  
  $def("_1315qaf", "test_reflectsTitleUpdate", ["Runtime","modules"], _1315qaf);
  return main;
}
