const _1238 = function title(md){return(
md`# Runtime SDK

Functions for meta-programming the Observable Runtime.

\`\`\`js
import {runtime, thisModule, observe, variables, descendants, lookupVariable, toObject} from '@tomlarkworthy/runtime-sdk'
\`\`\``
)};

const _1239 = function(md){return(
md`### access the runtime`
)};

const _1303 = async (__variable) => {
const {runtime: _runtime, main} = await (import("../@mootari/access-runtime").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("_runtime")?.import("runtime", "_runtime", module);
  outputs.get("main")?.import("main", module);
  return {};
}));

return {_runtime,main};
};

const _1380 = function runtime(_runtime)
{
  window.__ojs_runtime = window.__ojs_runtime || _runtime;
  return _runtime;
}
;

const _1240 = function(md){return(
md`### thisModule()

Obtain a reference to the enclosing module as a view. Use like this
\`\`\`
viewof notebookModule = thisModule()
\`\`\``
)};

const _1241 = function thisModule(EventTarget,find_with_tag,Event){return(
async () => {
    const view = new EventTarget();
    view.tag = Symbol();
    let module = undefined;
    return Object.defineProperty(view, 'value', {
        get: () => {
            if (module)
                return module;
            find_with_tag(view.tag).then(v => {
                module = v._module;
                view.dispatchEvent(new Event('input'));
            });
        }
    });
}
)};

const _1242 = function find_with_tag(runtime){return(
tag => {
    return new Promise(resolve => {
        [...runtime._variables].map(v => {
            if (v?._value?.tag == tag) {
                resolve(v);
            }
        });
    });
}
)};

const _1300 = function viewof$myModule(thisModule){return(
thisModule()
)};

const _1243 = function(md){return(
md`### create/delete Module`
)};

const _1244 = function createModule(){return(
function createModule(name, runtime) {
    if (runtime.mains && runtime.mains.has(name)) {
        throw new Error('Module already exists: ' + name);
    }
    const mod = runtime.module();
    mod._name = name;
    if (!runtime.mains)
        runtime.mains = new Map();
    runtime.mains.set(name, mod);
    return mod;
}
)};

const _1245 = function deleteModule()
{
    return function deleteModule(name, runtime) {
        if (!runtime.mains || !runtime.mains.has(name)) {
            throw new Error('Module not found: ' + name);
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
    };
}
;

const _1246 = function(md){return(
md`### viewof variables

a live view of variables in a runtime`
)};

const _1247 = function variables(Inputs,observeSet,Event)
{
    return function (runtime) {
        const view = Inputs.input(runtime._variables);
        let scheduled = false;
        observeSet(runtime._variables, () => {
            // There is a delay before the variable names are updated
            if (!scheduled) {
                scheduled = true;
                setTimeout(() => {
                    view.value = runtime._variables;
                    view.dispatchEvent(new Event('input', { bubbles: true }));
                    scheduled = false;
                }, 0);
            }
        });
        return view;
    };
}
;

const _1248 = function(runtime_variables){return(
runtime_variables
)};

const _1301 = function viewof$runtime_variables(variables,runtime){return(
variables(runtime)
)};

const _1249 = function(md){return(
md`### \`onCodeChange(callback)\`

Register a callback that will be notified of changed code definitions. It has to be a callback because changes can occur rapidly. Returns an unsubscribe function.
~~~js
({
  variable: Variable
  previous: {_module, _name, _inputs, _definition} | null
})
~~~`
)};

const _1250 = function last_change(Generators,invalidation,onCodeChange){return(
Generators.observe(notify => {
    invalidation.then(onCodeChange(notify));
})
)};

const _1251 = function onCodeChange(keepalive,myModule,codeChangeListeners){return(
callback => {
    keepalive(myModule, 'check_for_code_change');
    codeChangeListeners.add(callback);
    return () => codeChangeListeners.delete(callback);
}
)};

const _1252 = function codeChangeListeners(){return(
new Set()
)};

const _1253 = function check_for_code_change(runtime_variables,codeChangeListeners)
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
            _inputs: v._inputs.map(i => i._name)
        };
        current.set(v, snapshot);
        const prev = previous.get(v);
        if (!prev) {
            for (const cb of codeChangeListeners)
                cb({
                    variable: v,
                    previous: null,
                    t
                });
        } else if (prev._definition !== snapshot._definition) {
            for (const cb of codeChangeListeners)
                cb({
                    variable: v,
                    previous: prev,
                    t
                });
        }
    }
    for (const [v, prev] of previous) {
        if (!currentSet.has(v)) {
            for (const cb of codeChangeListeners)
                cb({
                    variable: null,
                    previous: prev,
                    t
                });
        }
    }
    return current;
}
;

const _1254 = function(md){return(
md`### observe(variable)

This was monstrously difficult to develop. Taps a variable, intercepting all observer calls \`["fulfilled", "rejected", "pending"]\` whilst preserving the behaviour of the existing observer attached to the variable. If \`detachNodes\` is \`true\` and the existing observer hosts a DOM node, the additional variable "steals" it for it's DOM tree. When the observer attaches, if the variable is already fulfilled, the observer is signalled.

Unobserved variables are marked as reachable and become active when observed.`
)};

const _1255 = function trace_variable(){return(
'---'
)};

const _1256 = function no_observer(main)
{
    const variable = main.variable();
    const symbol = variable._observer;
    variable.delete();
    return symbol;
}
;

const _1257 = function observe(Element,Text,trace_variable,mutable$trace_history,no_observer,queueMicrotask)
{
  // Multiple views may observe one variable (a lopepage pane + an embedding widget).
  // Views remount, so cancels arrive in any order. A single dispatcher observer per
  // variable holds an explicit listener list: attach = push, cancel = splice. Delivery
  // runs in attach order, so for element values the last-attached view adopts last and
  // owns the node. (The previous design wrapped observer methods in place and each
  // cancel restored the methods captured at ITS attach time — correct only for LIFO
  // cancel order; any remount orphaned the surviving listener.)
  const DISPATCH = '__observe_listeners__';
  // cross realm support: no_observer is a Symbol compared by description
  return function observe(v, observer, {invalidation, detachNodes = false} = {}) {
    const observe_id = `${ v?._name || '<anon>' }@${ Date.now() }@${ Math.random().toString(16).slice(2) }`;
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
      v_value_is_node: v?._value instanceof Element || v?._value instanceof Text || false,
      v_promise: !!v?._promise,
      listener_count: v?._observer?.[DISPATCH]?.length,
      ...extra
    });
    const emit = (event, extra = {}) => {
      if (v?._name !== trace_variable)
        return;
      try {
        mutable$trace_history.value = mutable$trace_history.value.concat([snapshot({
            event,
            ...extra
          })]);
      } catch {
      }
    };
    emit('observe:begin', { detachNodes });
    const isNode = value => value instanceof Element || value instanceof Text;
    // Detach an element value from wherever it currently lives so this listener's
    // fulfilled can adopt it into its own node.
    const stealFor = (l, value, reason) => {
      const canSteal = l.detachNodes && isNode(value) && l.observer?._node && l.observer._node !== value.parentNode;
      emit('observe:steal_check', {
        reason,
        canSteal,
        value_ctor: value?.constructor?.name,
        value_parent: value?.parentNode?.constructor?.name
      });
      if (canSteal) {
        try {
          value.remove();
        } catch {
        }
        emit('observe:steal_detached', { reason });
      }
    };
    // --- ensure dispatcher installed ---
    let dispatch = v._observer && v._observer[DISPATCH] ? v._observer : null;
    if (!dispatch) {
      const listeners = [];
      const deliver = type => (...args) => {
        emit(`observe:deliver:${ type }`, { arg0_ctor: args[0]?.constructor?.name });
        for (const l of [...listeners]) {
          try {
            if (type === 'fulfilled') {
              stealFor(l, args[0], 'deliver');
              l.observer.fulfilled?.(args[0], v?._name);
            } else if (type === 'rejected')
              l.observer.rejected?.(args[0], v?._name);
            else
              l.observer.pending?.();
          } catch (e) {
            emit(`observe:deliver:${ type }:listener_error`, { message: String(e) });
          }
        }
      };
      const previous = v._observer;
      dispatch = {
        [DISPATCH]: listeners,
        // Preserve the `variable._observer._node` contract editors (divToVar),
        // module-map, and observablehq.com key on. The pre-existing observer
        // (e.g. the notebook Inspector) owns the canonical node; otherwise the
        // last-attached listener that has one (the view that adopted the value).
        get _node() {
          const base = listeners.find(l => l.base);
          if (base?.observer?._node != null)
            return base.observer._node;
          for (let i = listeners.length - 1; i >= 0; i--) {
            const n = listeners[i].observer?._node;
            if (n != null)
              return n;
          }
          return undefined;
        },
        __restore: () => {
          if (v._observer === dispatch)
            v._observer = previous;
        },
        pending: deliver('pending'),
        fulfilled: deliver('fulfilled'),
        rejected: deliver('rejected')
      };
      const hasExistingObserver = previous != null && previous?.description !== no_observer.description;
      if (hasExistingObserver) {
        // pre-existing real observer (e.g. bootloader Inspector) stays first, permanently
        listeners.push({
          observer: previous,
          detachNodes: false,
          base: true
        });
        emit('observe:attach:base_listener_kept');
      }
      if (v && !v._reachable) {
        v._reachable = true;
        v._module._runtime._dirty.add(v);
        v._module._runtime._updates.add(v);
        emit('observe:attach:marked_reachable');
      }
      v._observer = dispatch;
      emit('observe:attach:dispatcher_installed', { hasExistingObserver });
    }
    // --- attach this listener ---
    const listeners = dispatch[DISPATCH];
    const entry = {
      observer,
      detachNodes
    };
    listeners.push(entry);
    emit('observe:attach:listener_added');
    let cancelled = false;
    const cancel = () => {
      emit('observe:cancel_called');
      if (cancelled)
        return;
      cancelled = true;
      const i = listeners.indexOf(entry);
      if (i >= 0)
        listeners.splice(i, 1);
      if (!listeners.some(l => !l.base)) {
        // no external listeners left: hand the variable back
        dispatch.__restore();
        emit('observe:cancel:dispatcher_removed');
      }
    };
    if (invalidation)
      Promise.resolve(invalidation).then(() => {
        emit('observe:invalidation_fired');
        cancel();
      });
    // --- CATCH-UP REPLAY (BUG FIX) ---
    // Snapshot version to avoid replaying stale results.
    const versionAtAttach = v?._version;
    emit('observe:catchup:scheduled', { versionAtAttach });
    queueMicrotask(() => {
      emit('observe:catchup:microtask_start', { cancelled });
      if (cancelled)
        return;
      // mimic inspector: mark pending first
      try {
        observer.pending?.();
        emit('observe:catchup:pending_sent');
      } catch (e) {
        emit('observe:catchup:pending_error', { message: String(e) });
      }
      // IMPORTANT: read CURRENT value at replay time
      const valueNow = v?._value;
      emit('observe:catchup:valueNow_snapshot', {
        valueNow_defined: valueNow !== undefined,
        valueNow_ctor: valueNow?.constructor?.name,
        v_version_now: v?._version,
        valueNow_outerHTML_prefix: v?._observer?._node?.outerHTML
      });
      if (valueNow !== undefined) {
        if (v?._version !== versionAtAttach) {
          emit('observe:catchup:stale_skip_valueNow');
          return;
        }
        stealFor(entry, valueNow, 'catchup:valueNow');
        try {
          observer.fulfilled?.(valueNow, v?._name);
          emit('observe:catchup:fulfilled_sent_valueNow');
        } catch (e) {
          emit('observe:catchup:fulfilled_error_valueNow', { message: String(e) });
        }
        return;
      }
      // optional fallback: attach-time promise (or current promise)
      const p = v?._promise;
      if (!p || typeof p.then !== 'function') {
        emit('observe:catchup:no_value_no_promise');
        return;
      }
      emit('observe:catchup:await_promise');
      Promise.resolve(p).then(value => {
        emit('observe:catchup:promise_fulfilled', {
          value_defined: value !== undefined,
          value_ctor: value?.constructor?.name,
          v_version_now: v?._version
        });
        if (cancelled)
          return;
        if (v?._version !== versionAtAttach) {
          emit('observe:catchup:stale_skip_promise');
          return;
        }
        if (value === undefined)
          return;
        stealFor(entry, value, 'catchup:promise');
        try {
          observer.fulfilled?.(value, v?._name);
          emit('observe:catchup:fulfilled_sent_promise');
        } catch (e) {
          emit('observe:catchup:fulfilled_error_promise', { message: String(e) });
        }
      }, error => {
        emit('observe:catchup:promise_rejected', { v_version_now: v?._version });
        if (cancelled)
          return;
        if (v?._version !== versionAtAttach)
          return;
        try {
          observer.rejected?.(error, v?._name);
          emit('observe:catchup:rejected_sent_promise');
        } catch (e) {
          emit('observe:catchup:rejected_error_promise', { message: String(e) });
        }
      });
    });
    emit('observe:end');
    return cancel;
  };
}
;

const _1258 = function observeOld(trace_variable,_,no_observer,isnode,toObject,queueMicrotask,getPromiseState)
{
    return function observeOld(v, observer, {invalidation, detachNodes = false} = {}) {
        const cancels = new Set();
        const onCancel = () => cancels.forEach(f => f());
        if (invalidation)
            invalidation.then(onCancel);
        if (v?._name === trace_variable) {
            console.log('observe', trace_variable, v);
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
            cancels.add(() => v._observer = previous);
        } else {
            // intercepts an existing observer handler
            [
                'fulfilled',
                'rejected',
                'pending'
            ].forEach(type => {
                const old = v._observer[type];
                v._observer[type] = (...args) => {
                    if (v?._name === trace_variable) {
                        debugger;
                        console.log(trace_variable, type, ...args);
                    }
                    // The old is often a prototype, so we use Reflect to call it
                    if (old) {
                        if (v?._name === trace_variable) {
                            console.log(`previous: ${ type } ${ trace_variable }`);
                        }
                        Reflect.apply(old, v._observer, args);
                        if (type === 'fulfilled') {
                            if (detachNodes && isnode(args[0]) && observer._node !== args[0].parentNode) {
                                if (v?._name === trace_variable) {
                                    console.log(`dettaching existing DOM: ${ trace_variable }`);
                                }
                                args[0].remove();
                            }
                        }
                    }
                    if (v?._name === trace_variable) {
                        console.log(`tapped ${ trace_variable } ${ type }`);
                    }
                    if (observer[type])
                        observer[type](...args);
                };
                cancels.add(() => v._observer[type] = old);
            });
            if (v?._name === trace_variable) {
                debugger;
                console.log(`checking`, trace_variable, v, toObject(v), v._value);
            }
        }
        // Resolve initial state
        if (v._value !== undefined) {
            queueMicrotask(() => {
                if (detachNodes && isnode(v._value) && observer._node !== v._value.parentNode) {
                    if (v?._name === trace_variable) {
                        console.log(`dettaching existing DOM: ${ trace_variable }`);
                    }
                    v._value.remove();
                }
                if (v?._name === trace_variable) {
                    console.log(`tapped fulfilled: ${ trace_variable }`);
                }
                observer.fulfilled(v._value, v._name);
            });
        } else {
            // either in pending or error state, we can check by racing a promise
            getPromiseState(v._promise).then(({state, error, value}) => {
                if (v?._name === trace_variable) {
                    debugger;
                }
                if (state == 'rejected') {
                    if (observer.rejected)
                        observer.rejected(error, v._name);
                } else if (state == 'pending') {
                    if (observer.pending)
                        observer.pending();
                }    /*
      Removed coz non-undefined should have been caught, and the initial
      promise assigned to a variable resolves to undefined
      else if (state == "fulfilled") {
        if (observer.fulfilled) observer.fulfilled(value, v._name);
      }*/
            });
        }
        return onCancel;
    };
}
;

const _1259 = function(md){return(
md`### descendants

live view of a variable (s) and all its dataflow successors`
)};

const _1260 = function descendants(){return(
function (...variables) {
    const results = new Set(variables);
    const queue = variables;
    do {
        [...queue.pop()._outputs].forEach(v => {
            if (!results.has(v)) {
                results.add(v);
                queue.push(v);
            }
        });
    } while (queue.length);
    return results;
}
)};

const _1261 = async function decendants_example(descendants,lookupVariable,main,toObject){return(
[...descendants(await lookupVariable('runtime', main))].map(toObject)
)};

const _1262 = function(md){return(
md`### ascendants`
)};

const _1263 = function ascendants(){return(
function (...variables) {
    const results = new Set(variables);
    const queue = variables;
    do {
        [...queue.pop()._inputs].forEach(v => {
            if (!results.has(v)) {
                results.add(v);
                queue.push(v);
            }
        });
    } while (queue.length);
    return results;
}
)};

const _1264 = async function ascendants_example(ascendants,lookupVariable,main,toObject){return(
[...ascendants(await lookupVariable('runtime', main))].map(toObject)
)};

const _1265 = function(md){return(
md`### lookupVariable
lookup a variable by name in a module, pass an array to lookup multiple`
)};

const _1266 = function lookupVariable(){return(
async function lookupVariable(name_or_names, module) {
    if (typeof name_or_names === 'string') {
        const name = name_or_names;
        // new.observablehq (notebook-kit) spells viewof/mutable cells "viewof$x";
        // legacy + lopecode use "viewof x". Accept either spelling at this boundary.
        const candidates = [...new Set([
            name,
            name.replace(/^(viewof|mutable)\$/, '$1 '), // platform -> legacy
            name.replace(/^(viewof|mutable) /, '$1$'),  // legacy -> platform
        ])];
        const get = () => {
            for (const c of candidates) { const v = module._scope.get(c); if (v) return v; }
        };
        let retries = 0;
        while (!get() && retries++ < 1000) {
            await new Promise(r => requestAnimationFrame(r));
        }
        return get();
    } else if (Array.isArray(name_or_names)) {
        return Promise.all(name_or_names.map(name => lookupVariable(name, module)));
    } else {
        throw 'name_or_names should be string of an array';
    }
}
)};

const _1267 = function(md){return(
md`### persistentId

An id that follows are variable around even if the page is restarted or the name changes.`
)};

const _1268 = function persistentIdToVariableRef(){return(
new Map()
)};

const _1269 = function getVariableByPersistentId(persistentIdToVariableRef,WeakRef)
{
    return (pid, runtime) => {
        const cache = persistentIdToVariableRef.get(pid);
        if (cache)
            return cache.deref();
        else {
            // might be in runtime but not discovered yet
            return [...runtime._variables].find(v => {
                // cache
                persistentIdToVariableRef.set(v.pid, new WeakRef(v));
                return v.pid === pid;    // check for matches
            });
        }
    };
}
;

const _1270 = function persistentId(contentHash,persistentIdToVariableRef,WeakRef){return(
(v) => {
  if (!v._module) throw new Error("Call on a variable");
  if (!v.pid) {
    v.pid = contentHash(v._name + v._definition.toString());
    persistentIdToVariableRef.set(v.pid, new WeakRef(v));
  }
  return v.pid;
}
)};

const _1271 = async function test_persistentId(lookupVariable,myModule,persistentId)
{
  const v = await lookupVariable("persistentId", myModule);
  const id = persistentId(v);
  if (id !== "_o83sai") throw "persistentId changed";
  return "ok";
}
;

const _1272 = function(md){return(
md`### obj_observer

The global Observer factory introduced in the Notebook 2.0 environment`
)};

const _1273 = function ojs_observer(myModule){return(
myModule._runtime._builtin._scope.get('__ojs_observer')?._value
)};

const _1274 = function(md){return(
md`### keepalive

Keep a named cell evaluated without a direct dataflow dependancy. Useful to keep background tasks alive in dependancies when another module imports them.`
)};

const _1275 = function keepalive(){return(
(module, variable_name) => {
    if (variable_name === undefined)
        debugger;
    const name = `dynamic observe ${ variable_name }`;
    console.log(`keepalive: ${ name }`);
    if (module._scope.has(name))
        return;
    const variable = module.variable({}).define(name, [variable_name], m => m);
    return () => variable.delete();
}
)};

const _1276 = function(md){return(
md`### isOnObservableCom`
)};

const _1277 = function isOnObservableCom(location){return(
() => location.href.includes('observableusercontent.com') && !location.href.includes('blob:')
)};

const _1278 = function(md){return(
md`### Realize

Used to convert function sources into real javascript functions. If on lopecode it is done through a module-shim so it passes through importShim.`
)};

const _1279 = function realize(id){return(
async function realize(sources, runtime) {
    if (runtime._global('importShim')) {
        return new Promise((resolve, reject) => {
            const uid = id();
            const document = runtime._global('document');
            const window = runtime._global('window');
            window[uid] = {
                resolve,
                reject
            };
            const assignments = sources.map((src, i) => `__results[${ i }] = (${ src });`).join('\n');
            document.head.appendChild(Object.assign(document.createElement('script'), {
                type: 'module-shim',
                innerHTML: `
              try {
                const runtime = window.__ojs_runtime;
                const __results = new Array(${ sources.length });
                ${ assignments }
                window['${ uid }'].resolve(__results);
              } catch(e) {
                window['${ uid }'].reject(e);
              } finally {
                delete window['${ uid }'];
              }
            `
            }));
        });
    } else {
        return sources.map(source => {
            let _fn;
            eval('_fn = ' + source);
            return _fn;
        });
    }
}
)};

const _1280 = function(md){return(
md`## Utils`
)};

const _1281 = function(md,id){return(
md`### id

${ id() }`
)};

const _1282 = function id()
{
    return () => // quick random id that is also a valid identifier
    Math.random().toString(36).replace(/[^a-z]+/g, '');
}
;

const _1283 = function(md){return(
md`### contentHash`
)};

const _1284 = function contentHash()
{
    return s => {
        s = String(s);
        let h = 2166136261;
        for (let i = 0; i < s.length; i++)
            h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        return '_' + (h >>> 0).toString(36);    // compact rep
    };
}
;

const _1285 = function(md){return(
md`### unorderedSync
Helper for syncing two arrays`
)};

const _1286 = function unorderedSync(_){return(
(goal, current, identityFn = _.isEqual) => ({
    add: _.differenceWith(goal, current, identityFn),
    remove: _.differenceWith(current, goal, (a, b) => identityFn(b, a))
})
)};

const _1287 = function(unorderedSync){return(
unorderedSync([
    {
        name: 'red',
        age: 12
    },
    {
        name: 'joe',
        age: 1
    }
], [
    { name: 'joe' },
    { name: 'jean' }
], (a, b) => a.name == b.name)
)};

const _1288 = function OBSERVED(){return(
new WeakMap()
)};

const _1289 = function(md){return(
md`### getPromiseState

figure out the status of a promise. If the promise is on another realm you have to eat a micro-tick (e.g. promise across iframes)`
)};

const _1290 = function getPromiseState(){return(
async function getPromiseState(p) {
    const sentinel = Symbol();
    try {
        const val = await Promise.race([
            p,
            Promise.resolve(sentinel)
        ]);
        return val === sentinel ? { state: 'pending' } : {
            state: 'fulfilled',
            fulfilled: val
        };
    } catch (err) {
        return {
            state: 'rejected',
            error: err
        };
    }
}
)};

const _1291 = function getPromiseStateCrossRealm(){return(
async function getPromiseStateCrossRealm(p) {
    let state = 'pending', value, error;
    p.then(v => (state = 'fulfilled', value = v), e => (state = 'rejected', error = e));
    await Promise.resolve();
    return state === 'pending' ? { state } : state === 'fulfilled' ? {
        state,
        value
    } : {
        state,
        error
    };
}
)};

const _1292 = function(md){return(
md`### observeSet

Attach a callback to Javascript set to get notified of mutations`
)};

const _1293 = function observeSet(OBSERVED,queueMicrotask)
{
    return (set, callback) => {
        if (typeof callback !== 'function')
            throw new TypeError('callback must be a function');
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
            const scheduleNotify = self => {
                meta.dirty = true;
                if (meta.pending)
                    return;
                meta.pending = true;
                queueMicrotask(() => {
                    meta.pending = false;
                    if (!meta.dirty)
                        return;
                    meta.dirty = false;
                    for (const cb of meta.observers) {
                        try {
                            // Keep callback shape: (op, args, set)
                            // You can standardize on op="dirty".
                            cb('dirty', [], self);
                        } catch {
                        }
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
            if (unsubbed)
                return;
            unsubbed = true;
            const m = OBSERVED.get(set);
            if (!m)
                return;
            m.observers.delete(callback);
            if (m.observers.size === 0) {
                set.add = m.originalAdd;
                set.delete = m.originalDelete;
                set.clear = m.originalClear;
                OBSERVED.delete(set);
            }
        };
    };
}
;

const _1294 = function(md){return(
md`### Reposition set

move an element's iteration order within a set.`
)};

const _1295 = function repositionSetElement()
{
    return function repositionSetElement(set, element, newPosition) {
        if (!set.has(element)) {
            throw new Error('Element not found in the set.');
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
    };
}
;

const _1299 = function importShim()
{
  if (window.importShim) return window.importShim;
  return (url, options) => import(url);
}
;

const _1296 = function(md){return(
md`---`
)};

const _1297 = function isnode(Element,Text){return(
value => {
    return (value instanceof Element || value instanceof Text) && value instanceof value.constructor;
}
)};

const _1298 = function toObject(){return(
v => Object.fromEntries(Object.getOwnPropertyNames(v).map(p => [
    p,
    v[p]
]))
)};

const _1302 = function mutable$trace_history(){return(
[]
)};

export default function define(runtime) {
  const main = runtime.module();
  main.define("title", ["md"], _1238);
  main.define("cell 1239", ["md"], _1239);
  main.define("cell 1303", ["@variable"], _1303);
  main.define("_runtime", ["cell 1303"], (_) => _._runtime);
  main.define("main", ["cell 1303"], (_) => _.main);
  main.define("runtime", ["_runtime"], _1380);
  main.define("cell 1240", ["md"], _1240);
  main.define("thisModule", ["EventTarget","find_with_tag","Event"], _1241);
  main.define("find_with_tag", ["runtime"], _1242);
  main.define("viewof myModule", ["thisModule"], _1300);
  main.define("myModule", ["Generators", "viewof myModule"], (G, _) => G.input(_));
  main.define("cell 1243", ["md"], _1243);
  main.define("createModule", [], _1244);
  main.define("deleteModule", [], _1245);
  main.define("cell 1246", ["md"], _1246);
  main.define("variables", ["Inputs","observeSet","Event"], _1247);
  main.define("cell 1248", ["runtime_variables"], _1248);
  main.define("viewof runtime_variables", ["variables","runtime"], _1301);
  main.define("runtime_variables", ["Generators", "viewof runtime_variables"], (G, _) => G.input(_));
  main.define("cell 1249", ["md"], _1249);
  main.define("last_change", ["Generators","invalidation","onCodeChange"], _1250);
  main.define("onCodeChange", ["keepalive","myModule","codeChangeListeners"], _1251);
  main.define("codeChangeListeners", [], _1252);
  main.define("check_for_code_change", ["runtime_variables","codeChangeListeners"], _1253);
  main.define("cell 1254", ["md"], _1254);
  main.define("trace_variable", [], _1255);
  main.define("no_observer", ["main"], _1256);
  main.define("observe", ["Element","Text","trace_variable","mutable trace_history","no_observer","queueMicrotask"], _1257);
  main.define("observeOld", ["trace_variable","_","no_observer","isnode","toObject","queueMicrotask","getPromiseState"], _1258);
  main.define("cell 1259", ["md"], _1259);
  main.define("descendants", [], _1260);
  main.define("decendants_example", ["descendants","lookupVariable","main","toObject"], _1261);
  main.define("cell 1262", ["md"], _1262);
  main.define("ascendants", [], _1263);
  main.define("ascendants_example", ["ascendants","lookupVariable","main","toObject"], _1264);
  main.define("cell 1265", ["md"], _1265);
  main.define("lookupVariable", [], _1266);
  main.define("cell 1267", ["md"], _1267);
  main.define("persistentIdToVariableRef", [], _1268);
  main.define("getVariableByPersistentId", ["persistentIdToVariableRef","WeakRef"], _1269);
  main.define("persistentId", ["contentHash","persistentIdToVariableRef","WeakRef"], _1270);
  main.define("test_persistentId", ["lookupVariable","myModule","persistentId"], _1271);
  main.define("cell 1272", ["md"], _1272);
  main.define("ojs_observer", ["myModule"], _1273);
  main.define("cell 1274", ["md"], _1274);
  main.define("keepalive", [], _1275);
  main.define("cell 1276", ["md"], _1276);
  main.define("isOnObservableCom", ["location"], _1277);
  main.define("cell 1278", ["md"], _1278);
  main.define("realize", ["id"], _1279);
  main.define("cell 1280", ["md"], _1280);
  main.define("cell 1281", ["md","id"], _1281);
  main.define("id", [], _1282);
  main.define("cell 1283", ["md"], _1283);
  main.define("contentHash", [], _1284);
  main.define("cell 1285", ["md"], _1285);
  main.define("unorderedSync", ["_"], _1286);
  main.define("cell 1287", ["unorderedSync"], _1287);
  main.define("OBSERVED", [], _1288);
  main.define("cell 1289", ["md"], _1289);
  main.define("getPromiseState", [], _1290);
  main.define("getPromiseStateCrossRealm", [], _1291);
  main.define("cell 1292", ["md"], _1292);
  main.define("observeSet", ["OBSERVED","queueMicrotask"], _1293);
  main.define("cell 1294", ["md"], _1294);
  main.define("repositionSetElement", [], _1295);
  main.define("importShim", [], _1299);
  main.define("cell 1296", ["md"], _1296);
  main.define("isnode", ["Element","Text"], _1297);
  main.define("toObject", [], _1298);
  main.define("initial trace_history", [], _1302);
  main.define("mutator trace_history", ["Mutable", "initial trace_history"], (M, _) => ((m) => [m, {get value() { return m.value; }, set value(v) { m.value = v; }}])(M(_)));
  main.define("mutable trace_history", ["mutator trace_history"], ([, m]) => m);
  main.define("trace_history", ["mutator trace_history"], ([m]) => m);
  return main;
}
