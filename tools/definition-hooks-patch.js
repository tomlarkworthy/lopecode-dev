    // --- conf.hooks: generic definition-dispatch seam ------------------------
    // The bootloader installs NO policy and knows nothing about workers. Its only
    // job is to guarantee a stable interception point that exists BEFORE
    // conf.mains are imported, so a *userspace* module — which has full module
    // resolution available (acorn, the toolchain, exporter-3, the classifier) —
    // can install a policy later and have it apply to every cell defined since
    // boot, without the bootloader having to be clever or to be re-released.
    //
    // Contract: window.__ojs_hooks.setPolicy(fn) where
    //   fn(ctx) -> hooks.PASS  (decline; the original definition runs locally)
    //           -> any value or promise (becomes the cell's value)
    //   ctx = { definition, thisArg, args, name, module }
    //
    // IDENTITY IS THE WHOLE GAME. Exactly one wrapper exists per original
    // definition, shared by every variable that uses it, so `a._definition ===
    // b._definition` still holds wherever it held before. @tomlarkworthy/
    // dataflow-templating's cloneDataflow polls exactly that comparison between
    // a source cell and its clone and redefines on mismatch; a per-variable
    // wrapper makes the comparison permanently true and spins the runtime into
    // an unbounded redefine loop (measured: 17,040,000 defines in 12 s, page
    // dead). Wrapping is also idempotent — a wrapper is never re-wrapped.
    if (conf.hooks !== false) {
        const Vproto = Object.getPrototypeOf(__ojs_runtime._variables.values().next().value);
        const ORIG = Symbol.for('lopecode.hooks.original');
        const PASS = Symbol.for('lopecode.hooks.pass');
        const wrapperByOrig = new WeakMap();
        const metaByOrig = new WeakMap(); // last define site: for policy scoping/reporting only
        const api = window.__ojs_hooks = {
            version: 1,
            PASS: PASS,
            policy: null,
            runtime: __ojs_runtime,
            setPolicy(fn) {
                api.policy = fn;
                return () => { if (api.policy === fn) api.policy = null; };
            },
            // the true authored definition, for identity checks and toString
            original(def) { return (def && def[ORIG]) || def; }
        };
        const origDefine = Vproto.define;
        Vproto.define = function () {
            const args = Array.prototype.slice.call(arguments);
            const i = args.length - 1;
            const def = args[i];
            if (typeof def === 'function') {
                const orig = def[ORIG] || def; // idempotent: never wrap a wrapper
                metaByOrig.set(orig, { name: typeof args[0] === 'string' ? args[0] : this._name, module: this._module });
                let w = wrapperByOrig.get(orig);
                if (!w) {
                    w = function () {
                        const policy = api.policy;
                        if (policy) {
                            const meta = metaByOrig.get(orig) || {};
                            const r = policy({
                                definition: orig,
                                thisArg: this,
                                args: Array.prototype.slice.call(arguments),
                                name: meta.name,
                                module: meta.module
                            });
                            if (r !== PASS) return r;
                        }
                        return orig.apply(this, arguments);
                    };
                    try {
                        w[ORIG] = orig;
                        w.toString = function () { return orig.toString(); };
                    } catch (e) { w = orig; /* exotic function: leave unwrapped */ }
                    wrapperByOrig.set(orig, w);
                }
                args[i] = w;
            }
            return origDefine.apply(this, args);
        };
        console.log('[bootloader] definition hooks installed (window.__ojs_hooks; no policy)');
    }
