    // --- conf.parallel: automatic worker offload of eligible cell bodies ---
    // Patches Variable.prototype.define (same precedent as the tick patch above:
    // engine-level, applied BEFORE conf.mains import, so every userspace cell
    // flows through it while bootloader/builtin cells stay native).
    //
    // A cell offloads iff its definition source has no DOM/browser-global tokens,
    // no `this`, no mutation of its params, and every runtime argument survives
    // structured clone (functions and kits-of-functions are shipped by source —
    // the exporter-3 code-shipping rule). Any failure at any stage falls back to
    // the main thread and pins that cell there. Correctness first, speed second.
    if (conf.parallel) {
        // conf.parallel: true = every module (empirically hazardous: frame modules
        // like lopepage-2 contain clonable-but-realm-bound cells that break
        // SILENTLY when computed in a worker); an array of module names = only
        // cells belonging to those mains are eligible. Scoped is the sane default.
        const scoped = Array.isArray(conf.parallel);
        const allowedModules = new Set();
        let scopeActive = false;
        const Vproto = Object.getPrototypeOf(__ojs_runtime._variables.values().next().value);
        const DOM_RE = /\b(window|document|self|globalThis|navigator|location|alert|localStorage|sessionStorage|requestAnimationFrame|cancelAnimationFrame|CustomEvent|Event|EventTarget|MutationObserver|IntersectionObserver|ResizeObserver|XMLHttpRequest|Worker|history|screen|getComputedStyle|DOMParser|Image|Audio|AudioContext|customElements|importShim)\b/;
        const THIS_RE = /\bthis\b/;
        const MIN_SRC = 32;
        // Builtins that only exist with a DOM. A cell naming one of these as a
        // dependency can never run in a worker, and the dep list is known at
        // define time — cheaper and more deterministic than a speculative
        // offload that fails once and pins.
        const DOM_DEPS = new Set(['md', 'html', 'htl', 'svg', 'tex', 'dot', 'DOM', 'width', 'Inputs',
            'visibility', 'FileAttachment', 'Files', 'now', 'Plot', 'd3', 'Generators', 'Mutable', 'view']);
        const stats = window.__ojs_parallel = {
            enabled: true, scoped, offloaded: 0, completed: 0, fallbacks: 0, screenedMain: 0,
            workerMs: 0, fallbackLog: [], poolSize: 0,
            nextMain: null
        };
        let pool = null;
        const mkPool = () => {
            const harness = [
                'const fns = new Map();',
                'const getFn = (src) => { let f = fns.get(src); if (!f) { f = (0, eval)("(" + src + ")"); fns.set(src, f); } return f; };',
                'const decode = (a) => {',
                '  if (a && a.__lopeFn) return getFn(a.__lopeFn);',
                '  if (a && a.__lopeKit) { const o = {}; for (const k in a.__lopeKit) { const v = a.__lopeKit[k]; o[k] = v && v.__lopeFn ? getFn(v.__lopeFn) : v; } return o; }',
                '  return a;',
                '};',
                'onmessage = async (e) => {',
                '  const m = e.data;',
                '  try {',
                '    const f = getFn(m.src);',
                '    const r = await f(...m.args.map(decode));',
                '    try { postMessage({ id: m.id, ok: r }, r && r.buffer instanceof ArrayBuffer ? [r.buffer] : []); }',
                '    catch (err) { postMessage({ id: m.id, fallback: true, err: "unclonable result" }); }',
                '  } catch (err) { postMessage({ id: m.id, fallback: true, err: String(err && err.message || err) }); }',
                '};'
            ].join('\n');
            const url = window.URL.createObjectURL(new window.Blob([harness], { type: 'application/javascript' }));
            const size = Math.max(1, Math.min(Number(conf.parallelSize) || 8, (window.navigator.hardwareConcurrency || 8) - 2));
            stats.poolSize = size;
            let seq = 0;
            const pending = new Map(), idle = [], backlog = [];
            const free = (w) => { const nxt = backlog.shift(); if (nxt) run(w, nxt); else idle.push(w); };
            const run = (w, job) => {
                pending.set(job.id, job);
                try { w.postMessage({ id: job.id, src: job.src, args: job.args }); }
                catch (e) { pending.delete(job.id); free(w); job.reject({ __lopeFallback: true, reason: 'post: ' + e.message }); }
            };
            for (let i = 0; i < size; i++) {
                const w = new window.Worker(url);
                w.onmessage = (e) => {
                    const m = e.data;
                    const job = pending.get(m.id); pending.delete(m.id);
                    free(w);
                    if (!job) return;
                    if (m.fallback) job.reject({ __lopeFallback: true, reason: m.err });
                    else job.resolve(m.ok);
                };
                idle.push(w);
            }
            return {
                call: (src, args) => new Promise((resolve, reject) => {
                    const job = { id: ++seq, src, args, resolve, reject };
                    const w = idle.pop();
                    if (w) run(w, job); else backlog.push(job);
                })
            };
        };
        const encodeArg = (a) => {
            if (typeof a === 'function') return { __lopeFn: '' + a };
            if (a && typeof a === 'object' && Object.getPrototypeOf(a) === Object.prototype) {
                let hasFn = false;
                for (const k in a) if (typeof a[k] === 'function') { hasFn = true; break; }
                if (hasFn) {
                    const kit = {};
                    for (const k in a) kit[k] = typeof a[k] === 'function' ? { __lopeFn: '' + a[k] } : a[k];
                    return { __lopeKit: kit };
                }
            }
            return a;
        };
        const paramsOf = (src) => {
            const i = src.indexOf('('), j = src.indexOf(')', i);
            return i < 0 || j < 0 ? [] : src.slice(i + 1, j).split(',').map((s) => s.trim()).filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));
        };
        const mutatesParam = (src, params) => params.some((p) =>
            new RegExp('\\b' + p.replace(/\$/g, '\\$') + '\\s*(?:\\.[\\w$]+\\s*=[^=]|\\[[^\\]]*\\]\\s*=[^=]|\\.(?:set|push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin|clear|delete|add|dispatchEvent|addEventListener|append|appendChild)\\s*\\()').test(src));
        const eligible = (def, src) => {
            if (src.length < MIN_SRC) return false;
            if (def.constructor && /Generator/.test(def.constructor.name)) return false;
            if (DOM_RE.test(src) || THIS_RE.test(src)) return false;
            if (mutatesParam(src, paramsOf(src))) return false;
            return true;
        };
        // Raise scopeActive across instantiation of an allow-listed main.
        const origModule = __ojs_runtime.module;
        __ojs_runtime.module = function (define, observer) {
            if (scoped && define !== undefined && stats.nextMain && conf.parallel.includes(stats.nextMain)) {
                scopeActive = true;
                try { return origModule.call(this, define, observer); }
                finally { scopeActive = false; }
            }
            return origModule.call(this, define, observer);
        };
        const pinnedMain = new Set(); // definition sources that must run on the main thread
        const origDefine = Vproto.define;
        Vproto.define = function () {
            const args = Array.prototype.slice.call(arguments);
            const last = args.length - 1;
            const def = args[last];
            if (typeof def === 'function') {
                const src = '' + def;
                const mod = this._module;
                // Define-time scoping: cells define synchronously inside
                // runtime.module(define); the module wrapper below raises
                // scopeActive across that window when the main being loaded is
                // in the conf.parallel list. Cells outside the declared scope
                // keep their ORIGINAL definition object — wrapping frame cells
                // breaks _definition identity, which editor-5's dynamic-cell
                // machinery redefines against in a tight loop (observed: 17M
                // defines and a wedged boot). (runtime._init is unusable here:
                // the compiled module's no-arg runtime.module() clears it
                // before any cell defines.)
                if (scoped && scopeActive) allowedModules.add(mod);
                const cellName = typeof args[0] === 'string' ? args[0] : null;
                const isDynamic = cellName !== null && cellName.indexOf('dynamic ') === 0;
                const inScope = scoped ? allowedModules.has(mod) : true;
                const depNames = Array.isArray(args[1]) ? args[1] : [];
                const domDep = depNames.some((d) => DOM_DEPS.has(String(d).replace(/^viewof /, '')));
                if (inScope && !isDynamic && !domDep && eligible(def, src)) {
                    const wrapper = function (...cellArgs) {
                        if (!stats.enabled || pinnedMain.has(src)) { stats.screenedMain++; return def.apply(this, cellArgs); }
                        if (!pool) pool = mkPool();
                        const value0 = this;
                        const t0 = window.performance.now();
                        stats.offloaded++;
                        return pool.call(src, cellArgs.map(encodeArg)).then(
                            (r) => { stats.completed++; stats.workerMs += window.performance.now() - t0; return r; },
                            (e) => {
                                if (e && e.__lopeFallback) {
                                    pinnedMain.add(src);
                                    stats.fallbacks++;
                                    if (stats.fallbackLog.length < 40) stats.fallbackLog.push(src.slice(0, 60) + ' => ' + e.reason);
                                    return def.apply(value0, cellArgs);
                                }
                                throw e;
                            });
                    };
                    wrapper.toString = () => src; // exporter serializes _definition.toString()
                    args[last] = wrapper;
                }
            }
            return origDefine.apply(this, args);
        };
        console.log('[bootloader] parallel runtime enabled (' + (scoped ? 'scoped: ' + conf.parallel.join(',') : 'ALL modules') + '), pool<=' + (Number(conf.parallelSize) || 8));
    }
