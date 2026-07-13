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
const _1h5qtfr = function _runtime(_runtime)
{
  window.__ojs_runtime = window.__ojs_runtime || _runtime;
  return _runtime;
};
const _g74eb8 = function _5(md){return(
md`### thisModule()

Obtain a reference to the enclosing module as a view. Use like this
\`\`\`
viewof notebookModule = thisModule()
\`\`\``
)};
const _3rh6v1 = function _thisModule(EventTarget,find_with_tag,Event){return(
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
const _1bdarwe = function _find_with_tag(runtime){return(
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
const _14bivfb = function _myModule(thisModule){return(
thisModule()
)};
const _1cir47e = (G, _) => G.input(_);
const _qflxlf = function _9(md){return(
md`### create/delete Module`
)};
const _bxy6wl = function _createModule(){return(
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
const _mi8uf6 = function _deleteModule()
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
};
const _1e5seny = function _12(md){return(
md`### viewof variables

a live view of variables in a runtime`
)};
const _12t1ysb = function _variables(Inputs,observeSet,Event)
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
};
const _czqwrw = function _14(runtime_variables){return(
runtime_variables
)};
const _yg4n67 = function _runtime_variables(variables,runtime){return(
variables(runtime)
)};
const _340ur0 = (G, _) => G.input(_);
const _1jnnn39 = function _16(md){return(
md`### \`onCodeChange(callback)\`

Register a callback that will be notified of changed code definitions. It has to be a callback because changes can occur rapidly. Returns an unsubscribe function.
~~~js
({
  variable: Variable
  previous: {_module, _name, _inputs, _definition} | null
})
~~~`
)};
const _1p5os0 = function _last_change(Generators,invalidation,onCodeChange){return(
Generators.observe(notify => {
    invalidation.then(onCodeChange(notify));
})
)};
const _2viczv = function _onCodeChange(keepalive,myModule,codeChangeListeners){return(
callback => {
    keepalive(myModule, 'check_for_code_change');
    codeChangeListeners.add(callback);
    return () => codeChangeListeners.delete(callback);
}
)};
const _5oqbod = function _codeChangeListeners(){return(
new Set()
)};
const _nv232r = function _check_for_code_change(runtime_variables,codeChangeListeners)
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
};
const _ya86a1 = function _21(md){return(
md`### observe(variable)

This was monstrously difficult to develop. Installs a single dispatcher observer per variable holding an explicit listener list; each \`observe\` call adds a listener and returns a cancel that removes it, so attach/cancel can interleave in any order (views remount). A pre-existing observer (e.g. a bootloader Inspector) is kept as a permanent first listener. Delivery of \`["fulfilled", "rejected", "pending"]\` runs in attach order; for element values, a listener with \`detachNodes: true\` detaches the node from its current parent before adopting, so the last-attached view owns the node. When the observer attaches, if the variable is already fulfilled, the observer is signalled.

Unobserved variables are marked as reachable and become active when observed.`
)};
const _tgfgv9 = function _trace_variable(){return(
'---'
)};
const _1hx65vf = function _no_observer(main)
{
    const variable = main.variable();
    const symbol = variable._observer;
    variable.delete();
    return symbol;
};
const _duwj4o = function _observe(Element,Text,trace_variable,$0,no_observer,queueMicrotask)
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
                $0.value = $0.value.concat([snapshot({
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
};
const _16ohhcn = function _observeOld(trace_variable,_,no_observer,isnode,toObject,queueMicrotask,getPromiseState)
{
    return function observeOld(v, observer, {invalidation, detachNodes = false} = {}) {
        const cancels = new Set();
        const onCancel = () => cancels.forEach(f => f());
        if (invalidation)
            invalidation.then(onCancel);
        if (v?._name === trace_variable) {
            console.log('observe', trace_variable, v);
            void 0;
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
                        void 0;
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
                void 0;
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
                    void 0;
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
};
const _2kni3y = function _26(md){return(
md`### descendants

live view of a variable (s) and all its dataflow successors`
)};
const _1utnee9 = function _descendants(){return(
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
const _yjlyz = async function _decendants_example(descendants,lookupVariable,main,toObject){return(
[...descendants(await lookupVariable('runtime', main))].map(toObject)
)};
const _2nfwg9 = function _29(md){return(
md`### ascendants`
)};
const _e0z7e2 = function _ascendants(){return(
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
const _1kxbej = async function _ascendants_example(ascendants,lookupVariable,main,toObject){return(
[...ascendants(await lookupVariable('runtime', main))].map(toObject)
)};
const _10rsemi = function _32(md){return(
md`### lookupVariable
lookup a variable by name in a module, pass an array to lookup multiple`
)};
const _1l90etb = function _lookupVariable(){return(
async function lookupVariable(name_or_names, module) {
    if (typeof name_or_names === 'string') {
        let v, retries, name = name_or_names;
        while (!module._scope.get(name) && retries++ < 1000) {
            await new Promise(r => requestAnimationFrame(r));
        }
        return module._scope.get(name);
    } else if (Array.isArray(name_or_names)) {
        return Promise.all(name_or_names.map(name => lookupVariable(name, module)));
    } else {
        throw 'name_or_names should be string of an array';
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
const _12s2v4c = function _getVariableByPersistentId(persistentIdToVariableRef,WeakRef)
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
};
const _spmjyh = function _persistentId(contentHash,persistentIdToVariableRef,WeakRef){return(
v => {
    if (!v._observer)
        throw new Error('Call on a variable');
    if (!v.pid) {
        v.pid = contentHash(v._name + v._definition.toString());
        persistentIdToVariableRef.set(v.pid, new WeakRef(v));
    }
    return v.pid;
}
)};
const _1jyou2n = async function _test_persistentId(lookupVariable,myModule,persistentId)
{
    const v = await lookupVariable('persistentId', myModule);
    if (persistentId(v) !== '_4ie7s1')
        throw 'persistentId changed';
    return 'ok';
};
const _1fxvgy1 = function _39(md){return(
md`### obj_observer

The global Observer factory introduced in the Notebook 2.0 environment`
)};
const _z6oz1f = function _ojs_observer(myModule){return(
myModule._runtime._builtin._scope.get('__ojs_observer')?._value
)};
const _cf0hco = function _41(md){return(
md`### keepalive

Keep a named cell evaluated without a direct dataflow dependancy. Useful to keep background tasks alive in dependancies when another module imports them.`
)};
const _12v8rf5 = function _keepalive(){return(
(module, variable_name) => {
    if (variable_name === undefined)
        void 0;
    const name = `dynamic observe ${ variable_name }`;
    console.log(`keepalive: ${ name }`);
    if (module._scope.has(name))
        return;
    const variable = module.variable({}).define(name, [variable_name], m => m);
    return () => variable.delete();
}
)};
const _4shbwa = function _43(md){return(
md`### isOnObservableCom`
)};
const _10ti723 = function _isOnObservableCom(location){return(
() => location.href.includes('observableusercontent.com') && !location.href.includes('blob:')
)};
const _1068wab = function _45(md){return(
md`### Realize

Used to convert function sources into real javascript functions. If on lopecode it is done through a module-shim so it passes through importShim.`
)};
const _1ny04et = function _realize(id){return(
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
const _mzhfcr = function _47(md){return(
md`## Utils`
)};
const _1vlsfsw = function _48(md,id){return(
md`### id

${ id() }`
)};
const _1hvbkoy = function _id()
{
    return () => // quick random id that is also a valid identifier
    Math.random().toString(36).replace(/[^a-z]+/g, '');
};
const _1hlvcn2 = function _50(md){return(
md`### contentHash`
)};
const _u2fef4 = function _contentHash()
{
    return s => {
        s = String(s);
        let h = 2166136261;
        for (let i = 0; i < s.length; i++)
            h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        return '_' + (h >>> 0).toString(36);    // compact rep
    };
};
const _1b37qxm = function _52(md){return(
md`### unorderedSync
Helper for syncing two arrays`
)};
const _afh0vw = function _unorderedSync(_){return(
(goal, current, identityFn = _.isEqual) => ({
    add: _.differenceWith(goal, current, identityFn),
    remove: _.differenceWith(current, goal, (a, b) => identityFn(b, a))
})
)};
const _1kqy5qi = function _54(unorderedSync){return(
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
const _1nh0nrp = function _OBSERVED(){return(
new WeakMap()
)};
const _1iv8wgg = function _56(md){return(
md`### getPromiseState

figure out the status of a promise. If the promise is on another realm you have to eat a micro-tick (e.g. promise across iframes)`
)};
const _1gni6h1 = function _getPromiseState(){return(
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
const _1rdiq0p = function _getPromiseStateCrossRealm(){return(
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
const _rrd6rh = function _59(md){return(
md`### observeSet

Attach a callback to Javascript set to get notified of mutations`
)};
const _v9fbr7 = function _observeSet(OBSERVED,queueMicrotask)
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
};
const _19sh8su = function _61(md){return(
md`### Reposition set

move an element's iteration order within a set.`
)};
const _1dj2tmj = function _repositionSetElement()
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
};
const _17vfigr = function _63(md){return(
md`### \`importShim\` polyfill

Lopecode uses importShim which is not availible on Observablehq`
)};
const _12odeih = function _importShim() {
    if (window.importShim)
        return window.importShim;
    return (url, options) => import(url);
};
const _1nrqtih = function _65(md){return(
md`---`
)};
const _v2cm1y = function _isnode(Element,Text){return(
value => {
    return (value instanceof Element || value instanceof Text) && value instanceof value.constructor;
}
)};
const _1s528dq = function _toObject(){return(
v => Object.fromEntries(Object.getOwnPropertyNames(v).map(p => [
    p,
    v[p]
]))
)};
const _136vd02 = function _trace_history(){return(
[]
)};
const _7xa5y2 = (M, _) => new M(_);
const _w9vom3 = _ => _.generator;

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @mootari/access-runtime", async () => runtime.module((await import("/@mootari/access-runtime.js?v=4")).default));  
  $def("_exoevq", "title", ["md"], _exoevq);  
  $def("_jaxte9", null, ["md"], _jaxte9);  
  main.define("_runtime", ["module @mootari/access-runtime", "@variable"], (_, v) => v.import("runtime", "_runtime", _));  
  main.define("main", ["module @mootari/access-runtime", "@variable"], (_, v) => v.import("main", _));  
  $def("_1h5qtfr", "runtime", ["_runtime"], _1h5qtfr);  
  $def("_g74eb8", null, ["md"], _g74eb8);  
  $def("_3rh6v1", "thisModule", ["EventTarget","find_with_tag","Event"], _3rh6v1);  
  $def("_1bdarwe", "find_with_tag", ["runtime"], _1bdarwe);  
  $def("_14bivfb", "viewof myModule", ["thisModule"], _14bivfb);  
  $def("_1cir47e", "myModule", ["Generators","viewof myModule"], _1cir47e);  
  $def("_qflxlf", null, ["md"], _qflxlf);  
  $def("_bxy6wl", "createModule", [], _bxy6wl);  
  $def("_mi8uf6", "deleteModule", [], _mi8uf6);  
  $def("_1e5seny", null, ["md"], _1e5seny);  
  $def("_12t1ysb", "variables", ["Inputs","observeSet","Event"], _12t1ysb);  
  $def("_czqwrw", null, ["runtime_variables"], _czqwrw);  
  $def("_yg4n67", "viewof runtime_variables", ["variables","runtime"], _yg4n67);  
  $def("_340ur0", "runtime_variables", ["Generators","viewof runtime_variables"], _340ur0);  
  $def("_1jnnn39", null, ["md"], _1jnnn39);  
  $def("_1p5os0", "last_change", ["Generators","invalidation","onCodeChange"], _1p5os0);  
  $def("_2viczv", "onCodeChange", ["keepalive","myModule","codeChangeListeners"], _2viczv);  
  $def("_5oqbod", "codeChangeListeners", [], _5oqbod);  
  $def("_nv232r", "check_for_code_change", ["runtime_variables","codeChangeListeners"], _nv232r);  
  $def("_ya86a1", null, ["md"], _ya86a1);  
  $def("_tgfgv9", "trace_variable", [], _tgfgv9);  
  $def("_1hx65vf", "no_observer", ["main"], _1hx65vf);  
  $def("_duwj4o", "observe", ["Element","Text","trace_variable","mutable trace_history","no_observer","queueMicrotask"], _duwj4o);  
  $def("_16ohhcn", "observeOld", ["trace_variable","_","no_observer","isnode","toObject","queueMicrotask","getPromiseState"], _16ohhcn);  
  $def("_2kni3y", null, ["md"], _2kni3y);  
  $def("_1utnee9", "descendants", [], _1utnee9);  
  $def("_yjlyz", "decendants_example", ["descendants","lookupVariable","main","toObject"], _yjlyz);  
  $def("_2nfwg9", null, ["md"], _2nfwg9);  
  $def("_e0z7e2", "ascendants", [], _e0z7e2);  
  $def("_1kxbej", "ascendants_example", ["ascendants","lookupVariable","main","toObject"], _1kxbej);  
  $def("_10rsemi", null, ["md"], _10rsemi);  
  $def("_1l90etb", "lookupVariable", [], _1l90etb);  
  $def("_11hb1zq", null, ["md"], _11hb1zq);  
  $def("_kd8snz", "persistentIdToVariableRef", [], _kd8snz);  
  $def("_12s2v4c", "getVariableByPersistentId", ["persistentIdToVariableRef","WeakRef"], _12s2v4c);  
  $def("_spmjyh", "persistentId", ["contentHash","persistentIdToVariableRef","WeakRef"], _spmjyh);  
  $def("_1jyou2n", "test_persistentId", ["lookupVariable","myModule","persistentId"], _1jyou2n);  
  $def("_1fxvgy1", null, ["md"], _1fxvgy1);  
  $def("_z6oz1f", "ojs_observer", ["myModule"], _z6oz1f);  
  $def("_cf0hco", null, ["md"], _cf0hco);  
  $def("_12v8rf5", "keepalive", [], _12v8rf5);  
  $def("_4shbwa", null, ["md"], _4shbwa);  
  $def("_10ti723", "isOnObservableCom", ["location"], _10ti723);  
  $def("_1068wab", null, ["md"], _1068wab);  
  $def("_1ny04et", "realize", ["id"], _1ny04et);  
  $def("_mzhfcr", null, ["md"], _mzhfcr);  
  $def("_1vlsfsw", null, ["md","id"], _1vlsfsw);  
  $def("_1hvbkoy", "id", [], _1hvbkoy);  
  $def("_1hlvcn2", null, ["md"], _1hlvcn2);  
  $def("_u2fef4", "contentHash", [], _u2fef4);  
  $def("_1b37qxm", null, ["md"], _1b37qxm);  
  $def("_afh0vw", "unorderedSync", ["_"], _afh0vw);  
  $def("_1kqy5qi", null, ["unorderedSync"], _1kqy5qi);  
  $def("_1nh0nrp", "OBSERVED", [], _1nh0nrp);  
  $def("_1iv8wgg", null, ["md"], _1iv8wgg);  
  $def("_1gni6h1", "getPromiseState", [], _1gni6h1);  
  $def("_1rdiq0p", "getPromiseStateCrossRealm", [], _1rdiq0p);  
  $def("_rrd6rh", null, ["md"], _rrd6rh);  
  $def("_v9fbr7", "observeSet", ["OBSERVED","queueMicrotask"], _v9fbr7);  
  $def("_19sh8su", null, ["md"], _19sh8su);  
  $def("_1dj2tmj", "repositionSetElement", [], _1dj2tmj);  
  $def("_17vfigr", null, ["md"], _17vfigr);  
  $def("_12odeih", "importShim", [], _12odeih);  
  $def("_1nrqtih", null, ["md"], _1nrqtih);  
  $def("_v2cm1y", "isnode", ["Element","Text"], _v2cm1y);  
  $def("_1s528dq", "toObject", [], _1s528dq);  
  $def("_136vd02", "initial trace_history", [], _136vd02);  
  $def("_7xa5y2", "mutable trace_history", ["Mutable","initial trace_history"], _7xa5y2);  
  $def("_w9vom3", "trace_history", ["mutable trace_history"], _w9vom3);
  return main;
}