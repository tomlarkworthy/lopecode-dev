const _yyrxg4 = function _1(md){return(
md`# robocoop-5 srctools
File tools over a virtual /src (byte-stable, stored on each module's compiled define function as \`.src\`),
/notebook (canonical decompile, synthesized per read) and /content (raw blocks + attachments, read direct).
No shell, no filesystem, no sync loop. Tools register through \`@tomlarkworthy/robocoop-5-tools\`.`
)};
const _76otvk = function _cellHelpers(currentModules,runtime)
{
  const resolveModule = id => {
    for (const [, info] of currentModules)
      if (info && info.name === id)
        return info.module;
    if (runtime.mains && runtime.mains.has(id))
      return runtime.mains.get(id);
    return null;
  };
  const varsOf = mod => [...runtime._variables].filter(v => v._module === mod);
  const isStructural = v => !v.pid && (!v._name || String(v._name).startsWith('module ') || v._name === '@variable' || String(v._name).startsWith('initial '));
  const label = v => (v.pid ? v.pid : '(derived)') + (v._name ? ' ' + v._name : ' (anonymous)');
  const oneLine = s => String(s).replace(/\s+/g, ' ').trim();
  const watchKey = (module, pid, name) => module + ':' + (pid || name);
  return {
    resolveModule,
    varsOf,
    isStructural,
    label,
    oneLine,
    watchKey
  };
};
const _19x8b93 = function _rc5_store(){return(
{
  srcFns: new Map(),
  scratch: new Map()
}
)};
const _o37ix1 = function _pathLib(currentModules, runtime, rc5_store, all_module_files, exportModuleJS, importShim) {
    const isStyle = id => /^https?:\/\//.test(id) || /\.css$/.test(id);
    const isAttachment = id => /^@?[^/]+\/[^/]+\/.+/.test(id) || /^file:/.test(id);
    const moduleIds = () => {
        const ids = new Set();
        try {
            for (const [, info] of currentModules)
                if (info && info.name)
                    ids.add(info.name);
        } catch (e) {
        }
        try {
            if (runtime.mains)
                for (const k of runtime.mains.keys())
                    ids.add(k);
        } catch (e) {
        }
        for (const k of rc5_store.srcFns.keys())
            ids.add(k);
        return [...ids];
    };
    const blockIds = () => {
        const live = new Set(moduleIds());
        const out = [];
        for (const el of document.querySelectorAll('script[type="text/plain"][id]')) {
            const id = el.id;
            if (isStyle(id) || isAttachment(id) || live.has(id))
                continue;
            out.push(id);
        }
        return out;
    };
    const listPaths = () => {
        const out = [...rc5_store.scratch.keys()];
        for (const id of moduleIds()) {
            out.push('/src/' + id + '.js');
            out.push('/notebook/' + id + '.js');
        }
        for (const id of blockIds())
            out.push('/content/' + id);
        for (const f of all_module_files)
            out.push('/content/' + f.module + '/' + f.name);
        return out.sort();
    };
    const b64ToBytes = b64 => {
        const bin = atob(String(b64).replace(/\s+/g, ''));
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++)
            u[i] = bin.charCodeAt(i);
        return u;
    };
    const seedSrc = async id => {
        const ex = await exportModuleJS(id);
        let fn = function pendingDefine() {
        };
        try {
            const url = URL.createObjectURL(new Blob([ex.source], { type: 'text/javascript' }));
            try {
                const mod = await import(url);
                if (typeof mod.default === 'function')
                    fn = mod.default;
            } finally {
                URL.revokeObjectURL(url);
            }
        } catch (e) {
        }
        fn.src = ex.source;
        rc5_store.srcFns.set(id, fn);
        return ex.source;
    };
    const readPath = async path => {
        if (rc5_store.scratch.has(path))
            return rc5_store.scratch.get(path);
        let m = /^\/src\/(.+)\.js$/.exec(path);
        if (m) {
            const ent = rc5_store.srcFns.get(m[1]);
            if (ent && typeof ent.src === 'string')
                return ent.src;
            try {
                return await seedSrc(m[1]);
            } catch (e) {
                return null;
            }
        }
        m = /^\/notebook\/(.+)\.js$/.exec(path);
        if (m) {
            try {
                return (await exportModuleJS(m[1])).source;
            } catch (e) {
                return null;
            }
        }
        m = /^\/content\/(.+)$/.exec(path);
        if (m) {
            const rest = m[1];
            const att = all_module_files.find(f => f.module + '/' + f.name === rest);
            if (att) {
                try {
                    return new TextDecoder().decode(new Uint8Array(await (await fetch(att.url)).arrayBuffer()));
                } catch (e) {
                    return null;
                }
            }
            const el = document.getElementById(rest);
            if (el && el.tagName === 'SCRIPT') {
                const enc = (el.getAttribute('data-encoding') || 'text').toLowerCase();
                const raw = el.textContent || '';
                if (enc === 'text')
                    return raw;
                try {
                    return new TextDecoder().decode(b64ToBytes(raw));
                } catch (e) {
                    return null;
                }
            }
            return null;
        }
        return null;
    };
    const globToRe = pat => {
        let s = String(pat).replace(/[.+^${}()|[\]\\]/g, '\\$&');
        s = s.replace(/\*\*\//g, '\x01').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
        s = s.replace(/\u0001/g, '(?:[^/]*/)*').replace(/\u0000/g, '.*');
        return new RegExp('^' + s + '$');
    };
    return {
        moduleIds,
        listPaths,
        readPath,
        seedSrc,
        globToRe
    };
};
const _speclib = function _specLib(cellHelpers, rc5_store, rc5_specGate) {
    // spec-lock: /src/@user/spec.js declares one cell `examples` = [{name, js, expected}]. Each `js` is an
    // expression evaluated with @user/solution's cells in scope; `expected` must be COPIED from the task
    // spec. Re-run on every module write; the scorecard also gates task_complete (via rc5_specGate).
    const {resolveModule, varsOf, isStructural} = cellHelpers;
    const AsyncFunction = Object.getPrototypeOf(async function () {
    }).constructor;
    const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    const timed = (p, ms, tag) => Promise.race([
        Promise.resolve(p),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + ms + 'ms' + (tag ? ' (' + tag + ')' : ''))), ms))
    ]);
    const deepEqual = (a, b) => {
        if (Object.is(a, b))
            return true;
        if (Array.isArray(a) || Array.isArray(b))
            return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
        if (a && b && typeof a === 'object' && typeof b === 'object') {
            const ka = Object.keys(a), kb = Object.keys(b);
            return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
        }
        return false;
    };
    const brief = v => {
        try {
            const s = JSON.stringify(v);
            return (s === undefined ? String(v) : s).slice(0, 120);
        } catch (e) {
            return String(v).slice(0, 120);
        }
    };
    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    const leaves = v => {
        if (v === null || v === undefined)
            return [];
        if (Array.isArray(v))
            return v.flatMap(leaves);
        if (typeof v === 'object')
            return Object.values(v).flatMap(leaves);
        return typeof v === 'string' || typeof v === 'number' ? [v] : [];
    };
    // A short number (≤2 digits) is exempt: it matches almost any prose, so it cannot evidence a copy.
    const leafGrounded = (hay, leaf) => typeof leaf === 'number' && String(leaf).replace(/\D/g, '').length <= 2 ? true : hay.includes(norm(leaf));
    const cellNames = mod => [...new Set(varsOf(mod).filter(v => v._name && !isStructural(v) && IDENT.test(v._name)).map(v => v._name))];
    const runExample = async (mod, names, js) => {
        const used = names.filter(n => new RegExp('(^|[^A-Za-z0-9_$.])' + n + '($|[^A-Za-z0-9_$])').test(js));
        const fn = new AsyncFunction(...used, 'return (' + js + ')');
        const args = [];
        for (const n of used)
            args.push(await timed(mod.value(n), 2000, n));
        return await timed(fn(...args), 2000, 'expression');
    };
    const readExamples = async () => {
        const mod = resolveModule('@user/spec');
        if (!mod)
            return null;
        let examples;
        try {
            examples = await timed(mod.value('examples'), 4000, 'examples');
        } catch (e) {
            return null;
        }
        return Array.isArray(examples) && examples.length ? examples : null;
    };
    const computeScorecard = async () => {
        const examples = await readExamples();
        if (!examples)
            return null;
        const sol = resolveModule('@user/solution');
        const names = sol ? cellNames(sol) : [];
        const doc = rc5_store.scratch.get('/instructions.md');
        const hay = typeof doc === 'string' ? norm(doc) : null;
        const passing = [], failing = [], ungrounded = [];
        for (let i = 0; i < examples.length; i++) {
            const ex = examples[i] || {};
            const name = String(ex.name || 'example ' + (i + 1));
            if (!sol)
                failing.push({
                    name,
                    err: 'no @user/solution module'
                });
            else
                try {
                    const got = await runExample(sol, names, String(ex.js ?? ''));
                    if (deepEqual(got, ex.expected))
                        passing.push(name);
                    else
                        failing.push({
                            name,
                            got: brief(got)
                        });
                } catch (e) {
                    failing.push({
                        name,
                        err: String(e).slice(0, 200)
                    });
                }
            if (hay !== null && !leaves(ex.expected).every(l => leafGrounded(hay, l)))
                ungrounded.push(name);
        }
        return {
            total: examples.length,
            passing,
            failing,
            ungrounded: hay === null ? null : ungrounded
        };
    };
    const greenMsg = sc => {
        let msg = ' \xB7 \u2713 spec scorecard ' + sc.total + '/' + sc.total + ' examples pass';
        if (!sc.ungrounded)
            return msg;
        const k = sc.ungrounded.length;
        msg += ' (' + (sc.total - k) + '/' + sc.total + ' grounded verbatim in /instructions.md)';
        if (k)
            msg += ' \u2014 WARNING ' + k + ' UNGROUNDED (paraphrased, not copied): ' + sc.ungrounded.join(', ') + ' (informational \u2014 fine if derived from stated rules; never delete examples to satisfy grounding)';
        return msg;
    };
    const redMsg = sc => {
        const det = sc.failing.slice(0, 6).map(f => f.name + (f.err ? ': ' + f.err : f.got !== undefined ? ' got ' + f.got : '')).join('; ');
        return ' \xB7 spec scorecard ' + sc.failing.length + '/' + sc.total + ' FAILING (' + det + (sc.failing.length > 6 ? ', \u2026' : '') + ') \u2014 fix before task_complete, or correct /src/@user/spec.js if an example mis-transcribes the spec';
    };
    const specStatus = async () => {
        let sc = null;
        try {
            sc = await computeScorecard();
        } catch (e) {
            sc = null;
        }
        rc5_specGate.scorecard = sc;
        if (!sc)
            return '';
        try {
            rc5_store.scratch.set('/spec-scorecard.json', JSON.stringify(sc));
        } catch (e) {
        }
        return sc.failing.length ? redMsg(sc) : greenMsg(sc);
    };
    return {
        computeScorecard,
        specStatus,
        deepEqual
    };
};
const _190yjiu = function _applyLib(jbApply, currentModules, runtime, probeDefine, createModule, cellHelpers, summarizeJS, rc5_watchBus, observe, importShim, location,navigate, rc5_store, descendants, specLib) {
    const apply = jbApply({
        currentModules,
        runtime,
        probeDefine,
        createModule
    });
    const {resolveModule, varsOf, isStructural, oneLine, watchKey} = cellHelpers;
    const summ = val => {
        if (typeof val === 'string')
            return oneLine(val.length > 200 ? val.slice(0, 200) + ' \u2026(+' + (val.length - 200) + ' chars)' : val);
        try {
            return oneLine(summarizeJS(val, { max_size: 200 }));
        } catch (e) {
            return oneLine(String(val));
        }
    };
    const readVar = (mod, v) => new Promise(resolve => {
        let done = false;
        const finish = r => {
            if (!done) {
                done = true;
                resolve(r);
            }
        };
        if (v._error != null)
            return finish({ error: v._error && v._error.message || String(v._error) });
        if (v._name)
            Promise.resolve().then(() => mod.value(v._name)).then(value => finish({ value }), error => finish({ error: error && error.message || String(error) }));
        else {
            try {
                mod.value((varsOf(mod).find(x => x._name && !isStructural(x)) || {})._name).catch(() => {
                });
            } catch (e) {
            }
        }
        setTimeout(() => finish(v._value !== undefined ? { value: v._value } : { pending: true }), 4000);
    });
    const probeAndWatch = async id => {
        const mod = resolveModule(id);
        if (!mod)
            return null;
        const cells = varsOf(mod).filter(v => v._name && v.pid && !isStructural(v)).slice(0, 24);
        return Promise.all(cells.map(async v => {
            const base = await readVar(mod, v);
            const baseText = base.error ? '\u26A0 ' + base.error : summ(base.value);
            const wid = watchKey(id, v.pid, v._name);
            if (!rc5_watchBus.has(wid)) {
                let stop;
                const inv = new Promise(r => {
                    stop = r;
                });
                try {
                    observe(v, {
                        fulfilled: val => rc5_watchBus.record(wid, summ(val)),
                        rejected: err => rc5_watchBus.record(wid, '\u26A0 ' + (err && err.message || String(err))),
                        pending: () => {
                        }
                    }, { invalidation: inv });
                    rc5_watchBus.register(wid, id + ':' + v._name, stop, baseText);
                } catch (e) {
                }
            }
            return {
                name: v._name,
                error: base.error,
                value: base.error ? undefined : baseText
            };
        }));
    };
    const probeStatus = probe => {
        if (!probe || !probe.length)
            return '';
        const errored = probe.filter(r => r.error);
        const okCount = probe.length - errored.length;
        if (errored.length)
            return ' \xB7 \u26A0 ' + errored.length + ' cell' + (errored.length === 1 ? '' : 's') + ' ERRORING at runtime \u2014 ' + errored.map(e => e.name + ': ' + e.error).join('; ') + ' \u2014 FIX before task_complete (a compile-clean cell can still error when observed)';
        const vals = probe.filter(r => r.value !== undefined).slice(0, 8).map(r => r.name + '=' + r.value).join(', ');
        return ' \xB7 \u2713 all ' + okCount + ' cell' + (okCount === 1 ? '' : 's') + ' compute with no runtime error (auto-watched; changes stream to you)' + (vals ? ' \xB7 values: ' + vals + (probe.length > 8 ? ' \u2026(+' + (probe.length - 8) + ' more)' : '') : '');
    };
    const downstreamStatus = async id => {
        const mod = resolveModule(id);
        if (!mod)
            return '';
        const inSeedModule = new Set(varsOf(mod));
        const seeds = varsOf(mod).filter(v => v._name && !isStructural(v));
        if (!seeds.length)
            return '';
        const dependents = [...descendants(...seeds)].filter(v => !inSeedModule.has(v) && v._name && !isStructural(v));
        if (!dependents.length)
            return '';
        await new Promise(r => setTimeout(r, 150));
        const parts = await Promise.all(dependents.slice(0, 12).map(async v => {
            const label = (v._module && v._module._name ? v._module._name + ':' : '') + v._name;
            const r = await readVar(v._module, v);
            return label + '=' + (r.error ? '\u26A0 ' + r.error : r.pending ? '\u23F3 still computing' : summ(r.value));
        }));
        return ' \xB7 downstream recomputed: ' + parts.join(', ') + (dependents.length > 12 ? ' \u2026(+' + (dependents.length - 12) + ' more)' : '');
    };
    let cmModPromise = null;
    const getCmMod = () => {
        if (!cmModPromise)
            cmModPromise = (async () => {
                const mod = await import('/@tomlarkworthy/code-metrics.js?v=4');
                return runtime.module(mod.default);
            })().catch(e => {
                cmModPromise = null;
                throw e;
            });
        return cmModPromise;
    };
    const metricsFor = async id => {
        let mod = resolveModule(id);
        if (!mod) {
            const owner = [...runtime._variables].find(v => v._module && v._module._name === id);
            mod = owner && owner._module;
        }
        if (!mod)
            return null;
        const cells = varsOf(mod).filter(v => v._name && typeof v._definition === 'function' && !v._name.startsWith('module ')).map(v => ({
            variable: v,
            module: id,
            name: v._name
        }));
        if (!cells.length)
            return null;
        const cm = await getCmMod();
        cm.redefine('allCells', [], () => cells);
        return await cm.value('metricsRows');
    };
    const structureStatus = async id => {
        let rows;
        try {
            rows = await metricsFor(id);
        } catch (e) {
            return '';
        }
        if (!rows || !rows.length)
            return '';
        const worst = rows[0];
        const low = rows.filter(r => r.mi < 65);
        const head = ' \xB7 metrics: ' + rows.length + ' cell' + (rows.length === 1 ? '' : 's') + ', worst ' + worst.name + ' MI=' + worst.mi + ' (loc ' + worst.loc + ', cc ' + worst.cyclomatic + ')';
        if (!low.length)
            return head + ' \xB7 all cells MI\u226565 \u2713 (well-decomposed)';
        return head + ' \xB7 \u26A0 ' + low.length + ' cell' + (low.length === 1 ? '' : 's') + ' below MI 65 (' + low.slice(0, 4).map(r => r.name + ' ' + r.mi).join(', ') + ') \u2014 SPLIT each low-MI cell into smaller ' + 'named per-concern cells (one panel/view/derivation each); do NOT consolidate cells into one big one ' + '(task-required/contractual cell names must stay: split helpers OUT of them, never rename them)';
    };
    const moduleExists = id => {
        try {
            const cm = currentModules && (typeof currentModules.values === 'function' ? currentModules : currentModules.value);
            return !!(cm && typeof cm.values === 'function' && [...cm.values()].some(e => e && e.name === id));
        } catch (e) {
            return false;
        }
    };
    const surfaceInView = id => {
        try {
            if (typeof location === 'undefined')
                return false;
            let h = (location.hash || '').replace(/^#/, '');
            const intent = 'open=' + id;
            h = /(^|&)open=/.test(h) ? h.replace(/(^|&)open=[^&]*/, '$1' + intent) : h + (h ? '&' : '') + intent;
            if ('#' + h === location.hash)
                return false;
            navigate('#' + h);
            return true;
        } catch (e) {
            return false;
        }
    };
    const applyModuleSrc = async (id, src) => {
        const keepDraft = () => {
            const prev = rc5_store.srcFns.get(id);
            const holder = prev || function pendingDefine() {
            };
            holder.src = src;
            rc5_store.srcFns.set(id, holder);
        };
        if (!/export\s+default/.test(src)) {
            keepDraft();
            return {
                ok: false,
                msg: 'written, but not an importable module (no `export default`) \u2014 not applied'
            };
        }
        const wasNew = !moduleExists(id);
        const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        try {
            const mod = await import(url);
            if (typeof mod.default !== 'function') {
                keepDraft();
                return {
                    ok: false,
                    msg: 'written, but no default export define() \u2014 not applied'
                };
            }
            const r = apply(id, mod.default);
            if (!r.applied) {
                keepDraft();
                return {
                    ok: false,
                    msg: 'written, but not applied: ' + (r.reason || 'unknown')
                };
            }
            mod.default.src = src;
            rc5_store.srcFns.set(id, mod.default);
            const n = r.changes || 0;
            const surfaced = wasNew && /\bviewof\s|\bmd`|\bhtml`/.test(src) && surfaceInView(id);
            let status = '';
            try {
                status = probeStatus(await probeAndWatch(id));
            } catch (e) {
            }
            let downstream = '';
            try {
                downstream = await downstreamStatus(id);
            } catch (e) {
            }
            let structure = '';
            try {
                structure = await structureStatus(id);
            } catch (e) {
            }
            let spec = '';
            try {
                spec = await specLib.specStatus();
            } catch (e) {
            }
            return {
                ok: true,
                msg: 'applied live (' + n + ' cell' + (n === 1 ? '' : 's') + ' changed)' + (surfaced ? ' \xB7 opened in the shared view so the human can see it' : '') + status + downstream + structure + spec
            };
        } catch (e) {
            keepDraft();
            return {
                ok: false,
                msg: 'written, but FAILED TO COMPILE: ' + (e && e.message || e) + ' \u2014 live runtime unchanged; fix and re-edit'
            };
        } finally {
            URL.revokeObjectURL(url);
        }
    };
    return {
        applyModuleSrc,
        probeAndWatch,
        probeStatus,
        structureStatus,
        moduleExists
    };
};
const _ual70b = function _valueTools(cellHelpers,observe,summarizeJS,defineTool,rc5_watchBus)
{
  const {resolveModule, varsOf, isStructural, label, oneLine, watchKey} = cellHelpers;
  const nudge = mod => {
    const s = varsOf(mod).find(x => x._name && !isStructural(x));
    if (s) {
      try {
        mod.value(s._name).catch(() => {
        });
      } catch (e) {
      }
    }
  };
  const readVar = (mod, v) => new Promise(resolve => {
    let done = false, invalidate;
    const inv = new Promise(r => {
      invalidate = r;
    });
    const finish = res => {
      if (done)
        return;
      done = true;
      try {
        invalidate();
      } catch (e) {
      }
      resolve(res);
    };
    if (v._error != null)
      return finish({ error: v._error && v._error.message || String(v._error) });
    if (v._value !== undefined)
      return finish({ value: v._value });
    if (v._name) {
      Promise.resolve().then(() => mod.value(v._name)).then(value => finish({ value }), error => finish({ error: error && error.message || String(error) }));
    } else {
      try {
        observe(v, {
          fulfilled: value => finish({ value }),
          rejected: error => finish({ error: error && error.message || String(error) }),
          pending: () => {
          }
        }, { invalidation: inv });
        nudge(mod);
      } catch (e) {
        return finish({ error: 'observe failed: ' + (e && e.message || e) });
      }
    }
    setTimeout(() => finish({ error: 'timed out after 5s' }), 5000);
  });
  const summary = (value, max) => {
    if (typeof value === 'string') {
      const lim = max || 2000;
      return value.length > lim ? value.slice(0, lim) + ' \u2026(+' + (value.length - lim) + ' chars)' : value;
    }
    try {
      return summarizeJS(value, { max_size: max });
    } catch (e) {
      return String(value);
    }
  };
  const AsyncFunction = (async () => {
  }).constructor;
  const GLOBALS = new Set([
    'window',
    'document',
    'globalThis',
    'console',
    'Math',
    'JSON',
    'Object',
    'Array',
    'Promise',
    'Response',
    'Blob',
    'Uint8Array',
    'TextDecoder',
    'TextEncoder',
    'DecompressionStream',
    'CompressionStream',
    'fetch',
    'URL',
    'atob',
    'btoa',
    'Date',
    'Map',
    'Set',
    'RegExp',
    'Error'
  ]);
  const esc = n => String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const evalInModule = (mod, code, timeoutMs = 8000) => new Promise(resolve => {
    const names = new Set();
    // A `viewof x` cell's element is bound to the natural identifier `viewof_x`, so
    // `viewof_x.value = 30; viewof_x.dispatchEvent(new Event('input'))` drives the live control.
    const aliases = [];
    for (const v of varsOf(mod)) {
      if (!v._name)
        continue;
      if (/^[A-Za-z_$][\w$]*$/.test(v._name) && !GLOBALS.has(v._name))
        names.add(v._name);
      const mv = /^viewof\s+([A-Za-z_$][\w$]*)$/.exec(v._name);
      if (mv)
        aliases.push({
          alias: 'viewof_' + mv[1],
          dep: v._name
        });
    }
    [
      'FileAttachment',
      'md',
      'html',
      'Inputs',
      'Plot',
      'd3',
      'Generators'
    ].forEach(n => names.add(n));
    const refs = n => new RegExp('\\b' + esc(n) + '\\b').test(code);
    const inputs = [...names].filter(refs);
    const usedViews = aliases.filter(x => !names.has(x.alias) && refs(x.alias));
    const t = code.trim();
    const isExpr = t && !/[;\n]/.test(t) && !/^\s*(return|const|let|var|throw|if|for|while|async|function|\{|await)\b/.test(t);
    const params = [
      ...inputs,
      ...usedViews.map(x => x.alias)
    ];
    const deps = [
      ...inputs,
      ...usedViews.map(x => x.dep)
    ];
    let fn;
    try {
      fn = new AsyncFunction(...params, isExpr ? 'return (' + t + ');' : code);
    } catch (e) {
      return resolve({ error: 'syntax error: ' + (e && e.message || e) });
    }
    let done = false, v;
    const finish = r => {
      if (done)
        return;
      done = true;
      try {
        v && v.delete();
      } catch (e) {
      }
      resolve(r);
    };
    try {
      v = mod.variable({
        fulfilled: val => finish({ value: val }),
        rejected: err => finish({ error: err && err.message || String(err) }),
        pending: () => {
        }
      });
      v.define(null, deps, fn);
    } catch (e) {
      return finish({ error: 'define failed: ' + (e && e.message || e) });
    }
    setTimeout(() => finish({ error: 'timed out after ' + timeoutMs / 1000 + 's' }), timeoutMs);
  });
  const inspect_value = defineTool({
    id: 'inspect_value',
    description: 'Inspect the LIVE computed value of a cell in the running notebook (NOT its source). Returns a readable ' + 'summary of what the cell currently evaluates to, or its runtime error if it is failing. Identify the ' + 'cell by `pid` (the _pid in the source, e.g. "_1noor04" \u2014 works for ANY cell, including anonymous ones) ' + 'or by `name`. Note a `viewof x` cell has two variables: name "viewof x" (the input element) and "x" ' + '(its value); `mutable y` exposes "y". Read source with read_file; read values with this.',
    parameters: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module id, e.g. "@user/stats" or "@tomlarkworthy/exporter-3".'
        },
        pid: {
          type: 'string',
          description: 'The cell pid (the _pid in the source). Preferred; required for anonymous cells.'
        },
        name: {
          type: 'string',
          description: 'A variable name (e.g. "total", "viewof knob", "x"). Use when the cell has one.'
        }
      },
      required: ['module'],
      additionalProperties: false
    },
    execute: async ({module, pid, name}) => {
      const mod = resolveModule(module);
      if (!mod)
        return {
          title: 'inspect_value',
          output: 'Module not found: ' + module + ' (try list_values or glob /src/**/*.js).'
        };
      if (!pid && !name)
        return {
          title: 'inspect_value',
          output: 'Give a pid or a name. Run list_values ' + module + ' to see the cells.'
        };
      const vs = varsOf(mod);
      const v = pid ? vs.find(x => x.pid === pid) : vs.find(x => x._name === name);
      if (!v)
        return {
          title: 'inspect_value',
          output: (pid ? 'No cell with pid ' + pid : 'No variable named ' + name) + ' in ' + module + '. Run list_values ' + module + '.'
        };
      const r = await readVar(mod, v);
      const tag = module + ':' + (name || pid);
      if (r.error)
        return {
          title: 'inspect ' + tag,
          output: '\u26A0 runtime error: ' + r.error,
          metadata: { error: true }
        };
      return {
        title: 'inspect ' + tag,
        output: summary(r.value, 4000)
      };
    }
  });
  const list_values = defineTool({
    id: 'list_values',
    description: 'List EVERY cell in a module \u2014 including anonymous (unnamed) cells \u2014 with its pid, name (if any) and a ' + 'one-line summary of its LIVE value (or runtime error). Use to survey a module, then drill in with ' + 'inspect_value by pid.',
    parameters: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module id to survey.'
        }
      },
      required: ['module'],
      additionalProperties: false
    },
    execute: async ({module}) => {
      const mod = resolveModule(module);
      if (!mod)
        return {
          title: 'list_values',
          output: 'Module not found: ' + module
        };
      const vars = varsOf(mod).filter(v => !isStructural(v));
      if (!vars.length)
        return {
          title: 'list_values ' + module,
          output: '(no cells)'
        };
      const shown = vars.slice(0, 40);
      const lines = await Promise.all(shown.map(async v => {
        const r = await readVar(mod, v);
        const s = r.error ? '\u26A0 ' + r.error : summary(r.value, 120);
        return label(v) + ' = ' + String(s).replace(/\s+/g, ' ').trim().slice(0, 120);
      }));
      if (vars.length > 40)
        lines.push('\u2026 ' + (vars.length - 40) + ' more');
      return {
        title: 'list_values ' + module + ' (' + vars.length + ')',
        output: lines.join('\n')
      };
    }
  });
  const eval_js = defineTool({
    id: 'eval_js',
    description: 'Run a snippet of native JavaScript in the browser, scoped to a module. The module\'s builtins ' + '(md, html, Inputs, Plot, d3, Generators, and crucially FileAttachment) and its named cells are in ' + 'scope by name \u2014 a `viewof x` cell\'s live element is in scope as `viewof_x`, so you can DRIVE a ' + 'control without editing it: `viewof_x.value = 30; viewof_x.dispatchEvent(new Event("input"))`. ' + 'Page globals (window, document, DecompressionStream, \u2026) are available too. A bare ' + 'expression is returned automatically; multi-statement code needs an explicit `return`; top-level await ' + 'works. Use this for computed transforms \u2014 above all, to DECODE a bundled file attachment: ' + 'scope to the module that owns it and do `new Response((await FileAttachment("name.gz").stream())' + '.pipeThrough(new DecompressionStream("gzip"))).text()`. An attachment at /content/@user/mod/name belongs ' + 'to module "@user/mod" with FileAttachment name "name". Also good for computing over live cell values.',
    parameters: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module id to scope to, e.g. "@tomlarkworthy/robocoop-5-engine". Sets which FileAttachment/cells are in scope.'
        },
        code: {
          type: 'string',
          description: 'JavaScript. Bare expression is auto-returned; multi-statement needs `return`; await allowed.'
        }
      },
      required: [
        'module',
        'code'
      ],
      additionalProperties: false
    },
    execute: async ({module, code}) => {
      const mod = resolveModule(module);
      if (!mod)
        return {
          title: 'eval_js',
          output: 'Module not found: ' + module + ' (try glob /src/**/*.js).'
        };
      const r = await evalInModule(mod, code);
      if (r.error)
        return {
          title: 'eval_js ' + module,
          output: '\u26A0 ' + r.error,
          metadata: { error: true }
        };
      return {
        title: 'eval_js ' + module,
        output: summary(r.value, 6000)
      };
    }
  });
  const watch_variable = defineTool({
    id: 'watch_variable',
    description: 'Watch a cell\'s LIVE value. After this, whenever the cell recomputes to a NEW value, the change is ' + 'streamed to you automatically on your next step \u2014 you do not call inspect_value again. Identify the cell ' + 'by `pid` (works for any cell, incl. anonymous) or `name`. Returns the current value now; later changes ' + 'arrive as "Watch updates". Especially useful after an edit, to see downstream reactive cells update. ' + 'Use unwatch_variable to stop.',
    parameters: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module id, e.g. "@user/stats".'
        },
        pid: {
          type: 'string',
          description: 'The cell pid (preferred; required for anonymous cells).'
        },
        name: {
          type: 'string',
          description: 'A variable name (when the cell has one).'
        }
      },
      required: ['module'],
      additionalProperties: false
    },
    execute: async ({module, pid, name}) => {
      const mod = resolveModule(module);
      if (!mod)
        return {
          title: 'watch_variable',
          output: 'Module not found: ' + module
        };
      if (!pid && !name)
        return {
          title: 'watch_variable',
          output: 'Give a pid or a name (see list_values ' + module + ').'
        };
      const v = varsOf(mod).find(x => pid ? x.pid === pid : x._name === name);
      if (!v)
        return {
          title: 'watch_variable',
          output: (pid ? 'No cell with pid ' + pid : 'No variable named ' + name) + ' in ' + module + '.'
        };
      const id = watchKey(module, pid, name);
      const tag = module + ':' + (name || pid);
      if (rc5_watchBus.has(id))
        return {
          title: 'watch_variable',
          output: 'Already watching ' + tag + '.'
        };
      const base = await readVar(mod, v);
      const baseText = base.error ? '\u26A0 ' + base.error : oneLine(summary(base.value, 400));
      let stop;
      const inv = new Promise(r => {
        stop = r;
      });
      try {
        observe(v, {
          fulfilled: val => rc5_watchBus.record(id, oneLine(summary(val, 400))),
          rejected: err => rc5_watchBus.record(id, '\u26A0 ' + (err && err.message || String(err))),
          pending: () => {
          }
        }, { invalidation: inv });
        nudge(mod);
      } catch (e) {
        return {
          title: 'watch_variable',
          output: 'Could not observe ' + tag + ': ' + (e && e.message || e)
        };
      }
      rc5_watchBus.register(id, tag, stop, baseText);
      return {
        title: 'watch ' + tag,
        output: 'Watching ' + tag + ' \u2014 current value: ' + baseText + '. Changes will stream to you automatically; unwatch_variable to stop.'
      };
    }
  });
  const unwatch_variable = defineTool({
    id: 'unwatch_variable',
    description: 'Stop watching a cell previously passed to watch_variable (same module + pid/name).',
    parameters: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module id.'
        },
        pid: {
          type: 'string',
          description: 'The cell pid used when watching.'
        },
        name: {
          type: 'string',
          description: 'The variable name used when watching.'
        }
      },
      required: ['module'],
      additionalProperties: false
    },
    execute: async ({module, pid, name}) => {
      const tag = module + ':' + (name || pid);
      return {
        title: 'unwatch_variable',
        output: rc5_watchBus.remove(watchKey(module, pid, name)) ? 'Stopped watching ' + tag + '.' : 'Not watching ' + tag + '.'
      };
    }
  });
  return [
    inspect_value,
    list_values,
    eval_js,
    watch_variable,
    unwatch_variable
  ];
};
const _6aumvx = function _fileTools(pathLib,applyLib,defineTool,rc5_store,all_module_files)
{
  const {listPaths, readPath, globToRe} = pathLib;
  const {applyModuleSrc} = applyLib;
  const MODULE_PATH = /^\/(?:notebook|src)\/(.+)\.js$/;
  const read_file = defineTool({
    id: 'read_file',
    description: 'Read a file from the virtual notebook filesystem, returned with line numbers (cat -n style). ' + 'Use offset/limit for large files. Mirrors Claude Code\'s Read. /src/<id>.js is your byte-stable editable ' + 'copy; /notebook/<id>.js is the canonical live form; /content/<id> are the raw blocks/attachments.',
    parameters: {
      type: 'object',
      required: ['file_path'],
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute path, e.g. /src/@user/mod.js or /content/bootconf.json.'
        },
        offset: {
          type: 'number',
          description: '1-based line to start from (optional).'
        },
        limit: {
          type: 'number',
          description: 'Maximum lines to read (optional; default 2000).'
        }
      }
    },
    execute: async ({file_path, offset, limit}) => {
      let text;
      try {
        text = await readPath(file_path);
      } catch (e) {
        return { output: 'ERROR: cannot read ' + file_path + ': ' + (e && e.message || e) };
      }
      if (text == null)
        return { output: 'ERROR: cannot read ' + file_path + ': not found (glob to see what exists)' };
      const lines = text.split('\n');
      const start = Math.max(0, offset ? offset - 1 : 0);
      const end = Math.min(lines.length, start + (limit || 2000));
      const body = lines.slice(start, end).map((l, i) => String(start + i + 1).padStart(6) + '\t' + (l.length > 2000 ? l.slice(0, 2000) + '\u2026 [line truncated]' : l)).join('\n');
      return { output: body || '(empty file)' };
    }
  });
  const write_file = defineTool({
    id: 'write_file',
    description: 'Create or overwrite a file. Mirrors Claude Code\'s Write. Writing a module file under ' + '/src/<id>.js APPLIES it to the live runtime and reports whether it compiled; your file keeps your ' + 'EXACT text (it is never reformatted), so you can keep editing it with edit_file.',
    parameters: {
      type: 'object',
      required: [
        'file_path',
        'content'
      ],
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute path.'
        },
        content: {
          type: 'string',
          description: 'Full file contents.'
        }
      }
    },
    execute: async ({file_path, content}) => {
      const m = MODULE_PATH.exec(file_path);
      if (!m) {
        rc5_store.scratch.set(file_path, String(content ?? ''));
        return { output: 'Wrote ' + file_path };
      }
      const applied = await applyModuleSrc(m[1], String(content ?? ''));
      return { output: 'Wrote ' + file_path + ' \u2014 ' + applied.msg };
    }
  });
  const edit_file = defineTool({
    id: 'edit_file',
    description: 'Replace an exact, literal string in a file. Mirrors Claude Code\'s Edit: old_string must appear ' + 'exactly once (include surrounding context) unless replace_all is true. Editing a module file under ' + '/src/<id>.js APPLIES the result and reports whether it compiled, in this same turn. /src/ files keep your ' + 'exact bytes, so old_string from your last write/edit always matches \u2014 prefer many small edits over rewrites.',
    parameters: {
      type: 'object',
      required: [
        'file_path',
        'old_string',
        'new_string'
      ],
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute path.'
        },
        old_string: {
          type: 'string',
          description: 'Exact text to replace (include enough context to be unique).'
        },
        new_string: {
          type: 'string',
          description: 'Replacement text.'
        },
        replace_all: {
          type: 'boolean',
          description: 'Replace every occurrence (default false).'
        }
      }
    },
    execute: async ({file_path, old_string, new_string, replace_all}) => {
      let text;
      try {
        text = await readPath(file_path);
      } catch (e) {
        return { output: 'ERROR: cannot read ' + file_path + ': ' + (e && e.message || e) };
      }
      if (text == null)
        return { output: 'ERROR: cannot read ' + file_path + ': not found' };
      if (old_string === new_string)
        return { output: 'ERROR: old_string and new_string are identical.' };
      const parts = text.split(old_string);
      const count = parts.length - 1;
      if (count === 0)
        return { output: 'ERROR: old_string not found in ' + file_path + '.' };
      if (count > 1 && !replace_all)
        return { output: 'ERROR: old_string is not unique (' + count + ' matches). Add more surrounding context, or set replace_all:true.' };
      const updated = replace_all ? parts.join(new_string) : parts[0] + new_string + parts.slice(1).join(old_string);
      const n = replace_all ? count : 1;
      const m = MODULE_PATH.exec(file_path);
      if (!m) {
        rc5_store.scratch.set(file_path, updated);
        return { output: 'Edited ' + file_path + ' (' + n + ' replacement' + (n === 1 ? '' : 's') + ')' };
      }
      const applied = await applyModuleSrc(m[1], updated);
      return { output: 'Edited ' + file_path + ' (' + n + ' replacement' + (n === 1 ? '' : 's') + ') \u2014 ' + applied.msg };
    }
  });
  const globTool = defineTool({
    id: 'glob',
    description: 'Find files by glob pattern over the virtual notebook filesystem. \'**\' spans directories. ' + 'Examples: /src/**/*.js (all editable modules), /content/*, **/store.js. Returns matching paths.',
    parameters: {
      type: 'object',
      required: ['pattern'],
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern, e.g. /src/**/*.js'
        }
      }
    },
    execute: async ({pattern}) => {
      let pat = String(pattern || '');
      if (!pat.startsWith('/'))
        pat = '**/' + pat;
      let re;
      try {
        re = globToRe(pat);
      } catch (e) {
        return { output: 'ERROR: bad pattern: ' + (e && e.message || e) };
      }
      const hits = listPaths().filter(p => re.test(p));
      if (!hits.length)
        return { output: '(no files match ' + pattern + ')' };
      const shown = hits.slice(0, 200);
      return { output: shown.join('\n') + (hits.length > shown.length ? '\n[+' + (hits.length - shown.length) + ' more]' : '') };
    }
  });
  const grepTool = defineTool({
    id: 'grep',
    description: 'Search file contents with a JavaScript regex (like grep -rn). Returns file:line: matches. ' + 'Search a directory or one file via `path` (default /), filter filenames with `glob` (e.g. *.js), ' + 'get surrounding lines with `context` (like -C).',
    parameters: {
      type: 'object',
      required: ['pattern'],
      properties: {
        pattern: {
          type: 'string',
          description: 'JavaScript regular expression, e.g. viewof\\s+\\w+'
        },
        path: {
          type: 'string',
          description: 'Directory or file to search (default /).'
        },
        glob: {
          type: 'string',
          description: 'Filename filter, e.g. *.js'
        },
        case_insensitive: {
          type: 'boolean',
          description: 'Case-insensitive match (default false).'
        },
        context: {
          type: 'number',
          description: 'Lines of context around each match (default 0).'
        },
        max_results: {
          type: 'number',
          description: 'Max matching lines (default 100).'
        },
        head_limit: {
          type: 'number',
          description: 'Alias of max_results.'
        }
      }
    },
    execute: async ({pattern, path, glob, case_insensitive, context, max_results, head_limit}) => {
      let re;
      try {
        re = new RegExp(pattern, case_insensitive ? 'i' : '');
      } catch (e) {
        return { output: 'ERROR: bad regex: ' + (e && e.message || e) };
      }
      const base = String(path || '/');
      let files = listPaths().filter(p => p === base || p.startsWith(base.endsWith('/') ? base : base + '/'));
      if (glob) {
        let gre;
        try {
          gre = globToRe(String(glob));
        } catch (e) {
          return { output: 'ERROR: bad glob: ' + (e && e.message || e) };
        }
        const full = String(glob).includes('/');
        files = files.filter(p => gre.test(full ? p : p.slice(p.lastIndexOf('/') + 1)));
      }
      if (!files.length)
        return { output: '(no files to search under ' + base + (glob ? ' matching ' + glob : '') + ')' };
      const cap = Math.max(1, Math.min(500, Number(max_results || head_limit) || 100));
      const C = Math.max(0, Math.min(10, context || 0));
      const out = [];
      let matches = 0;
      for (const f of files) {
        if (matches >= cap)
          break;
        let text;
        try {
          text = await readPath(f);
        } catch (e) {
          continue;
        }
        if (text == null || text.length > 2000000)
          continue;
        // skip unreadable / huge binary-ish blobs
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && matches < cap; i++) {
          if (!re.test(lines[i]))
            continue;
          matches++;
          const s = Math.max(0, i - C), e = Math.min(lines.length - 1, i + C);
          for (let j = s; j <= e; j++)
            out.push(f + ':' + (j + 1) + (j === i ? ':' : '-') + lines[j].slice(0, 250));
          if (C)
            out.push('--');
        }
      }
      if (!matches)
        return { output: '(no matches)' };
      return { output: out.join('\n') + (matches >= cap ? '\n[truncated at ' + cap + ' matches]' : '') };
    }
  });
  // view_image — load an image FileAttachment into your OWN view. Feeds it to the model via
  // ctx.attachImage so a vision model can SEE it on the next step (tool text can't carry images).
  const IMG_MIME = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp'
  };
  const view_image = defineTool({
    id: 'view_image',
    description: 'Load an IMAGE so you can SEE it \u2014 an image FileAttachment (images live under ' + '/content/<module>/<file>; glob /content/** to find them). Pass the image file_path; the image becomes ' + 'visible to you on your NEXT step (describe or act on it then). Needs a vision model.',
    parameters: {
      type: 'object',
      required: ['file_path'],
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute path to an image, e.g. /content/@user/mod/shot.png.'
        }
      }
    },
    execute: async ({file_path}, ctx) => {
      const mime = IMG_MIME[(file_path.split('.').pop() || '').toLowerCase()];
      if (!mime)
        return {
          title: 'view_image',
          output: 'Not a recognized image type (.png/.jpg/.jpeg/.gif/.webp/.svg/.bmp): ' + file_path
        };
      if (!ctx || typeof ctx.attachImage !== 'function')
        return {
          title: 'view_image',
          output: 'Image viewing is unavailable in this context.'
        };
      const m = /^\/content\/(.+)$/.exec(file_path);
      const att = m && all_module_files.find(f => f.module + '/' + f.name === m[1]);
      if (!att)
        return {
          title: 'view_image',
          output: 'No image attachment at ' + file_path + ' (glob /content/** to see attachments).'
        };
      let url;
      try {
        const bytes = await (await fetch(att.url)).blob();
        url = await new Promise((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = () => rej(fr.error);
          fr.readAsDataURL(bytes.type ? bytes : new Blob([bytes], { type: mime }));
        });
      } catch (e) {
        return {
          title: 'view_image',
          output: 'Could not load ' + file_path + ': ' + (e && e.message || e)
        };
      }
      ctx.attachImage(url);
      return {
        title: 'view ' + file_path,
        output: 'Loaded ' + file_path + ' (' + mime + ') \u2014 the image is now visible to you; describe or use it on your next step.'
      };
    }
  });
  return [
    read_file,
    write_file,
    edit_file,
    globTool,
    grepTool,
    view_image
  ];
};
const _qc0bl = function _rc5_host(rc5_store,applyLib,pathLib,exportModuleJS)
{
  const MODULE_PATH = /^\/(?:notebook|src)\/(.+)\.js$/;
  const seedFile = async (path, src) => {
    const m = MODULE_PATH.exec(path);
    if (!m) {
      rc5_store.scratch.set(path, String(src ?? ''));
      return {
        ok: true,
        msg: 'scratch'
      };
    }
    return applyLib.applyModuleSrc(m[1], String(src ?? ''));
  };
  const snapshotFiles = async () => {
    const out = {};
    for (const [p, t] of rc5_store.scratch)
      out[p] = t;
    for (const id of pathLib.moduleIds()) {
      let exported = null;
      try {
        exported = (await exportModuleJS(id)).source;
      } catch (e) {
      }
      const ent = rc5_store.srcFns.get(id);
      const src = ent && typeof ent.src === 'string' ? ent.src : exported;
      if (src != null)
        out['/src/' + id + '.js'] = src;
      if (exported != null)
        out['/notebook/' + id + '.js'] = exported;
    }
    return out;
  };
  return {
    seedFile,
    snapshotFiles
  };
};
const _1nb19yl = function _hostSetup(valueTools,fileTools,registerTool,invalidation,unregisterTool)
{
  const tools = [
    ...valueTools,
    ...fileTools
  ];
  tools.forEach(t => registerTool(t));
  invalidation.then(() => tools.forEach(t => unregisterTool(t.id)));
  return tools.map(t => t.id);
};
const _55ati1 = function _watchTable(html,rc5_watchBus,invalidation)
{
  const wrap = html`<div></div>`;
  const render = () => {
    const list = rc5_watchBus.list();
    if (!list.length) {
      wrap.replaceChildren(html`<div style="font:11px ui-monospace,Menlo,monospace;color:#6e7681">no active watches</div>`);
      return;
    }
    wrap.replaceChildren(html`<table style="font:11px ui-monospace,Menlo,monospace;border-collapse:collapse;width:100%">
      <thead><tr><th style="text-align:left;color:#6e7681;font-weight:400">watch</th><th style="text-align:left;color:#6e7681;font-weight:400">value</th></tr></thead>
      <tbody>${ list.map(w => html`<tr><td style="padding-right:8px;color:#7ee787;white-space:nowrap">${ w.label }</td><td style="color:#c9d1d9">${ String(w.last ?? '').slice(0, 80) }</td></tr>`) }</tbody>
    </table>`);
  };
  render();
  const t = setInterval(render, 1000);
  invalidation.then(() => clearInterval(t));
  return wrap;
};
const _115mvzc = function _11(html,hostSetup,watchTable){return(
html`<div style="font:12px ui-monospace,Menlo,monospace;color:#7ee787;display:flex;flex-direction:column;gap:6px">
    <div>● srctools active — no shell, no fs: /src rides on each module's define function</div>
    <div style="color:#8b949e">tools: ${ hostSetup.join(', ') } · /src = byte-stable editable modules, /notebook = canonical (synthesized), /content = raw blocks + attachments (read direct)</div>
    ${ watchTable }
  </div>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/file-sync", async () => runtime.module((await import("/@tomlarkworthy/file-sync.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-5-core", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-core.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-5-tools", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-tools.js?v=4")).default));  
  main.define("module @tomlarkworthy/summarizejs", async () => runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));  
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  $def("_yyrxg4", null, ["md"], _yyrxg4);  
  $def("_76otvk", "cellHelpers", ["currentModules","runtime"], _76otvk);  
  $def("_19x8b93", "rc5_store", [], _19x8b93);  
  $def("_o37ix1", "pathLib", ["currentModules","runtime","rc5_store","all_module_files","exportModuleJS","importShim"], _o37ix1);  
  $def("_speclib", "specLib", ["cellHelpers","rc5_store","rc5_specGate"], _speclib);
  $def("_190yjiu", "applyLib", ["jbApply","currentModules","runtime","probeDefine","createModule","cellHelpers","summarizeJS","rc5_watchBus","observe","importShim","location","navigate","rc5_store","descendants","specLib"], _190yjiu);
  $def("_ual70b", "valueTools", ["cellHelpers","observe","summarizeJS","defineTool","rc5_watchBus"], _ual70b);  
  $def("_6aumvx", "fileTools", ["pathLib","applyLib","defineTool","rc5_store","all_module_files"], _6aumvx);  
  $def("_qc0bl", "rc5_host", ["rc5_store","applyLib","pathLib","exportModuleJS"], _qc0bl);  
  $def("_1nb19yl", "hostSetup", ["valueTools","fileTools","registerTool","invalidation","unregisterTool"], _1nb19yl);  
  $def("_55ati1", "watchTable", ["html","rc5_watchBus","invalidation"], _55ati1);  
  $def("_115mvzc", null, ["html","hostSetup","watchTable"], _115mvzc);  
  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportModuleJS", _));  
  main.define("probeDefine", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("probeDefine", _));  
  main.define("jbApply", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("jbApply", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("importShim", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("importShim", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));
  main.define("navigate", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("navigate", _));  
  main.define("defineTool", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("defineTool", _));  
  main.define("registerTool", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("registerTool", _));  
  main.define("unregisterTool", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("unregisterTool", _));  
  main.define("rc5_watchBus", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("rc5_watchBus", _));
  main.define("rc5_specGate", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("rc5_specGate", _));
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));  
  main.define("all_module_files", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("all_module_files", _));
  return main;
}