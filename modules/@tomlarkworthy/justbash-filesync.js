const _2e5hhb = function _watchableFs() {
    const MUTATORS = new Set([
        'writeFile',
        'appendFile',
        'mkdir',
        'rm',
        'rmdir',
        'cp',
        'mv',
        'chmod',
        'symlink',
        'link',
        'utimes',
        'truncate'
    ]);
    return function watchableFs(fs) {
        const listeners = new Set();
        const emit = (op, args) => {
            const ev = {
                op,
                path: args[0],
                dest: typeof args[1] === 'string' ? args[1] : undefined
            };
            for (const l of listeners) {
                try {
                    l(ev);
                } catch (e) {
                }
            }
        };
        return new Proxy(fs, {
            get(target, prop) {
                if (prop === 'onChange')
                    return fn => (listeners.add(fn), () => listeners.delete(fn));
                const val = target[prop];
                if (typeof val !== 'function')
                    return val;
                if (!MUTATORS.has(prop))
                    return val.bind(target);
                return function (...args) {
                    const r = val.apply(target, args);
                    Promise.resolve(r).then(() => emit(prop, args), () => {
                    });
                    return r;
                };
            }
        });
    };
};
const _ibogrw = function _fsDirectoryHandle() {
    const notFound = path => {
        const e = new Error(`A requested file or directory could not be found: ${ path }`);
        e.name = 'NotFoundError';
        return e;
    };
    const join = (base, name) => base === '/' ? '/' + name : base + '/' + name;
    function fileHandle(fs, path, name) {
        return {
            kind: 'file',
            name,
            async getFile() {
                const bytes = await fs.readFileBuffer(path);
                let lastModified = 0;
                try {
                    lastModified = (await fs.stat(path)).mtime.getTime();
                } catch (e) {
                }
                return {
                    name,
                    size: bytes.byteLength,
                    lastModified,
                    async text() {
                        return new TextDecoder().decode(bytes);
                    },
                    async arrayBuffer() {
                        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                    }
                };
            },
            async createWritable() {
                const chunks = [];
                return {
                    async write(data) {
                        chunks.push(data);
                    },
                    async close() {
                        if (chunks.length === 1 && typeof chunks[0] === 'string') {
                            await fs.writeFile(path, chunks[0]);
                            return;
                        }
                        const parts = chunks.map(c => typeof c === 'string' ? new TextEncoder().encode(c) : c instanceof ArrayBuffer ? new Uint8Array(c) : c);
                        const total = parts.reduce((n, p) => n + p.length, 0);
                        const buf = new Uint8Array(total);
                        let off = 0;
                        for (const p of parts) {
                            buf.set(p, off);
                            off += p.length;
                        }
                        await fs.writeFile(path, buf);
                    }
                };
            }
        };
    }
    return function fsDirectoryHandle(fs, path = '/', name = '') {
        const handle = {
            kind: 'directory',
            name: name || (path === '/' ? '' : path.split('/').filter(Boolean).pop() || ''),
            async getDirectoryHandle(child, opts = {}) {
                const full = join(path, child);
                if (await fs.exists(full)) {
                    if (!(await fs.stat(full)).isDirectory)
                        throw notFound(full + ' (not a directory)');
                } else if (opts.create) {
                    await fs.mkdir(full, { recursive: true });
                } else
                    throw notFound(full);
                return fsDirectoryHandle(fs, full, child);
            },
            async getFileHandle(child, opts = {}) {
                const full = join(path, child);
                if (!await fs.exists(full)) {
                    if (opts.create)
                        await fs.writeFile(full, '');
                    else
                        throw notFound(full);
                }
                return fileHandle(fs, full, child);
            },
            async removeEntry(child, opts = {}) {
                await fs.rm(join(path, child), {
                    recursive: !!opts.recursive,
                    force: true
                });
            },
            async *entries() {
                let names;
                try {
                    names = await fs.readdir(path);
                } catch (e) {
                    return;
                }
                for (const n of names.sort()) {
                    const full = join(path, n);
                    let st;
                    try {
                        st = await fs.stat(full);
                    } catch (e) {
                        continue;
                    }
                    yield [
                        n,
                        st.isDirectory ? fsDirectoryHandle(fs, full, n) : fileHandle(fs, full, n)
                    ];
                }
            },
            async *keys() {
                for await (const [n] of handle.entries())
                    yield n;
            },
            async *values() {
                for await (const [, h] of handle.entries())
                    yield h;
            },
            [Symbol.asyncIterator]() {
                return handle.entries();
            }
        };
        return handle;
    };
};
const _s03kb1 = function _syncFs(watchableFs,InMemoryFs) {return (watchableFs(new InMemoryFs()));};
const _103wkzy = function _workspaceDirectory(fsDirectoryHandle,syncFs) {return (fsDirectoryHandle(syncFs));};
const _14l9wdw = function _syncShell(createSession,syncFs) {return (createSession(syncFs, {
    cwd: '/',
    label: 'fs'
}));};
const _4i07b0 = function _jbModules(currentModules) {
    const ids = new Set([
        '@tomlarkworthy/just-bash',
        '@tomlarkworthy/justbash-session',
        '@tomlarkworthy/justbash-terminal',
        '@tomlarkworthy/justbash',
        '@tomlarkworthy/justbash-filesync'
    ]);
    const m = new Map();
    for (const [mod, info] of currentModules)
        if (ids.has(info.name))
            m.set(mod, info);
    return m;
};
const _1le7x0 = function _jbModuleIds() {return ([
    '@tomlarkworthy/just-bash',
    '@tomlarkworthy/justbash-session',
    '@tomlarkworthy/justbash-terminal',
    '@tomlarkworthy/justbash',
    '@tomlarkworthy/justbash-filesync'
]);};
const _49b1wn = function _jbRedisassemble(Inputs) {return (Inputs.button('\u27F3 Disassemble modules to virtual fs'));};
const _z8svk5 = (G, _) => G.input(_);
const _pxq7gd = async function _jbDisassemble(jbRedisassemble,notebookId,jbModuleIds,exportModuleJS,writeFile,workspaceDirectory) {
    jbRedisassemble;
    // re-run when the button is pressed
    const prefix = notebookId + '/';
    const written = [];
    for (const id of jbModuleIds) {
        try {
            const {source} = await exportModuleJS(id);
            await writeFile(workspaceDirectory, prefix + id + '.js', source);
            written.push({
                id,
                bytes: source.length
            });
        } catch (e) {
            written.push({
                id,
                error: e.message
            });
        }
    }
    return {
        prefix,
        written,
        at: new Date().toISOString()
    };
};
const _4bge96 = function _jbApply() {
    // Pure factory so any notebook can reuse it over its own runtime/fs. Build with
    // jbApply({ currentModules, runtime, probeDefine, createModule, obj_observer }) -> applyModule(moduleId, defineFn).
    // The file is canonical: applyModule makes the live module MATCH the file — creating/updating user
    // cells, wiring cross-module imports, and DELETING anything live the file no longer contains.
    //
    // Import plumbing is NOT skipped — it is HOW a cross-module import reaches the runtime, so the agent
    // can add imports by editing the file. exportModuleJS emits each import as a pair:
    //   main.define("module @x", () => <child module>)                                  // loader
    //   main.define("name", ["module @x","@variable"], (_,v)=>v.import("remote",_))      // binding
    // The loader's original definition closes over the file's throwaway probe-runtime, so we REBUILD it
    // against the real runtime (resolve the already-loaded child module by id, else importShim its path).
    // The binding references only its inputs, so its definition is reused verbatim.
    //
    // Anonymous cells (name == null: md headers, expression/display cells) are the MAJORITY of a notebook
    // and ARE editable — matched by pid, never skipped.
    let pidSeq = 0;
    const genPid = () => '_jb' + (pidSeq++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    const hasVarInput = (inputs) => (inputs || []).some(iv => (typeof iv === 'string' ? iv : iv && iv._name) === '@variable');
    const importPath = (defn) => { const m = (defn ? defn.toString() : '').match(/import\(\s*["'`]([^"'`]+)["'`]/); return m ? m[1] : null; };
    return function makeApply({ currentModules, runtime, probeDefine, createModule, obj_observer } = {}) {
        const resolveModule = (moduleId) => {
            if (currentModules) for (const [, info] of currentModules) if (info.name === moduleId) return info.module;
            const r = runtime;
            if (r.mains && r.mains.has(moduleId)) return r.mains.get(moduleId);
            if (typeof createModule === 'function') { try { return createModule(moduleId, r); } catch (e) { return null; } }
            return null;
        };
        // Observer factory for newly-created user cells. obj_observer (from runtime-sdk) is the runtime's
        // __ojs_observer builtin (name => observerObject); fall back to the builtin scope. Kept available for
        // F6, but the default below stays {} — see the new-cell branch.
        const obsFactory = (() => {
            if (typeof obj_observer === 'function') return obj_observer;
            try { const f = runtime && runtime._builtin && runtime._builtin._scope.get('__ojs_observer'); return f && typeof f._value === 'function' ? f._value : null; } catch (e) { return null; }
        })();
        return function applyModule(moduleId, defineFn) {
            const mod = resolveModule(moduleId);
            if (!mod)
                return { applied: false, reason: 'module not loaded and cannot create: ' + moduleId };
            const existingByName = new Map();
            const existingByPid = new Map();
            for (const v of runtime._variables) {
                if (v._module !== mod) continue;
                if (v._name) existingByName.set(v._name, v);
                if (v.pid) existingByPid.set(v.pid, v);
            }
            const cells = probeDefine(defineFn);
            const seenPids = new Set();
            const seenNames = new Set();   // import plumbing tracked by name (loaders/bindings carry no pid)
            let changes = 0;
            for (const cell of cells) {
                // injected builtin — the runtime provides it; never (re)define
                if (cell.name === '@variable') continue;

                // explicit module.variable().import(remote, alias, from) form
                if (cell.type === 'import') {
                    const spec = cell.from;
                    const child = spec && resolveModule(spec);
                    if (!child) continue;
                    const loaderName = 'module ' + spec;
                    seenNames.add(loaderName);
                    if (!existingByName.has(loaderName)) { mod.variable(null).define(loaderName, [], () => child); changes++; }
                    const alias = cell.alias || cell.remote;
                    seenNames.add(alias);
                    if (!existingByName.has(alias)) { mod.variable(null).define(alias, [loaderName, '@variable'], (_, vv) => vv.import(cell.remote, _)); changes++; }
                    continue;
                }

                // import-loader plumbing: "module @x" — rebuild against the REAL runtime
                if (cell.name && cell.name.startsWith('module ')) {
                    seenNames.add(cell.name);
                    if (!existingByName.has(cell.name)) {
                        const spec = cell.name.slice('module '.length);
                        const child = resolveModule(spec);
                        if (child) { mod.variable(null).define(cell.name, [], () => child); changes++; }
                        else { const path = importPath(cell.definition); if (path) { mod.variable(null).define(cell.name, [], async () => runtime.module((await window.importShim(path)).default)); changes++; } }
                    }
                    continue;
                }

                // import-binding: inputs include "@variable" — definition is closure-safe, reuse verbatim
                if (hasVarInput(cell.inputs)) {
                    if (cell.name) seenNames.add(cell.name);
                    if (cell.name && !existingByName.has(cell.name)) { mod.variable(null).define(cell.name, cell.inputs, cell.definition); changes++; }
                    continue;
                }

                // ordinary user cell — match by pid; mint one for pid-less hand-written cells so re-applies dedupe
                let pid = cell.pid;
                if (!pid) {
                    const byName = cell.name && existingByName.get(cell.name);
                    pid = (byName && byName.pid) || genPid();
                }
                seenPids.add(pid);
                if (cell.name) seenNames.add(cell.name);
                const existing = existingByPid.get(pid) || (cell.name && existingByName.get(cell.name));
                if (!existing) {
                    // Empty observer ({}) so a pane's visualizer can render the cell; mod.variable(null)
                    // (unobserved) lets the apply-time probe own it → element parented outside any pane → blank.
                    const v = mod.variable({});
                    v.define(cell.name, cell.inputs, cell.definition);
                    v.pid = pid;
                    existingByPid.set(pid, v);
                    if (cell.name) existingByName.set(cell.name, v);
                    changes++;
                    continue;
                }
                const existingInputNames = (existing._inputs || []).map(iv => typeof iv === 'string' ? iv : iv._name);
                const inputsMatch = JSON.stringify(existingInputNames) === JSON.stringify(cell.inputs);
                const defnMatch = existing._definition && existing._definition.toString() === (cell.definition ? cell.definition.toString() : '');
                if (inputsMatch && defnMatch) { if (!existing.pid) existing.pid = pid; continue; }
                existing.define(cell.name, cell.inputs, cell.definition).pid = pid;
                changes++;
            }

            // F4: prune anything the file no longer contains — reload-proof, no cross-call state.
            //   user cells   → pid-bearing vars not seen this apply
            //   import plumbing → "module @x" loaders / "@variable"-wired bindings whose name not seen
            for (const v of [...runtime._variables]) {
                if (v._module !== mod) continue;
                const name = v._name;
                if (name === '@variable') continue;
                if (name && seenNames.has(name)) continue;   // present in file (user cell or import binding/loader) → keep, even if it acquired a pid via persistentId
                // removed import plumbing ("module @x" loader, or a "@variable"-wired binding)
                if ((name && name.startsWith('module ')) || hasVarInput(v._inputs)) { if (name) { v.delete(); changes++; } continue; }
                if (!v.pid || seenPids.has(v.pid)) continue; // keep pid-less and still-present user cells
                v.delete();                                  // orphaned user cell (removed / renamed)
                changes++;
            }
            return { applied: true, moduleId, changes };
        };
    };
};
const _1y75ecn = async function _jbFilesToNotebook(jbDisassemble, notebookId, htl, jbModuleIds, readFile, workspaceDirectory, invalidation, exportModuleJS, jbApply, currentModules, runtime, probeDefine, createModule) {
    jbDisassemble;
    const apply = jbApply({ currentModules, runtime, probeDefine, createModule });
    const prefix = notebookId + '/';
    const statusEl = htl.html`<pre style="background:#0b1020;color:#9fe7ff;padding:8px;border-radius:6px;font-size:12px;line-height:1.5;white-space:pre-wrap;margin:0;min-height:1.5em"></pre>`;
    const lastSeen = new Map();
    for (const id of jbModuleIds) {
        try {
            const f = await readFile(workspaceDirectory, prefix + id + '.js');
            lastSeen.set(id, f.lastModified);
        } catch (e) {
        }
    }
    const applied = [];
    const render = () => {
        statusEl.textContent = applied.length ? applied.join('\n') : '\u25B6 watching ' + jbModuleIds.length + ' modules for edits\u2026 (none yet)';
    };
    const log = m => {
        applied.unshift(m);
        if (applied.length > 8)
            applied.pop();
        render();
    };
    render();
    let stopped = false;
    invalidation.then(() => {
        stopped = true;
    });
    (async () => {
        while (!stopped) {
            for (const id of jbModuleIds) {
                let f;
                try {
                    f = await readFile(workspaceDirectory, prefix + id + '.js');
                } catch (e) {
                    continue;
                }
                const prev = lastSeen.get(id);
                if (prev !== undefined && f.lastModified === prev)
                    continue;
                lastSeen.set(id, f.lastModified);
                const diskText = await f.text();
                try {
                    const cur = await exportModuleJS(id);
                    if (cur.source === diskText)
                        continue;
                } catch (e) {
                }
                const url = URL.createObjectURL(new Blob([diskText], { type: 'text/javascript' }));
                try {
                    const m = await window.importShim(url, 'file://@tomlarkworthy/justbash-filesync');
                    if (typeof m.default === 'function') {
                        const r = apply(id, m.default);
                        log(new Date().toLocaleTimeString() + '  \u2935 ' + id.split('/').pop() + ' (' + (r.changes || 0) + ' cell' + (r.changes === 1 ? '' : 's') + ')');
                    }
                } catch (e) {
                    log('\u26A0 ' + id.split('/').pop() + ': ' + e.message);
                } finally {
                    URL.revokeObjectURL(url);
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    })();
    return statusEl;
};
const _1vqbn7l = function _jbTerminalView(terminal,syncShell) {return (terminal(syncShell, { greeting: 'shared fs \u2014 try: ls @tomlarkworthy_justbash/@tomlarkworthy' }));};
const _qi9vsg = function _jbFileSyncApp(htl,jbModuleIds,jbDisassemble,$0,jbFilesToNotebook,jbTerminalView) {return (htl.html`<div style="font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:10px;padding:14px;height:100%;box-sizing:border-box;overflow:auto">
  <div style="font-weight:600;font-size:15px">justbash ⇄ filesystem sync</div>
  <div style="font-size:13px;color:#555;line-height:1.45">
    The notebook's own ${ jbModuleIds.length } modules are disassembled into the shared just-bash virtual filesystem under
    <code>${ jbDisassemble.prefix }</code>. Edit a <code>.js</code> module file in the shell below and the change is applied to the live runtime — the notebook rewrites itself.
  </div>
  <div>${ $0 }</div>
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#888">live apply log</div>
  ${ jbFilesToNotebook }
  <div style="flex:1;min-height:240px;display:flex;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden">${ jbTerminalView }</div>
</div>`);};

const _3hostsync = function _jbFileSync(fsDirectoryHandle, readFile, writeFile, exportModuleJS, probeDefine, jbApply, htl) {
    // Generalised realtime notebook<->fs sync engine, reusable over ANY just-bash fs and module set.
    //   jbFileSync({ fs, currentModules, runtime, createModule, notebookId, pollMs, invalidation }) -> statusEl
    // On mount: disassemble every syncable live module to <notebookId>/<id>.js (exportModuleJS, the
    // canonical exporter serialization). Then a poll loop: any .js whose mtime changed (an agent edit, or
    // a brand-new module file) is importShim'd, decompiled (probeDefine) and diffed onto the live runtime
    // (jbApply — creates the module if new), then re-projected so disk == live (idempotent). No bespoke
    // format, no host_apply tool: write a module file with bash and it applies within pollMs.
    const VENDOR = /golden-layout|codemirror|acorn|escodegen|jszip|lightning-fs|isomorphic-git|jest-expect|inspector|observable-runtime|observablehq-lezer|spectral-layout/;
    return function jbFileSync({ fs, currentModules, runtime, createModule, notebookId = 'notebook', pollMs = 600, invalidation } = {}) {
        const dir = fsDirectoryHandle(fs);
        const prefix = String(notebookId).replace(/^\/+|\/+$/g, '') + '/';
        const apply = jbApply({ currentModules, runtime, probeDefine, createModule });
        const syncableIds = () => {
            const out = [];
            for (const [, info] of currentModules) {
                const id = info && info.name;
                if (!id || id === 'builtin' || id === 'bootloader' || !id.includes('/') || id.startsWith('d/') || VENDOR.test(id)) continue;
                out.push(id);
            }
            return out;
        };
        const allFileIds = () => {
            const ids = new Set(syncableIds());
            try {
                const paths = typeof fs.getAllPaths === 'function' ? fs.getAllPaths() : [];
                for (const p of paths) if (p.startsWith('/' + prefix) && p.endsWith('.js')) ids.add(p.slice(('/' + prefix).length, -3));
            } catch (e) {}
            return ids;
        };
        const statusEl = htl.html`<pre style="background:#0b1020;color:#9fe7ff;padding:8px;border-radius:6px;font-size:12px;line-height:1.5;white-space:pre-wrap;margin:0;min-height:1.5em"></pre>`;
        const lines = [];
        const log = (m) => { lines.unshift(m); if (lines.length > 8) lines.pop(); statusEl.textContent = lines.join('\n'); };
        const lastSeen = new Map();
        const project = async (id) => { const { source } = await exportModuleJS(id); await writeFile(dir, prefix + id + '.js', source); try { const f = await readFile(dir, prefix + id + '.js'); lastSeen.set(id, f.lastModified); } catch (e) {} };
        let stopped = false;
        if (invalidation) invalidation.then(() => { stopped = true; });
        (async () => {
            for (const id of syncableIds()) { try { await project(id); } catch (e) {} }
            log('▶ realtime sync active on ' + prefix + '*.js');
            while (!stopped) {
                for (const id of allFileIds()) {
                    let f;
                    try { f = await readFile(dir, prefix + id + '.js'); } catch (e) { continue; }
                    const prev = lastSeen.get(id);
                    if (prev !== undefined && f.lastModified === prev) continue;
                    lastSeen.set(id, f.lastModified);
                    const diskText = await f.text();
                    // Only apply real module files; skip fixtures / bare-cell seeds (not importable).
                    if (!/export\s+default/.test(diskText)) continue;
                    try { const cur = await exportModuleJS(id); if (cur.source === diskText) continue; } catch (e) {}
                    if (!window.importShim) { log('⚠ importShim missing'); continue; }
                    const url = URL.createObjectURL(new Blob([diskText], { type: 'text/javascript' }));
                    try {
                        const m = await window.importShim(url, 'file://@tomlarkworthy/justbash-filesync');
                        if (typeof m.default !== 'function') { log('⚠ ' + id + ': no default export define()'); continue; }
                        const r = apply(id, m.default);
                        log(new Date().toLocaleTimeString() + ' ⤵ ' + id + ' (' + (r.changes || 0) + (r.applied ? '' : ' — ' + r.reason) + ')');
                        // Re-project (disk == canonical) ONLY when a change actually landed. Re-projecting
                        // after a 0-change apply would overwrite the agent's edited file with the unchanged
                        // live source — silent data loss. If the file differs but nothing applied, leave it.
                        if (r.applied && r.changes > 0) { try { await project(id); } catch (e) {} }
                        else if (r.applied && r.changes === 0) { log('  ⚠ ' + id + ': file differs but 0 cells applied — left as-is'); }
                    } catch (e) { log('⚠ ' + id + ': ' + (e && e.message || e)); }
                    finally { URL.revokeObjectURL(url); }
                }
                await new Promise(r => setTimeout(r, pollMs));
            }
        })();
        return statusEl;
    };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_2e5hhb", "watchableFs", [], _2e5hhb);  
  $def("_ibogrw", "fsDirectoryHandle", [], _ibogrw);  
  main.define("module @tomlarkworthy/just-bash", async () => runtime.module((await import("/@tomlarkworthy/just-bash.js?v=4")).default));  
  main.define("InMemoryFs", ["module @tomlarkworthy/just-bash", "@variable"], (_, v) => v.import("InMemoryFs", _));  
  main.define("module @tomlarkworthy/justbash-session", async () => runtime.module((await import("/@tomlarkworthy/justbash-session.js?v=4")).default));  
  main.define("createSession", ["module @tomlarkworthy/justbash-session", "@variable"], (_, v) => v.import("createSession", _));  
  main.define("module @tomlarkworthy/justbash-terminal", async () => runtime.module((await import("/@tomlarkworthy/justbash-terminal.js?v=4")).default));  
  main.define("terminal", ["module @tomlarkworthy/justbash-terminal", "@variable"], (_, v) => v.import("terminal", _));  
  $def("_s03kb1", "syncFs", ["watchableFs","InMemoryFs"], _s03kb1);  
  $def("_103wkzy", "workspaceDirectory", ["fsDirectoryHandle","syncFs"], _103wkzy);  
  $def("_14l9wdw", "syncShell", ["createSession","syncFs"], _14l9wdw);  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  $def("_4i07b0", "jbModules", ["currentModules"], _4i07b0);  
  main.define("notebookId", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("notebookId", _));  
  main.define("module @tomlarkworthy/file-sync", async () => runtime.module((await import("/@tomlarkworthy/file-sync.js?v=4")).default));  
  main.define("writeFile", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("writeFile", _));  
  main.define("readFile", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("readFile", _));  
  main.define("probeDefine", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("probeDefine", _));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportModuleJS", _));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("tag", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("tag", _));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  $def("_1le7x0", "jbModuleIds", [], _1le7x0);  
  $def("_49b1wn", "viewof jbRedisassemble", ["Inputs"], _49b1wn);  
  $def("_z8svk5", "jbRedisassemble", ["Generators","viewof jbRedisassemble"], _z8svk5);  
  $def("_pxq7gd", "jbDisassemble", ["jbRedisassemble","notebookId","jbModuleIds","exportModuleJS","writeFile","workspaceDirectory"], _pxq7gd);  
  $def("_4bge96", "jbApply", [], _4bge96);
  $def("_3hostsync", "jbFileSync", ["fsDirectoryHandle","readFile","writeFile","exportModuleJS","probeDefine","jbApply","htl"], _3hostsync);
  $def("_1y75ecn", "jbFilesToNotebook", ["jbDisassemble","notebookId","htl","jbModuleIds","readFile","workspaceDirectory","invalidation","exportModuleJS","jbApply","currentModules","runtime","probeDefine","createModule"], _1y75ecn);
  $def("_1vqbn7l", "jbTerminalView", ["terminal","syncShell"], _1vqbn7l);  
  $def("_qi9vsg", "jbFileSyncApp", ["htl","jbModuleIds","jbDisassemble","viewof jbRedisassemble","jbFilesToNotebook","jbTerminalView"], _qi9vsg);
  return main;
}