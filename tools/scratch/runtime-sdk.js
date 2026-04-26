const _exoevq = function _title(md){return(
md`# Runtime SDK

Functions for meta-programming the Observable Runtime.

\`\`\`js
import {runtime, thisModule, observe, variables, descendants, lookupVariable, toObject} from '@tomlarkworthy/runtime-sdk'
\`\`\``
)};
const _jaxte9 = function _2(md){return(
md`### access the runtime`
)};
const _wlucl3 = function identity(x) {
  return x;
};
const _1od6k6j = function _4(md){return(
md`### thisModule()

Obtain a reference to the enclosing module as a view. Use like this
\`\`\`
viewof notebookModule = thisModule()
\`\`\``
)};
const _14bivfb = function _myModule(thisModule){return(
thisModule()
)};
const _7of8uq = function _thisModule(EventTarget,find_with_tag,Event){return(
async () => {
  const view = new EventTarget();
  view.tag = Symbol();
  let module = undefined;

  return Object.defineProperty(view, "value", {
    get: () => {
      if (module) return module;
      find_with_tag(view.tag).then((v) => {
        module = v._module;
        view.dispatchEvent(new Event("input"));
      });
    }
  });
}
)};
const _1lnm2gz = function _find_with_tag(runtime){return(
(tag) => {
  return new Promise((resolve) => {
    [...runtime._variables].map((v) => {
      if (v?._value?.tag == tag) {
        resolve(v);
      }
    });
  });
}
)};
const _7cp47k = function _8(md){return(
md`### create/delete Module`
)};
const _2gtjgz = function _createModule(){return(
function createModule(name, runtime) {
  if (runtime.mains && runtime.mains.has(name)) {
    throw new Error("Module already exists: " + name);
  }
  const mod = runtime.module();
  mod._name = name;
  if (!runtime.mains) runtime.mains = new Map();
  runtime.mains.set(name, mod);
  return mod;
}
)};
const _168lihw = function _deleteModule(){return(
function deleteModule(name, runtime) {
  if (!runtime.mains || !runtime.mains.has(name)) {
    throw new Error("Module not found: " + name);
  }
  const mod = runtime.mains.get(name);
  // Dispose all variables in the module
  for (const v of runtime._variables) {
    if (v._module === mod) {
      v.delete();
    }
  }
  runtime.mains.delete(name);
  return true;
}
)};
const _1wxmw4p = function _11(md){return(
md`### viewof variables

a live view of variables in a runtime`
)};
const _65xeu5 = function _variables(Inputs,observeSet,Event){return(
function (runtime) {
  const view = Inputs.input(runtime._variables);
  let scheduled = false;
  observeSet(runtime._variables, () => {
    // There is a delay before the variable names are updated
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => {
        view.value = runtime._variables;
        view.dispatchEvent(new Event("input", { bubbles: true }));
        scheduled = false;
      }, 0);
    }
  });
  return view;
}
)};
const _yg4n67 = function _runtime_variables(variables,runtime){return(
variables(runtime)
)};
const _czqwrw = function _14(runtime_variables){return(
runtime_variables
)};
const _6860m6 = function _15(md){return(
md`### \`onCodeChange(callback)\`

Register a callback that will be notified of changed code definitions. It has to be a callback because changes can occur rapidly. Returns an unsubscribe function.
~~~js
({
  variable: Variable
  previous: {_module, _name, _inputs, _definition} | null
})
~~~`
)};
const _ribhkt = function _last_change(Generators,invalidation,onCodeChange){return(
Generators.observe((notify) => {
  invalidation.then(onCodeChange(notify));
})
)};
const _10ztj3e = function _onCodeChange(keepalive,myModule,codeChangeListeners){return(
(callback) => {
  keepalive(myModule, "check_for_code_change");
  codeChangeListeners.add(callback);
  return () => codeChangeListeners.delete(callback);
}
)};
const _5oqbod = function _codeChangeListeners(){return(
new Set()
)};
const _1puxmow = function _check_for_code_change(runtime_variables,codeChangeListeners)
{
  const previous = this || new Map();
  const currentSet = runtime_variables;
  const current = new Map();
  const t = Date.now();
  for (const v of currentSet) {
    const snapshot = {
      variable: v,
      _module: v._module,
      _name: v._name,
      _definition: v._definition,
      _inputs: v._inputs.map((i) => i._name)
    };
    current.set(v, snapshot);
    const prev = previous.get(v);
    if (!prev) {
      for (const cb of codeChangeListeners)
        cb({ variable: v, previous: null, t });
    } else if (prev._definition !== snapshot._definition) {
      for (const cb of codeChangeListeners)
        cb({ variable: v, previous: prev, t });
    }
  }
  for (const [v, prev] of previous) {
    if (!currentSet.has(v)) {
      for (const cb of codeChangeListeners)
        cb({ variable: null, previous: prev, t });
    }
  }
  return current;
};
const _1u7ikpy = function _20(md){return(
md`### observe(variable)

This was monstrously difficult to develop. Taps a variable, intercepting all observer calls \`["fulfilled", "rejected", "pending"]\` whilst preserving the behaviour of the existing observer attached to the variable. If \`detachNodes\` is \`true\` and the existing observer hosts a DOM node, the additional variable "steals" it for it's DOM tree. When the observer attaches, if the variable is already fulfilled, the observer is signalled.

Unobserved variables are marked as reachable and become active when observed.`
)};
const _1sv07rx = function _trace_variable(){return(
"---"
)};
const _136vd02 = function _trace_history(){return(
[]
)};
const _ojn9qj = function _no_observer(main)
{
  const variable = main.variable();
  const symbol = variable._observer;
  variable.delete();
  return symbol;
};
const _12050n5 = function _observe(Element,Text,trace_variable,$0,no_observer,queueMicrotask){return(
function observe(v, observer, { invalidation, detachNodes = false } = {}) {
  // --- instrumentation (improved) ---
  // Give each observe() call a stable id so you can correlate events.
  const observe_id = `${v?._name || "<anon>"}@${Date.now()}@${Math.random()
    .toString(16)
    .slice(2)}`;

  const snapshot = (extra = {}) => ({
    t: Date.now(),
    observe_id,
    var_name: v?._name,
    var_version: v?._version,
    var_reachable: v?._reachable,
    has_observer: v?._observer != null,
    observer_has_node: !!observer?._node,
    v_value_defined: v?._value !== undefined,
    v_value_ctor: v?._value?.constructor?.name,
    v_value_is_node:
      v?._value instanceof Element || v?._value instanceof Text || false,
    v_promise: !!v?._promise,
    ...extra
  });

  const emit = (event, extra = {}) => {
    if (v?._name !== trace_variable) return;

    try {
      $0.value = $0.value.concat([
        snapshot({ event, ...extra })
      ]);
    } catch {}
  };

  emit("observe:begin", { detachNodes });

  const cancels = new Set();
  let cancelled = false;

  const cancel = () => {
    emit("observe:cancel_called");
    if (cancelled) return;
    cancelled = true;
    for (const f of cancels) {
      try {
        f();
      } catch {}
    }
    cancels.clear();
  };

  if (invalidation)
    Promise.resolve(invalidation).then(() => {
      emit("observe:invalidation_fired");
      cancel();
    });

  const isNode = (value) => value instanceof Element || value instanceof Text;

  const stealIfNeeded = (value, reason) => {
    const canSteal =
      detachNodes &&
      isNode(value) &&
      observer?._node &&
      observer._node !== value.parentNode;

    emit("observe:steal_check", {
      reason,
      canSteal,
      value_ctor: value?.constructor?.name,
      value_parent: value?.parentNode?.constructor?.name
    });

    if (canSteal) {
      try {
        value.remove();
      } catch {}
      emit("observe:steal_detached", { reason });
    }
  };

  const hasExistingObserver =
    v &&
    v._observer != null &&
    v._observer?.description !== no_observer.description; // cross realm support

  emit("observe:hasExistingObserver", { hasExistingObserver });

  // --- attach/wrap ---
  if (!hasExistingObserver) {
    emit("observe:attach:direct_install");

    if (v && !v._reachable) {
      v._reachable = true;
      v._module._runtime._dirty.add(v);
      v._module._runtime._updates.add(v);
      emit("observe:attach:marked_reachable");
    }

    const previous = v._observer;
    v._observer = observer;
    cancels.add(() => {
      v._observer = previous;
    });
  } else {
    emit("observe:attach:wrap_existing");

    const prevObserver = v._observer;

    for (const type of ["fulfilled", "rejected", "pending"]) {
      const prev = prevObserver?.[type];

      prevObserver[type] = (...args) => {
        emit(`observe:wrapped:${type}:called`, {
          arg0_ctor: args[0]?.constructor?.name
        });

        // old observer first
        if (prev) {
          try {
            Reflect.apply(prev, prevObserver, args);
          } catch (e) {
            emit(`observe:wrapped:${type}:prev_error`, { message: String(e) });
          }
          if (type === "fulfilled")
            stealIfNeeded(args[0], "wrap_existing:prev_fulfilled");
        }

        // then tap
        try {
          if (type === "fulfilled") observer.fulfilled?.(args[0], v?._name);
          else if (type === "rejected") observer.rejected?.(args[0], v?._name);
          else observer.pending?.();
          emit(`observe:wrapped:${type}:tapped_ok`);
        } catch (e) {
          emit(`observe:wrapped:${type}:tap_error`, { message: String(e) });
        }
      };

      cancels.add(() => {
        prevObserver[type] = prev;
      });
    }
  }

  // --- CATCH-UP REPLAY (BUG FIX) ---
  // Snapshot version to avoid replaying stale results.
  const versionAtAttach = v?._version;
  emit("observe:catchup:scheduled", { versionAtAttach });

  queueMicrotask(() => {
    emit("observe:catchup:microtask_start", { cancelled });

    if (cancelled) return;

    // mimic inspector: mark pending first
    try {
      observer.pending?.();
      emit("observe:catchup:pending_sent");
    } catch (e) {
      emit("observe:catchup:pending_error", { message: String(e) });
    }

    // IMPORTANT: read CURRENT value at replay time
    const valueNow = v?._value;

    emit("observe:catchup:valueNow_snapshot", {
      valueNow_defined: valueNow !== undefined,
      valueNow_ctor: valueNow?.constructor?.name,
      v_version_now: v?._version,
      valueNow_outerHTML_prefix: v?._observer?._node?.outerHTML
    });

    if (valueNow !== undefined) {
      if (v?._version !== versionAtAttach) {
        emit("observe:catchup:stale_skip_valueNow");
        return;
      }

      stealIfNeeded(valueNow, "catchup:valueNow");

      try {
        observer.fulfilled?.(valueNow, v?._name);
        emit("observe:catchup:fulfilled_sent_valueNow");
      } catch (e) {
        emit("observe:catchup:fulfilled_error_valueNow", {
          message: String(e)
        });
      }
      return;
    }

    // optional fallback: attach-time promise (or current promise)
    const p = v?._promise;
    if (!p || typeof p.then !== "function") {
      emit("observe:catchup:no_value_no_promise");
      return;
    }

    emit("observe:catchup:await_promise");

    Promise.resolve(p).then(
      (value) => {
        emit("observe:catchup:promise_fulfilled", {
          value_defined: value !== undefined,
          value_ctor: value?.constructor?.name,
          v_version_now: v?._version
        });

        if (cancelled) return;
        if (v?._version !== versionAtAttach) {
          emit("observe:catchup:stale_skip_promise");
          return;
        }
        if (value === undefined) return;

        stealIfNeeded(value, "catchup:promise");

        try {
          observer.fulfilled?.(value, v?._name);
          emit("observe:catchup:fulfilled_sent_promise");
        } catch (e) {
          emit("observe:catchup:fulfilled_error_promise", {
            message: String(e)
          });
        }
      },
      (error) => {
        emit("observe:catchup:promise_rejected", {
          v_version_now: v?._version
        });

        if (cancelled) return;
        if (v?._version !== versionAtAttach) return;

        try {
          observer.rejected?.(error, v?._name);
          emit("observe:catchup:rejected_sent_promise");
        } catch (e) {
          emit("observe:catchup:rejected_error_promise", {
            message: String(e)
          });
        }
      }
    );
  });

  emit("observe:end");
  return cancel;
}
)};
const _1noe80r = function _observeOld(trace_variable,_,no_observer,isnode,toObject,queueMicrotask,getPromiseState){return(
function observeOld(v, observer, { invalidation, detachNodes = false } = {}) {
  const cancels = new Set();
  const onCancel = () => cancels.forEach((f) => f());
  if (invalidation) invalidation.then(onCancel);

  if (v?._name === trace_variable) {
    console.log("observe", trace_variable, v);
    debugger;
  }

  if (_.isEqual(v._observer, {}) || v._observer === no_observer) {
    // No existing observer, so we install one
    if (!v._reachable) {
      // the the variable is not reachable, we mark it as reachable
      // and trigger a recompute
      v._reachable = true;
      v._module._runtime._dirty.add(v);
      v._module._runtime._updates.add(v);
    }
    let previous = v._observer;
    v._observer = observer;
    cancels.add(() => (v._observer = previous));
  } else {
    // intercepts an existing observer handler
    ["fulfilled", "rejected", "pending"].forEach((type) => {
      const old = v._observer[type];
      v._observer[type] = (...args) => {
        if (v?._name === trace_variable) {
          debugger;
          console.log(trace_variable, type, ...args);
        }
        // The old is often a prototype, so we use Reflect to call it
        if (old) {
          if (v?._name === trace_variable) {
            console.log(`previous: ${type} ${trace_variable}`);
          }
          Reflect.apply(old, v._observer, args);
          if (type === "fulfilled") {
            if (
              detachNodes &&
              isnode(args[0]) &&
              observer._node !== args[0].parentNode
            ) {
              if (v?._name === trace_variable) {
                console.log(`dettaching existing DOM: ${trace_variable}`);
              }
              args[0].remove();
            }
          }
        }
        if (v?._name === trace_variable) {
          console.log(`tapped ${trace_variable} ${type}`);
        }
        if (observer[type]) observer[type](...args);
      };
      cancels.add(() => (v._observer[type] = old));
    });
    if (v?._name === trace_variable) {
      debugger;
      console.log(`checking`, trace_variable, v, toObject(v), v._value);
    }
  }
  // Resolve initial state
  if (v._value !== undefined) {
    queueMicrotask(() => {
      if (
        detachNodes &&
        isnode(v._value) &&
        observer._node !== v._value.parentNode
      ) {
        if (v?._name === trace_variable) {
          console.log(`dettaching existing DOM: ${trace_variable}`);
        }
        v._value.remove();
      }
      if (v?._name === trace_variable) {
        console.log(`tapped fulfilled: ${trace_variable}`);
      }
      observer.fulfilled(v._value, v._name);
    });
  } else {
    // either in pending or error state, we can check by racing a promise
    getPromiseState(v._promise).then(({ state, error, value }) => {
      if (v?._name === trace_variable) {
        debugger;
      }
      if (state == "rejected") {
        if (observer.rejected) observer.rejected(error, v._name);
      } else if (state == "pending") {
        if (observer.pending) observer.pending();
      } /*
      Removed coz non-undefined should have been caught, and the initial
      promise assigned to a variable resolves to undefined
      else if (state == "fulfilled") {
        if (observer.fulfilled) observer.fulfilled(value, v._name);
      }*/
    });
  }
  return onCancel;
}
)};
const _2kni3y = function _26(md){return(
md`### descendants

live view of a variable (s) and all its dataflow successors`
)};
const _zv8vlq = function _descendants(){return(
function (...variables) {
  const results = new Set(variables);
  const queue = variables;
  do {
    [...queue.pop()._outputs].forEach((v) => {
      if (!results.has(v)) {
        results.add(v);
        queue.push(v);
      }
    });
  } while (queue.length);
  return results;
}
)};
const _1wljra9 = async function _decendants_example(descendants,lookupVariable,main,toObject){return(
[
  ...descendants(await lookupVariable("runtime", main))
].map(toObject)
)};
const _2nfwg9 = function _29(md){return(
md`### ascendants`
)};
const _1e5g5ex = function _ascendants(){return(
function (...variables) {
  const results = new Set(variables);
  const queue = variables;
  do {
    [...queue.pop()._inputs].forEach((v) => {
      if (!results.has(v)) {
        results.add(v);
        queue.push(v);
      }
    });
  } while (queue.length);
  return results;
}
)};
const _kdpncr = async function _ascendants_example(ascendants,lookupVariable,main,toObject){return(
[...ascendants(await lookupVariable("runtime", main))].map(
  toObject
)
)};
const _10rsemi = function _32(md){return(
md`### lookupVariable
lookup a variable by name in a module, pass an array to lookup multiple`
)};
const _o5dv = function _lookupVariable(){return(
async function lookupVariable(name_or_names, module) {
  if (typeof name_or_names === "string") {
    let v,
      retries,
      name = name_or_names;
    while (!module._scope.get(name) && retries++ < 1000) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    return module._scope.get(name);
  } else if (Array.isArray(name_or_names)) {
    return Promise.all(
      name_or_names.map((name) => lookupVariable(name, module))
    );
  } else {
    throw "name_or_names should be string of an array";
  }
}
)};
const _11hb1zq = function _34(md){return(
md`### persistentId

An id that follows are variable around even if the page is restarted or the name changes.`
)};
const _kd8snz = function _persistentIdToVariableRef(){return(
new Map()
)};
const _x7ml75 = function _getVariableByPersistentId(persistentIdToVariableRef,WeakRef){return(
(pid, runtime) => {
  const cache = persistentIdToVariableRef.get(pid);
  if (cache) return cache.deref();
  else {
    // might be in runtime but not discovered yet
    return [...runtime._variables].find((v) => {
      // cache
      persistentIdToVariableRef.set(v.pid, new WeakRef(v));
      return v.pid === pid; // check for matches
    });
  }
}
)};
const _1kb2j8y = function _persistentId(contentHash,persistentIdToVariableRef,WeakRef){return(
(v) => {
  if (!v._observer) throw new Error("Call on a variable");
  if (!v.pid) {
    v.pid = contentHash(v._name + v._definition.toString());
    persistentIdToVariableRef.set(v.pid, new WeakRef(v));
  }
  return v.pid;
}
)};
const _117xasn = async function _test_persistentId(lookupVariable,myModule,persistentId)
{
  const v = await lookupVariable("persistentId", myModule);
  if (persistentId(v) !== "_4ie7s1") throw "persistentId changed";
  return "ok";
};
const _1fxvgy1 = function _39(md){return(
md`### obj_observer

The global Observer factory introduced in the Notebook 2.0 environment`
)};
const _1vayxkx = function _ojs_observer(myModule){return(
myModule._runtime._builtin._scope.get("__ojs_observer")?._value
)};
const _cf0hco = function _41(md){return(
md`### keepalive

Keep a named cell evaluated without a direct dataflow dependancy. Useful to keep background tasks alive in dependancies when another module imports them.`
)};
const _22ky7q = function _keepalive(){return(
(module, variable_name) => {
  if (variable_name === undefined) debugger;
  const name = `dynamic observe ${variable_name}`;
  console.log(`keepalive: ${name}`);
  if (module._scope.has(name)) return;
  const variable = module.variable({}).define(name, [variable_name], (m) => m);
  return () => variable.delete();
}
)};
const _4shbwa = function _43(md){return(
md`### isOnObservableCom`
)};
const _1xjzq9r = function _isOnObservableCom(location){return(
() =>
  location.href.includes("observableusercontent.com") &&
  !location.href.includes("blob:")
)};
const _1068wab = function _45(md){return(
md`### Realize

Used to convert function sources into real javascript functions. If on lopecode it is done through a module-shim so it passes through importShim.`
)};
const _1nxklhe = function _realize(id){return(
async function realize(sources, runtime) {
  if (runtime._global("importShim")) {
    return new Promise((resolve, reject) => {
      const uid = id();
      const document = runtime._global("document");
      const window = runtime._global("window");
      window[uid] = { resolve, reject };

      const assignments = sources
        .map((src, i) => `__results[${i}] = (${src});`)
        .join("\n");

      document.head.appendChild(
        Object.assign(document.createElement("script"), {
          type: "module-shim",
          innerHTML: `
              try {
                const runtime = window.__ojs_runtime;
                const __results = new Array(${sources.length});
                ${assignments}
                window['${uid}'].resolve(__results);
              } catch(e) {
                window['${uid}'].reject(e);
              } finally {
                delete window['${uid}'];
              }
            `
        })
      );
    });
  } else {
    return sources.map((source) => {
      let _fn;
      eval("_fn = " + source);
      return _fn;
    });
  }
}
)};
const _mzhfcr = function _47(md){return(
md`## Utils`
)};
const _1rlgcws = function _48(id,md){return(
md`### id

${id()}`
)};
const _1pzz9si = function _id(){return(
() =>
  // quick random id that is also a valid identifier
  Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
)};
const _1hlvcn2 = function _50(md){return(
md`### contentHash`
)};
const _1gqagg7 = function _contentHash(){return(
(s) => {
  s = String(s);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return "_" + (h >>> 0).toString(36); // compact rep
}
)};
const _1b37qxm = function _52(md){return(
md`### unorderedSync
Helper for syncing two arrays`
)};
const _1f7zuvg = function _unorderedSync(_){return(
(goal, current, identityFn = _.isEqual) => ({
  add: _.differenceWith(goal, current, identityFn),
  remove: _.differenceWith(current, goal, (a, b) => identityFn(b, a))
})
)};
const _cf0gs4 = function _54(unorderedSync){return(
unorderedSync(
  [
    { name: "red", age: 12 },
    { name: "joe", age: 1 }
  ],
  [{ name: "joe" }, { name: "jean" }],
  (a, b) => a.name == b.name
)
)};
const _1nh0nrp = function _OBSERVED(){return(
new WeakMap()
)};
const _1iv8wgg = function _56(md){return(
md`### getPromiseState

figure out the status of a promise. If the promise is on another realm you have to eat a micro-tick (e.g. promise across iframes)`
)};
const _97xurh = function _getPromiseState(){return(
async function getPromiseState(p) {
  const sentinel = Symbol();
  try {
    const val = await Promise.race([p, Promise.resolve(sentinel)]);
    return val === sentinel
      ? { state: "pending" }
      : { state: "fulfilled", fulfilled: val };
  } catch (err) {
    return { state: "rejected", error: err };
  }
}
)};
const _ns41wt = function _getPromiseStateCrossRealm(){return(
async function getPromiseStateCrossRealm(p) {
  let state = "pending",
    value,
    error;

  p.then(
    (v) => ((state = "fulfilled"), (value = v)),
    (e) => ((state = "rejected"), (error = e))
  );

  await Promise.resolve();

  return state === "pending"
    ? { state }
    : state === "fulfilled"
    ? { state, value }
    : { state, error };
}
)};
const _rrd6rh = function _59(md){return(
md`### observeSet

Attach a callback to Javascript set to get notified of mutations`
)};
const _f8g4hs = function _observeSet(OBSERVED,queueMicrotask){return(
(set, callback) => {
  if (typeof callback !== "function")
    throw new TypeError("callback must be a function");

  let meta = OBSERVED.get(set);

  if (!meta) {
    const originalAdd = set.add;
    const originalDelete = set.delete;
    const originalClear = set.clear;

    meta = {
      observers: new Set(),
      originalAdd,
      originalDelete,
      originalClear,
      pending: false,
      dirty: false
    };

    const scheduleNotify = (self) => {
      meta.dirty = true;
      if (meta.pending) return;
      meta.pending = true;

      queueMicrotask(() => {
        meta.pending = false;
        if (!meta.dirty) return;
        meta.dirty = false;

        for (const cb of meta.observers) {
          try {
            // Keep callback shape: (op, args, set)
            // You can standardize on op="dirty".
            cb("dirty", [], self);
          } catch {}
        }
      });
    };

    set.add = function (value) {
      const result = originalAdd.call(this, value);
      scheduleNotify(this);
      return result;
    };

    set.delete = function (value) {
      const result = originalDelete.call(this, value);
      scheduleNotify(this);
      return result;
    };

    set.clear = function () {
      const result = originalClear.call(this);
      scheduleNotify(this);
      return result;
    };

    OBSERVED.set(set, meta);
  }

  meta.observers.add(callback);

  let unsubbed = false;
  return function unsubscribe() {
    if (unsubbed) return;
    unsubbed = true;

    const m = OBSERVED.get(set);
    if (!m) return;

    m.observers.delete(callback);

    if (m.observers.size === 0) {
      set.add = m.originalAdd;
      set.delete = m.originalDelete;
      set.clear = m.originalClear;
      OBSERVED.delete(set);
    }
  };
}
)};
const _19sh8su = function _61(md){return(
md`### Reposition set

move an element's iteration order within a set.`
)};
const _zk5qqr = function _repositionSetElement(){return(
function repositionSetElement(set, element, newPosition) {
  if (!set.has(element)) {
    throw new Error("Element not found in the set.");
  }

  // Convert Set to an array
  const elementsArray = Array.from(set);

  // Remove the element
  const currentIndex = elementsArray.indexOf(element);
  elementsArray.splice(currentIndex, 1);

  // Insert element at the new position
  elementsArray.splice(newPosition, 0, element);

  // Reconstruct the Set
  set.clear();
  elementsArray.forEach(set.add, set);
}
)};
const _17w56uf = function _63(md){return(
md`---`
)};
const _b5ui8y = function _isnode(Element,Text){return(
(value) => {
  return (
    (value instanceof Element || value instanceof Text) &&
    value instanceof value.constructor
  );
}
)};
const _1nzqoou = function _toObject(){return(
(v) =>
  Object.fromEntries(Object.getOwnPropertyNames(v).map((p) => [p, v[p]]))
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map([].map((name) => {
    const module_name = "@tomlarkworthy/runtime-sdk";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  $def("_exoevq", "title", ["md"], _exoevq);  
  $def("_jaxte9", null, ["md"], _jaxte9);  
  main.define("module @mootari/access-runtime", async () => runtime.module((await import("/@mootari/access-runtime.js?v=4")).default));  
  main.define("runtime", ["module @mootari/access-runtime", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @mootari/access-runtime", "@variable"], (_, v) => v.import("main", _));  
  $def("_1od6k6j", null, ["md"], _1od6k6j);  
  $def("_14bivfb", "viewof myModule", ["thisModule"], _14bivfb);  
  main.variable(observer("myModule")).define("myModule", ["Generators", "viewof myModule"], (G, _) => G.input(_));  
  $def("_7of8uq", "thisModule", ["EventTarget","find_with_tag","Event"], _7of8uq);  
  $def("_1lnm2gz", "find_with_tag", ["runtime"], _1lnm2gz);  
  $def("_7cp47k", null, ["md"], _7cp47k);  
  $def("_2gtjgz", "createModule", [], _2gtjgz);  
  $def("_168lihw", "deleteModule", [], _168lihw);  
  $def("_1wxmw4p", null, ["md"], _1wxmw4p);  
  $def("_65xeu5", "variables", ["Inputs","observeSet","Event"], _65xeu5);  
  $def("_yg4n67", "viewof runtime_variables", ["variables","runtime"], _yg4n67);  
  main.variable(observer("runtime_variables")).define("runtime_variables", ["Generators", "viewof runtime_variables"], (G, _) => G.input(_));  
  $def("_czqwrw", null, ["runtime_variables"], _czqwrw);  
  $def("_6860m6", null, ["md"], _6860m6);  
  $def("_ribhkt", "last_change", ["Generators","invalidation","onCodeChange"], _ribhkt);  
  $def("_10ztj3e", "onCodeChange", ["keepalive","myModule","codeChangeListeners"], _10ztj3e);  
  $def("_5oqbod", "codeChangeListeners", [], _5oqbod);  
  $def("_1puxmow", "check_for_code_change", ["runtime_variables","codeChangeListeners"], _1puxmow);  
  $def("_1u7ikpy", null, ["md"], _1u7ikpy);  
  $def("_1sv07rx", "trace_variable", [], _1sv07rx);  
  $def("_136vd02", "initial trace_history", [], _136vd02);  
  main.variable(observer("mutable trace_history")).define("mutable trace_history", ["Mutable", "initial trace_history"], (M, _) => new M(_));  
  main.variable(observer("trace_history")).define("trace_history", ["mutable trace_history"], _ => _.generator);  
  $def("_ojn9qj", "no_observer", ["main"], _ojn9qj);  
  $def("_12050n5", "observe", ["Element","Text","trace_variable","mutable trace_history","no_observer","queueMicrotask"], _12050n5);  
  $def("_1noe80r", "observeOld", ["trace_variable","_","no_observer","isnode","toObject","queueMicrotask","getPromiseState"], _1noe80r);  
  $def("_2kni3y", null, ["md"], _2kni3y);  
  $def("_zv8vlq", "descendants", [], _zv8vlq);  
  $def("_1wljra9", "decendants_example", ["descendants","lookupVariable","main","toObject"], _1wljra9);  
  $def("_2nfwg9", null, ["md"], _2nfwg9);  
  $def("_1e5g5ex", "ascendants", [], _1e5g5ex);  
  $def("_kdpncr", "ascendants_example", ["ascendants","lookupVariable","main","toObject"], _kdpncr);  
  $def("_10rsemi", null, ["md"], _10rsemi);  
  $def("_o5dv", "lookupVariable", [], _o5dv);  
  $def("_11hb1zq", null, ["md"], _11hb1zq);  
  $def("_kd8snz", "persistentIdToVariableRef", [], _kd8snz);  
  $def("_x7ml75", "getVariableByPersistentId", ["persistentIdToVariableRef","WeakRef"], _x7ml75);  
  $def("_1kb2j8y", "persistentId", ["contentHash","persistentIdToVariableRef","WeakRef"], _1kb2j8y);  
  $def("_117xasn", "test_persistentId", ["lookupVariable","myModule","persistentId"], _117xasn);  
  $def("_1fxvgy1", null, ["md"], _1fxvgy1);  
  $def("_1vayxkx", "ojs_observer", ["myModule"], _1vayxkx);  
  $def("_cf0hco", null, ["md"], _cf0hco);  
  $def("_22ky7q", "keepalive", [], _22ky7q);  
  $def("_4shbwa", null, ["md"], _4shbwa);  
  $def("_1xjzq9r", "isOnObservableCom", ["location"], _1xjzq9r);  
  $def("_1068wab", null, ["md"], _1068wab);  
  $def("_1nxklhe", "realize", ["id"], _1nxklhe);  
  $def("_mzhfcr", null, ["md"], _mzhfcr);  
  $def("_1rlgcws", null, ["id","md"], _1rlgcws);  
  $def("_1pzz9si", "id", [], _1pzz9si);  
  $def("_1hlvcn2", null, ["md"], _1hlvcn2);  
  $def("_1gqagg7", "contentHash", [], _1gqagg7);  
  $def("_1b37qxm", null, ["md"], _1b37qxm);  
  $def("_1f7zuvg", "unorderedSync", ["_"], _1f7zuvg);  
  $def("_cf0gs4", null, ["unorderedSync"], _cf0gs4);  
  $def("_1nh0nrp", "OBSERVED", [], _1nh0nrp);  
  $def("_1iv8wgg", null, ["md"], _1iv8wgg);  
  $def("_97xurh", "getPromiseState", [], _97xurh);  
  $def("_ns41wt", "getPromiseStateCrossRealm", [], _ns41wt);  
  $def("_rrd6rh", null, ["md"], _rrd6rh);  
  $def("_f8g4hs", "observeSet", ["OBSERVED","queueMicrotask"], _f8g4hs);  
  $def("_19sh8su", null, ["md"], _19sh8su);  
  $def("_zk5qqr", "repositionSetElement", [], _zk5qqr);  
  $def("_17w56uf", null, ["md"], _17w56uf);  
  $def("_b5ui8y", "isnode", ["Element","Text"], _b5ui8y);  
  $def("_1nzqoou", "toObject", [], _1nzqoou);
  return main;
}
