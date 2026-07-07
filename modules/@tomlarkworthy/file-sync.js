const _1th1rci = function _1(md){return(
md`# File Sync

Two-way sync between the Observable runtime and module \`.js\` files on disk.`
)};
const _1t1i3ml = function _directory(notebookId,htl,hashParam,location,history)
{
    const IDB_NAME = 'lopecode-file-sync';
    const STORE = 'handles';
    const key = notebookId;
    const openDB = () => new Promise((resolve, reject) => {
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    const idbGet = async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
    };
    const idbPut = async handle => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(handle, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    };
    const idbDelete = async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    };
    const container = htl.html`<div>
    <button class="main" style="padding: 8px 16px; font-size: 14px; cursor: pointer;">Loading\u2026</button>
    <button class="forget" style="padding: 4px 8px; font-size: 12px; cursor: pointer; margin-left: 4px; display: none;">Forget</button>
  </div>`;
    const btn = container.querySelector('.main');
    const forget = container.querySelector('.forget');
    container.value = null;
    const emit = () => container.dispatchEvent(new window.Event('input', { bubbles: true }));
    const pickLabel = () => hashParam ? 'Pick directory for: ' + hashParam : 'Pick sync directory';
    const setSyncing = handle => {
        container.value = handle;
        btn.textContent = '\u25CF Syncing: ' + handle.name;
        btn.style.background = '#d4edda';
        btn.onclick = null;
        forget.style.display = '';
        if (!hashParam) {
            const param = 'filesync=' + encodeURIComponent(handle.name);
            const h = location.hash;
            history.replaceState(null, '', h ? h + '&' + param : '#' + param);
        }
        emit();
    };
    const setPickMode = () => {
        container.value = null;
        btn.textContent = pickLabel();
        btn.style.background = '';
        btn.onclick = pickNew;
        forget.style.display = 'none';
        emit();
    };
    const setReconnectMode = handle => {
        btn.textContent = '\u21BB Reconnect: ' + handle.name;
        btn.style.background = '#fff3cd';
        forget.style.display = '';
        btn.onclick = async () => {
            try {
                const result = await handle.requestPermission({ mode: 'readwrite' });
                if (result === 'granted')
                    setSyncing(handle);
                else
                    setPickMode();
            } catch (e) {
                setPickMode();
            }
        };
    };
    async function pickNew() {
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await idbPut(handle).catch(() => {
            });
            setSyncing(handle);
        } catch (e) {
            if (e.name !== 'AbortError')
                throw e;
        }
    }
    forget.onclick = async () => {
        await idbDelete().catch(() => {
        });
        setPickMode();
    };
    (async () => {
        const saved = await idbGet().catch(() => null);
        if (saved) {
            const perm = await saved.queryPermission({ mode: 'readwrite' }).catch(() => 'denied');
            if (perm === 'granted')
                setSyncing(saved);
            else
                setReconnectMode(saved);
        } else {
            setPickMode();
        }
    })();
    return container;
};
const _jnt0bt = (G, _) => G.input(_);
const _yqx7l8 = function _syncEnabled(notebookId,htl)
{
    const KEY = 'lopecode-file-sync:syncEnabled:' + notebookId;
    const initial = window.localStorage.getItem(KEY) === '1';
    const container = htl.html`<label style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;font-size:13px;cursor:pointer;"><input type="checkbox"> Sync enabled</label>`;
    const cb = container.querySelector('input');
    cb.checked = initial;
    container.value = initial;
    cb.onchange = () => {
        container.value = cb.checked;
        window.localStorage.setItem(KEY, cb.checked ? '1' : '0');
        container.dispatchEvent(new window.Event('input', { bubbles: true }));
    };
    return container;
};
const _xltqf6 = (G, _) => G.input(_);
const _1mb10vh = function _disassemble(htl, directory, notebookId, manifestWriter, readFile, writeFile, syncableModules, exportModuleJS, hashSource, currentModules, runtime, probeDefine, tag, importShim, $0) {
    const container = htl.html`<div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button class="disassemble" style="padding: 8px 16px; font-size: 14px; cursor: pointer;" disabled>Disassemble to disk</button>
      <button class="sync" style="padding: 8px 16px; font-size: 14px; cursor: pointer;" disabled>Sync from disk</button>
    </div>
    <pre style="font-size: 12px; max-height: 300px; overflow-y: auto; margin-top: 8px;"></pre>
  </div>`;
    const disBtn = container.querySelector('.disassemble');
    const syncBtn = container.querySelector('.sync');
    const status = container.querySelector('pre');
    if (directory) {
        disBtn.disabled = false;
        syncBtn.disabled = false;
    }
    const log = msg => {
        status.textContent += msg + '\n';
        status.scrollTop = status.scrollHeight;
    };
    const prefix = notebookId + '/';
    disBtn.onclick = async () => {
        if (!directory)
            return;
        disBtn.disabled = true;
        syncBtn.disabled = true;
        disBtn.textContent = 'Disassembling...';
        let ok = 0, fail = 0;
        const manifestUpdates = {};
        await manifestWriter(directory, prefix, null, readFile, writeFile);
        log('cleared manifest');
        for (const moduleId of syncableModules) {
            try {
                log('Exporting ' + moduleId + '...');
                const result = await exportModuleJS(moduleId);
                const path = prefix + moduleId + '.js';
                await writeFile(directory, path, result.source);
                manifestUpdates[moduleId] = hashSource(result.source);
                log('  wrote ' + path + ' (' + result.source.length + ' bytes)');
                if (result.fileAttachments && result.fileAttachments.size) {
                    for (const [name, entry] of result.fileAttachments) {
                        try {
                            const resp = await fetch(entry.url);
                            const bytes = await resp.arrayBuffer();
                            await writeFile(directory, prefix + moduleId + '/' + name, new Uint8Array(bytes));
                            log('  attachment: ' + moduleId + '/' + name + ' (' + bytes.byteLength + ' bytes)');
                        } catch (e) {
                            log('  attachment FAILED: ' + name + ' - ' + e.message);
                        }
                    }
                }
                ok++;
            } catch (e) {
                log('  FAILED: ' + moduleId + ' - ' + e.message);
                fail++;
            }
        }
        try {
            await manifestWriter(directory, prefix, manifestUpdates, readFile, writeFile);
            log('wrote manifest (' + Object.keys(manifestUpdates).length + ' modules)');
        } catch (e) {
            log('manifest write FAILED: ' + e.message);
        }
        try {
            const bootconf = document.querySelector('script[id="bootconf.json"]');
            if (bootconf) {
                await writeFile(directory, prefix + 'bootconf.json', bootconf.textContent.trim());
                log('wrote ' + prefix + 'bootconf.json');
            }
        } catch (e) {
            log('bootconf.json FAILED: ' + e.message);
        }
        log('\nDone: ' + ok + ' modules exported, ' + fail + ' failed');
        disBtn.textContent = 'Disassembled ' + ok + ' modules';
        disBtn.disabled = false;
        syncBtn.disabled = false;
    };
    syncBtn.onclick = async () => {
        if (!directory)
            return;
        disBtn.disabled = true;
        syncBtn.disabled = true;
        syncBtn.textContent = 'Syncing from disk...';
        status.textContent = '';
        const nameToModule = new window.Map();
        const nameToVars = new window.Map();
        for (const [mod, info] of currentModules) {
            if (info.name === 'bootloader' || info.name === 'builtin')
                continue;
            if (!info.name.includes('/') && !info.name.startsWith('d/'))
                continue;
            nameToModule.set(info.name, info.module);
            const vars = new window.Map();
            for (const v of runtime._variables) {
                if (v._module !== info.module)
                    continue;
                if (v._name)
                    vars.set(v._name, v);
                if (v.pid)
                    vars.set('__pid__' + v.pid, v);
            }
            nameToVars.set(info.name, vars);
        }
        const applyModule = (moduleId, defineFn) => {
            const mod = nameToModule.get(moduleId);
            if (!mod)
                return;
            const existingVars = nameToVars.get(moduleId) || new window.Map();
            const cells = probeDefine(defineFn);
            const seenPids = new Set();
            for (const cell of cells) {
                if (cell.type === 'import')
                    continue;
                if (!cell.pid)
                    continue;
                seenPids.add(cell.pid);
                const existing = existingVars.get('__pid__' + cell.pid);
                if (!existing) {
                    const taggedDefn = cell.definition ? tag(cell.definition, { source: 'file-sync' }) : cell.definition;
                    const v = mod.variable();
                    v.define(cell.name, cell.inputs, taggedDefn);
                    v.pid = cell.pid;
                    existingVars.set('__pid__' + cell.pid, v);
                    if (cell.name)
                        existingVars.set(cell.name, v);
                    continue;
                }
                if (existing._definition) {
                    const existingInputNames = existing._inputs.map(v => typeof v === 'string' ? v : v._name);
                    const inputsMatch = JSON.stringify(existingInputNames) === JSON.stringify(cell.inputs);
                    const defnMatch = existing._definition.toString() === (cell.definition ? cell.definition.toString() : '');
                    if (inputsMatch && defnMatch)
                        continue;
                }
                const taggedDefn = cell.definition ? tag(cell.definition, { source: 'file-sync' }) : cell.definition;
                existing.define(cell.name, cell.inputs, taggedDefn).pid = cell.pid;
            }
            const ordered = [];
            for (const cell of cells) {
                if (!cell.pid)
                    continue;
                const v = existingVars.get('__pid__' + cell.pid);
                if (v)
                    ordered.push(v);
            }
            if (ordered.length) {
                const orderedSet = new Set(ordered);
                const arr = [...runtime._variables];
                let oi = 0;
                for (let i = 0; i < arr.length; i++) {
                    if (orderedSet.has(arr[i]))
                        arr[i] = ordered[oi++];
                }
                while (oi < ordered.length)
                    arr.push(ordered[oi++]);
                runtime._variables.clear();
                for (const v of arr)
                    runtime._variables.add(v);
            }
        };
        const manifestUpdates = {};
        let ok = 0, fail = 0;
        for (const moduleId of syncableModules) {
            try {
                let file;
                try {
                    file = await readFile(directory, prefix + moduleId + '.js');
                } catch (e) {
                    file = null;
                }
                if (!file) {
                    log('  skip ' + moduleId + ' (no .js on disk)');
                    continue;
                }
                const diskText = await file.text();
                const blob = new window.Blob([diskText], { type: 'text/javascript' });
                const url = window.URL.createObjectURL(blob);
                try {
                    const mod = await import(url);
                    if (typeof mod.default === 'function') {
                        applyModule(moduleId, mod.default);
                        log('  applied ' + moduleId);
                        try {
                            const after = await exportModuleJS(moduleId);
                            manifestUpdates[moduleId] = hashSource(after.source);
                        } catch (e) {
                            manifestUpdates[moduleId] = hashSource(diskText);
                        }
                        ok++;
                    }
                } finally {
                    window.URL.revokeObjectURL(url);
                }
            } catch (e) {
                log('  FAILED: ' + moduleId + ' - ' + e.message);
                fail++;
            }
        }
        try {
            await manifestWriter(directory, prefix, null, readFile, writeFile);
            await manifestWriter(directory, prefix, manifestUpdates, readFile, writeFile);
            log('wrote manifest (' + Object.keys(manifestUpdates).length + ' modules)');
        } catch (e) {
            log('manifest write FAILED: ' + e.message);
        }
        try {
            const view = $0;
            const cb = view && view.querySelector ? view.querySelector('input') : null;
            if (cb && !cb.checked) {
                cb.checked = true;
                view.value = true;
                view.dispatchEvent(new window.Event('input', { bubbles: true }));
                log('enabled Sync toggle');
            } else if (cb && cb.checked) {
                log('Sync toggle already enabled');
            }
        } catch (e) {
            log('toggle enable FAILED: ' + e.message);
        }
        log('\nDone: ' + ok + ' modules synced, ' + fail + ' failed');
        syncBtn.textContent = 'Synced ' + ok + ' modules';
        disBtn.disabled = false;
        syncBtn.disabled = false;
    };
    container.value = undefined;
    return container;
};
const _eoa5ga = (G, _) => G.input(_);
const _1jyon1g = function _syncStatus(htl,directory,syncableModules,notebookToFiles,filesToNotebook){return(
htl.html`<div style="font-family:monospace; font-size:12px; padding:8px 12px; background:#f8f8f8; border:1px solid #ddd; border-radius:4px; line-height:1.8;">
  <div><strong>Directory:</strong> ${ directory ? directory.name : '\u2014 (not set)' }</div>
  <div><strong>Modules:</strong> ${ syncableModules.length } syncable</div>
  <div><strong>Notebook\u2192Files:</strong> ${ notebookToFiles }</div>
  <div><strong>Files\u2192Notebook:</strong> ${ filesToNotebook }</div>
</div>`
)};
const _1dl3i63 = function _6(md){return(
md`## Overview

File Sync provides **bidirectional, live synchronization** between the Observable runtime and a directory of \`.js\` module files on disk. This enables agents (Claude Code, etc.) and external editors to modify notebook code using standard file-editing tools while seeing changes reflected in the browser in real time.

**What gets synced:**
- Each module in the runtime becomes a \`.js\` file containing its cell definitions
- File attachments are synced as binary files alongside their module (e.g. images, gzipped JS, CSV)
- Changes flow both ways: edit on disk and the runtime updates within 1 second; edit in the browser and the disk file updates within 200ms
- File attachment changes on disk are detected and hot-swapped into the runtime\\'s \`FileAttachment\` map

**What does NOT get synced:**
- The \`bootloader\` and \`builtin\` modules (infrastructure, not user code)
- Import bridges and implicit variables (managed by the runtime, not by module source)`
)};
const _19lc4kb = function _7(md){return(
md`## File Structure

\`\`\`
sync-dir/
\u251c\u2500\u2500 tomlarkworthy.lopecode.dev/    # notebook identified by domain
\u2502   \u251c\u2500\u2500 bootconf.json               # notebook boot configuration
\u2502   \u251c\u2500\u2500 @tomlarkworthy/
\u2502   \u2502   \u251c\u2500\u2500 my-notebook.js          # module source (cells + define function)
\u2502   \u2502   \u251c\u2500\u2500 my-notebook/             # file attachments (if any)
\u2502   \u2502   \u2502   \u251c\u2500\u2500 image.png
\u2502   \u2502   \u2502   \u2514\u2500\u2500 data.csv
\u2502   \u2502   \u251c\u2500\u2500 runtime-sdk.js
\u2502   \u2502   \u2514\u2500\u2500 editor-5.js
\u2502   \u2514\u2500\u2500 @observablehq/
\u2502       \u2514\u2500\u2500 ...
\u2514\u2500\u2500 other-notebook.lopecode.dev/    # another notebook, isolated
    \u251c\u2500\u2500 bootconf.json
    \u2514\u2500\u2500 ...
\`\`\`

Each notebook gets its own subdirectory named by \`location.hostname\` (the domain the notebook is served from). Modules and file attachments live inside, preventing cross-notebook contamination. Each \`.js\` file is a standard ES module with an \`export default function define(runtime, observer)\` entry point. Cells are named functions with persistent ID hashes (pids) that survive renames and reordering.`
)};
const _m8q656 = function _notebookId(location){return(
location.hostname || location.pathname.split('/').pop().replace(/\.html$/, '')
)};
const _1gxl72e = function _hashParam(location){return(
(() => {
    const m = location.hash.match(/[#&]filesync=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : null;
})()
)};
const _8mu9u = function _writeFile(){return(
async (dirHandle, path, content) => {
    const parts = path.split('/');
    let current = dirHandle;
    for (const dir of parts.slice(0, -1)) {
        current = await current.getDirectoryHandle(dir, { create: true });
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}
)};
const _18kj49o = function _readFile(){return(
async (dirHandle, path) => {
    const parts = path.split('/');
    let current = dirHandle;
    for (const dir of parts.slice(0, -1)) {
        current = await current.getDirectoryHandle(dir);
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return file;
}
)};
const _3ysbyb = function _SKIP_MODULES(){return(
new Set([
    'bootloader',
    'builtin'
])
)};
const _gzzwmc = function _syncableModules(currentModules,SKIP_MODULES){return(
(() => {
    const result = [];
    for (const [mod, info] of currentModules) {
        if (SKIP_MODULES.has(info.name))
            continue;
        if (!info.name.includes('/') && !info.name.startsWith('d/'))
            continue;
        result.push(info.name);
    }
    return result;
})()
)};
// jbApply: pure factory for the file->live APPLY engine. Build with
// jbApply({currentModules, runtime, probeDefine, createModule}) -> applyModule(moduleId, defineFn).
// Lives here next to probeDefine (its decompile counterpart). Includes the F7 plumbing-upsert fix:
// import loaders/bindings are updated when the file's version differs, so a once-broken import can be
// FIXED by editing the file (the justbash-filesync copy predates this and is create-only).
const _jbApply = function _jbApply() {
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

                // F7 (rc5): plumbing is UPSERTED, not create-only. Create-only meant a once-broken import
                // (wrong inputs, bad path) could never be FIXED by editing the file — the corrected loader/
                // binding was skipped with "0 cells changed" and the module stayed wedged (observed: an agent
                // wrote a binding missing "@variable", then spiralled for 35 steps because its fix never
                // applied). Loaders carry a semantic _jbKey ('live:'/'path:' + target) because their installed
                // definition is locally rebuilt (toString comparison is meaningless); loaders from the module's
                // ORIGINAL define (no _jbKey) are left untouched to avoid recompute churn. Bindings compare
                // inputs + definition like ordinary cells (their definitions are closure-safe file text).
                const upsertLoader = (loaderName, defn) => {
                    seenNames.add(loaderName);
                    const spec = loaderName.slice('module '.length);
                    const child = resolveModule(spec);
                    const path = importPath(defn);
                    const key = child ? 'live:' + spec : (path ? 'path:' + path : null);
                    if (key == null) return;
                    const make = child ? () => child : async () => runtime.module((await window.importShim(path)).default);
                    const existing = existingByName.get(loaderName);
                    if (existing) {
                        if (existing._jbKey !== undefined && existing._jbKey !== key) { existing.define(loaderName, [], make); existing._jbKey = key; changes++; }
                        return;
                    }
                    const v = mod.variable(null);
                    v.define(loaderName, [], make);
                    v._jbKey = key;
                    existingByName.set(loaderName, v);
                    changes++;
                };
                const upsertBinding = (name, inputs, defn) => {
                    seenNames.add(name);
                    const existing = existingByName.get(name);
                    if (!existing) {
                        const v = mod.variable(null);
                        v.define(name, inputs, defn);
                        existingByName.set(name, v);
                        changes++;
                        return;
                    }
                    const existingInputNames = (existing._inputs || []).map(iv => typeof iv === 'string' ? iv : iv._name);
                    const inputsMatch = JSON.stringify(existingInputNames) === JSON.stringify(inputs);
                    const defnMatch = existing._definition && existing._definition.toString() === (defn ? defn.toString() : '');
                    if (!(inputsMatch && defnMatch)) { existing.define(name, inputs, defn); changes++; }
                };

                // explicit module.variable().import(remote, alias, from) form
                if (cell.type === 'import') {
                    const spec = cell.from;
                    const child = spec && resolveModule(spec);
                    if (!child) continue;
                    const loaderName = 'module ' + spec;
                    seenNames.add(loaderName);
                    if (!existingByName.has(loaderName)) { const lv = mod.variable(null); lv.define(loaderName, [], () => child); lv._jbKey = 'live:' + spec; existingByName.set(loaderName, lv); changes++; }
                    const alias = cell.alias || cell.remote;
                    upsertBinding(alias, [loaderName, '@variable'], (_, vv) => vv.import(cell.remote, _));
                    continue;
                }

                // import-loader plumbing: "module @x" — rebuild against the REAL runtime
                if (cell.name && cell.name.startsWith('module ')) {
                    upsertLoader(cell.name, cell.definition);
                    continue;
                }

                // import-binding: inputs include "@variable" — definition is closure-safe, reuse verbatim
                if (hasVarInput(cell.inputs)) {
                    if (cell.name) upsertBinding(cell.name, cell.inputs, cell.definition);
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

const _vxwmfh = function _probeDefine(){return(
function probeDefine(defineFn) {
    const cells = [];
    const makeVar = observed => ({
        define(...args) {
            const name = typeof args[0] === 'string' || args[0] === null ? args.shift() : null;
            const inputs = Array.isArray(args[0]) ? args.shift() : [];
            const defn = args[0];
            const cell = {
                name,
                inputs,
                definition: defn,
                observed
            };
            cells.push(cell);
            return {
                set pid(v) {
                    cell.pid = v;
                }
            };
        },
        import(remote, alias, from) {
            cells.push({
                type: 'import',
                remote,
                alias,
                from
            });
            return this;
        }
    });
    const fakeModule = {
        variable(observer) {
            return makeVar(!!observer);
        },
        define(...args) {
            const name = typeof args[0] === 'string' || args[0] === null ? args.shift() : null;
            const inputs = Array.isArray(args[0]) ? args.shift() : [];
            const defn = args[0];
            const cell = {
                name,
                inputs,
                definition: defn,
                observed: false
            };
            cells.push(cell);
            return {
                set pid(v) {
                    cell.pid = v;
                }
            };
        },
        builtin() {
        },
        import() {
            return fakeModule;
        },
        derive() {
            return fakeModule;
        }
    };
    const fakeRuntime = {
        module() {
            return fakeModule;
        },
        fileAttachments(fn) {
            return fn;
        }
    };
    defineFn(fakeRuntime, name => name ? {} : null);
    return cells;
}
)};
const _7ajapw = function _hashSource(){return(
s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
}
)};
const _ujgc0c = function _manifestWriter(){return(
(() => {
    let lock = Promise.resolve();
    return (directory, prefix, updates, readFile, writeFile) => {
        lock = lock.then(async () => {
            let manifest;
            try {
                const file = await readFile(directory, prefix + '.file-sync.json');
                manifest = JSON.parse(await file.text());
            } catch (e) {
                manifest = null;
            }
            if (!manifest || typeof manifest !== 'object')
                manifest = {};
            if (!manifest.modules)
                manifest.modules = {};
            if (updates === null) {
                manifest.modules = {};
            } else {
                for (const [k, v] of Object.entries(updates)) {
                    if (v === null)
                        delete manifest.modules[k];
                    else
                        manifest.modules[k] = v;
                }
            }
            manifest.lastUpdated = Date.now();
            await writeFile(directory, prefix + '.file-sync.json', JSON.stringify(manifest, null, 2));
        }).catch(e => console.error('[file-sync] manifest write failed:', e));
        return lock;
    };
})()
)};
const _1cy7bqk = function _syncArmed(notebookId,$0,directory,syncEnabled,readFile,exportModuleJS,hashSource)
{
    const disableToggle = reason => {
        console.warn('[file-sync] auto-disabled: ' + reason);
        const KEY = 'lopecode-file-sync:syncEnabled:' + notebookId;
        window.localStorage.setItem(KEY, '0');
        if ($0 && $0.querySelector) {
            const cb = $0.querySelector('input');
            if (cb && cb.checked) {
                cb.checked = false;
                $0.value = false;
                $0.dispatchEvent(new window.Event('input', { bubbles: true }));
            }
        }
    };
    if (!directory)
        return Promise.resolve({
            armed: false,
            reason: 'No directory'
        });
    if (!syncEnabled)
        return Promise.resolve({
            armed: false,
            reason: 'Sync disabled'
        });
    const prefix = notebookId + '/';
    return (async () => {
        let manifest;
        try {
            const file = await readFile(directory, prefix + '.file-sync.json');
            manifest = JSON.parse(await file.text());
        } catch (e) {
            manifest = null;
        }
        if (!manifest || !manifest.modules || Object.keys(manifest.modules).length === 0) {
            disableToggle('no manifest \u2014 run Disassemble to initialize');
            return {
                armed: false,
                reason: 'No manifest \u2014 click Disassemble'
            };
        }
        for (const [moduleId, expectedHash] of Object.entries(manifest.modules)) {
            let result;
            try {
                result = await exportModuleJS(moduleId);
            } catch (e) {
                disableToggle('cannot export ' + moduleId);
                return {
                    armed: false,
                    reason: 'Export failed: ' + moduleId
                };
            }
            const actualHash = hashSource(result.source);
            if (actualHash !== expectedHash) {
                disableToggle('runtime drift on ' + moduleId);
                return {
                    armed: false,
                    reason: 'Runtime drift: ' + moduleId
                };
            }
        }
        return { armed: true };
    })();
};
const _3zm0bx = function _notebookToFiles(directory,syncArmed,currentModules,notebookId,exportModuleJS,writeFile,manifestWriter,hashSource,readFile,onCodeChange,invalidation)
{
    if (!directory)
        return 'Waiting for directory...';
    if (!syncArmed || !syncArmed.armed)
        return 'Sync inactive: ' + (syncArmed && syncArmed.reason || 'unknown');
    // Compute syncable modules inline — avoid depending on syncableModules/SKIP_MODULES reactively,
    // which would restart this cell (cancelling pending writes) every time SKIP_MODULES changes.
    const SKIP = new Set([
        'bootloader',
        'builtin'
    ]);
    const syncableSet = new Set();
    for (const [mod, info] of currentModules) {
        if (SKIP.has(info.name))
            continue;
        if (!info.name.includes('/') && !info.name.startsWith('d/'))
            continue;
        syncableSet.add(info.name);
    }
    const syncableCount = syncableSet.size;
    const pendingTimers = new Map();
    // Build reverse lookup: module object → module name
    const moduleToName = new Map();
    for (const [mod, info] of currentModules) {
        moduleToName.set(info.module, info.name);
    }
    const prefix = notebookId + '/';
    const writeModule = async moduleId => {
        try {
            const result = await exportModuleJS(moduleId);
            await writeFile(directory, prefix + moduleId + '.js', result.source);
            await manifestWriter(directory, prefix, { [moduleId]: hashSource(result.source) }, readFile, writeFile);
            console.log('[file-sync] wrote ' + prefix + moduleId + '.js (' + result.source.length + ' bytes)');
            // Also write file attachments
            if (result.fileAttachments && result.fileAttachments.size) {
                for (const [name, entry] of result.fileAttachments) {
                    try {
                        const resp = await fetch(entry.url);
                        const bytes = await resp.arrayBuffer();
                        await writeFile(directory, prefix + moduleId + '/' + name, new Uint8Array(bytes));
                    } catch (e) {
                        console.error('[file-sync] attachment write failed: ' + moduleId + '/' + name, e);
                    }
                }
            }
        } catch (e) {
            console.error('[file-sync] write failed: ' + moduleId, e);
        }
    };
    const unsub = onCodeChange(({variable, previous, t}) => {
        // On deletion variable is null; use previous to identify the module.
        // Echo suppression checks either side's definition for the file-sync provenance tag.
        const def = variable && variable._definition || previous && previous._definition;
        const prov = def && def.__provenance;
        if (prov && prov.source === 'file-sync')
            return;
        // Find which module this variable belongs to
        const mod = variable && variable._module || previous && previous._module;
        const moduleName = mod && moduleToName.get(mod);
        if (!moduleName || !syncableSet.has(moduleName))
            return;
        // Debounce 200ms per module
        if (pendingTimers.has(moduleName)) {
            clearTimeout(pendingTimers.get(moduleName));
        }
        pendingTimers.set(moduleName, setTimeout(() => {
            pendingTimers.delete(moduleName);
            writeModule(moduleName);
        }, 200));
    });
    invalidation.then(() => {
        unsub();
        for (const timer of pendingTimers.values())
            clearTimeout(timer);
        pendingTimers.clear();
    });
    return 'Watching ' + syncableCount + ' modules for changes...';
};
const _1bf1rb4 = function _fileSyncLastSeen(directory)
{
    void directory;
    return new window.Map();
};
const _43mwl9 = function _filesToNotebook(directory, syncArmed, currentModules, fileSyncLastSeen, notebookId, runtime, probeDefine, tag, readFile, exportModuleJS, manifestWriter, hashSource, writeFile, getFileAttachmentsMap, invalidation) {
    if (!directory)
        return 'Waiting for directory...';
    if (!syncArmed || !syncArmed.armed)
        return 'Sync inactive: ' + (syncArmed && syncArmed.reason || 'unknown');
    const SKIP = new Set([
        'bootloader',
        'builtin'
    ]);
    const syncableModules = [];
    for (const [mod, info] of currentModules) {
        if (SKIP.has(info.name))
            continue;
        if (!info.name.includes('/') && !info.name.startsWith('d/'))
            continue;
        syncableModules.push(info.name);
    }
    const syncableSet = new Set(syncableModules);
    const lastSeen = fileSyncLastSeen;
    const POLL_MS = 1000;
    const prefix = notebookId + '/';
    const nameToModule = new window.Map();
    const nameToVars = new window.Map();
    for (const [mod, info] of currentModules) {
        if (!syncableSet.has(info.name))
            continue;
        nameToModule.set(info.name, info.module);
        const vars = new window.Map();
        for (const v of runtime._variables) {
            if (v._module !== info.module)
                continue;
            if (v._name)
                vars.set(v._name, v);
            if (v.pid)
                vars.set('__pid__' + v.pid, v);
        }
        nameToVars.set(info.name, vars);
    }
    let pollTimer;
    const knownFilePids = new window.Map();
    let knownDiskModules = null;
    const getModuleFA = mod => {
        for (const v of runtime._variables) {
            if (v._module === mod && v._name === 'FileAttachment' && v._value)
                return v._value;
        }
        return null;
    };
    const getSubDir = async (dirHandle, path) => {
        let current = dirHandle;
        for (const part of path.split('/').filter(Boolean)) {
            current = await current.getDirectoryHandle(part);
        }
        return current;
    };
    const applyModule = (moduleId, defineFn) => {
        const mod = nameToModule.get(moduleId);
        if (!mod)
            return;
        const existingVars = nameToVars.get(moduleId) || new window.Map();
        const cells = probeDefine(defineFn);
        let redefinedSelf = false;
        const seenPids = new Set();
        for (const cell of cells) {
            if (cell.type === 'import')
                continue;
            if (!cell.pid)
                continue;
            seenPids.add(cell.pid);
            const existing = existingVars.get('__pid__' + cell.pid);
            if (!existing) {
                const taggedDefn = cell.definition ? tag(cell.definition, { source: 'file-sync' }) : cell.definition;
                const v = mod.variable();
                v.define(cell.name, cell.inputs, taggedDefn);
                v.pid = cell.pid;
                existingVars.set('__pid__' + cell.pid, v);
                if (cell.name)
                    existingVars.set(cell.name, v);
                console.log('[file-sync] created cell', cell.pid, cell.name || '(anonymous)');
                continue;
            }
            if (existing._definition) {
                const existingInputNames = existing._inputs.map(function (v) {
                    return typeof v === 'string' ? v : v._name;
                });
                const inputsMatch = JSON.stringify(existingInputNames) === JSON.stringify(cell.inputs);
                const defnMatch = existing._definition.toString() === (cell.definition ? cell.definition.toString() : '');
                if (inputsMatch && defnMatch)
                    continue;
            }
            const taggedDefn = cell.definition ? tag(cell.definition, { source: 'file-sync' }) : cell.definition;
            existing.define(cell.name, cell.inputs, taggedDefn).pid = cell.pid;
            if (moduleId === '@tomlarkworthy/file-sync' && cell.name === 'filesToNotebook') {
                redefinedSelf = true;
            }
        }
        const prevKnown = knownFilePids.get(moduleId);
        if (prevKnown) {
            for (const pid of prevKnown) {
                if (seenPids.has(pid))
                    continue;
                const v = existingVars.get('__pid__' + pid);
                if (!v)
                    continue;
                console.log('[file-sync] deleting cell', pid, v._name || '(anonymous)');
                v.delete();
                existingVars.delete('__pid__' + pid);
                if (v._name)
                    existingVars.delete(v._name);
            }
        }
        knownFilePids.set(moduleId, seenPids);
        const ordered = [];
        for (const cell of cells) {
            if (!cell.pid)
                continue;
            const v = existingVars.get('__pid__' + cell.pid);
            if (v)
                ordered.push(v);
        }
        if (ordered.length) {
            const orderedSet = new Set(ordered);
            const arr = [...runtime._variables];
            let oi = 0;
            for (let i = 0; i < arr.length; i++) {
                if (orderedSet.has(arr[i]))
                    arr[i] = ordered[oi++];
            }
            while (oi < ordered.length)
                arr.push(ordered[oi++]);
            runtime._variables.clear();
            for (const v of arr)
                runtime._variables.add(v);
        }
        if (redefinedSelf) {
            clearInterval(pollTimer);
            console.log('[file-sync] filesToNotebook redefined \u2014 stopping old poll timer');
        }
    };
    const pollModule = async moduleId => {
        try {
            let file;
            try {
                file = await readFile(directory, prefix + moduleId + '.js');
            } catch (e) {
                file = null;
            }
            if (file) {
                const prev = lastSeen.get(moduleId);
                const changed = !prev || file.lastModified !== prev.lastModified;
                if (changed) {
                    lastSeen.set(moduleId, { lastModified: file.lastModified });
                    const diskText = await file.text();
                    let needsApply = true;
                    try {
                        const runtimeResult = await exportModuleJS(moduleId);
                        if (runtimeResult.source === diskText)
                            needsApply = false;
                    } catch (e) {
                    }
                    if (needsApply) {
                        const blob = new window.Blob([diskText], { type: 'text/javascript' });
                        const url = window.URL.createObjectURL(blob);
                        try {
                            const mod = await window.importShim(url, 'file://@tomlarkworthy/file-sync');
                            if (typeof mod.default === 'function') {
                                applyModule(moduleId, mod.default);
                                console.log('[file-sync] applied ' + moduleId + ' from disk');
                                try {
                                    const after = await exportModuleJS(moduleId);
                                    await manifestWriter(directory, prefix, { [moduleId]: hashSource(after.source) }, readFile, writeFile);
                                } catch (e) {
                                    await manifestWriter(directory, prefix, { [moduleId]: hashSource(diskText) }, readFile, writeFile);
                                }
                            }
                        } finally {
                            window.URL.revokeObjectURL(url);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[file-sync] poll error for ' + moduleId + ':', e);
        }
        try {
            const attachDir = await getSubDir(directory, prefix + moduleId);
            const mod = nameToModule.get(moduleId);
            const FA = mod ? getModuleFA(mod) : null;
            const faMap = FA ? getFileAttachmentsMap(FA) : null;
            if (faMap) {
                for (const key of [...faMap.keys()]) {
                    if (key.endsWith('.crswap') || key.startsWith('.'))
                        faMap.delete(key);
                }
            }
            for await (const [name, handle] of attachDir) {
                if (handle.kind !== 'file')
                    continue;
                if (name.endsWith('.crswap') || name.startsWith('.'))
                    continue;
                const file = await handle.getFile();
                const attKey = '__att__' + moduleId + '/' + name;
                const prevA = lastSeen.get(attKey);
                if (prevA && file.lastModified === prevA.lastModified)
                    continue;
                lastSeen.set(attKey, { lastModified: file.lastModified });
                const bytes = new Uint8Array(await file.arrayBuffer());
                const blob = new window.Blob([bytes], { type: file.type || 'application/octet-stream' });
                const blobUrl = window.URL.createObjectURL(blob);
                if (faMap) {
                    faMap.set(name, {
                        url: blobUrl,
                        mimeType: file.type || 'application/octet-stream'
                    });
                    console.log('[file-sync] updated attachment ' + moduleId + '/' + name);
                }
                const scriptId = moduleId + '/' + encodeURIComponent(name);
                const script = document.getElementById(scriptId);
                if (script) {
                    const b64 = btoa(String.fromCharCode.apply(null, bytes));
                    script.textContent = b64;
                    script.setAttribute('data-encoding', 'base64');
                    script.setAttribute('data-mime', file.type || 'application/octet-stream');
                }
            }
        } catch (e) {
            if (e.name !== 'NotFoundError')
                console.error('[file-sync] attachment scan error for ' + moduleId + ':', e);
        }
    };
    const scanDiskModules = async () => {
        const diskModules = new Set();
        try {
            const notebookDir = await getSubDir(directory, prefix.slice(0, -1));
            for await (const [orgName, orgHandle] of notebookDir) {
                if (orgHandle.kind !== 'directory')
                    continue;
                if (orgName.startsWith('@')) {
                    for await (const [fname, fhandle] of orgHandle) {
                        if (fhandle.kind === 'file' && fname.endsWith('.js'))
                            diskModules.add(orgName + '/' + fname.slice(0, -3));
                    }
                } else if (orgName === 'd') {
                    for await (const [fname, fhandle] of orgHandle) {
                        if (fhandle.kind === 'file' && fname.endsWith('.js'))
                            diskModules.add('d/' + fname.slice(0, -3));
                    }
                }
            }
        } catch (e) {
        }
        return diskModules;
    };
    const poll = async () => {
        for (const moduleId of syncableModules)
            await pollModule(moduleId);
        const diskModules = await scanDiskModules();
        const newOnDisk = [...diskModules].filter(m => !syncableSet.has(m) && !nameToModule.has(m));
        if (newOnDisk.length)
            console.log('[file-sync] new modules on disk:', newOnDisk);
        for (const moduleId of diskModules) {
            if (syncableSet.has(moduleId))
                continue;
            if (nameToModule.has(moduleId))
                continue;
            try {
                const file = await readFile(directory, prefix + moduleId + '.js');
                const diskText = await file.text();
                const blob = new window.Blob([diskText], { type: 'text/javascript' });
                const url = window.URL.createObjectURL(blob);
                try {
                    const imported = await window.importShim(url, 'file://@tomlarkworthy/file-sync');
                    if (typeof imported.default === 'function') {
                        const newMod = runtime.module(imported.default, () => null);
                        runtime.mains.set(moduleId, newMod);
                        nameToModule.set(moduleId, newMod);
                        syncableModules.push(moduleId);
                        syncableSet.add(moduleId);
                        const vars = new window.Map();
                        for (const v of runtime._variables) {
                            if (v._module !== newMod)
                                continue;
                            if (v._name)
                                vars.set(v._name, v);
                            if (v.pid)
                                vars.set('__pid__' + v.pid, v);
                        }
                        nameToVars.set(moduleId, vars);
                        console.log('[file-sync] added new module from disk: ' + moduleId);
                        try {
                            await manifestWriter(directory, prefix, { [moduleId]: hashSource(diskText) }, readFile, writeFile);
                        } catch (e) {
                            console.error('[file-sync] manifest update for new module failed:', e);
                        }
                    }
                } finally {
                    window.URL.revokeObjectURL(url);
                }
            } catch (e) {
                console.error('[file-sync] failed to add module ' + moduleId + ':', e);
            }
        }
        if (knownDiskModules) {
            for (const moduleId of knownDiskModules) {
                if (diskModules.has(moduleId))
                    continue;
                if (!nameToModule.has(moduleId))
                    continue;
                const mod = nameToModule.get(moduleId);
                for (const v of [...runtime._variables]) {
                    if (v._module === mod)
                        v.delete();
                }
                runtime.mains.delete(moduleId);
                nameToModule.delete(moduleId);
                nameToVars.delete(moduleId);
                knownFilePids.delete(moduleId);
                const idx = syncableModules.indexOf(moduleId);
                if (idx !== -1)
                    syncableModules.splice(idx, 1);
                syncableSet.delete(moduleId);
                console.log('[file-sync] removed module: ' + moduleId);
                try {
                    await manifestWriter(directory, prefix, { [moduleId]: null }, readFile, writeFile);
                } catch (e) {
                    console.error('[file-sync] manifest remove failed:', e);
                }
            }
        }
        knownDiskModules = diskModules;
    };
    pollTimer = setInterval(poll, POLL_MS);
    poll();
    invalidation.then(() => clearInterval(pollTimer));
    return 'Polling ' + syncableModules.length + ' modules every ' + POLL_MS + 'ms...';
};
const _1b4kluo = function _21(md){return(
md`## How It Works

### Disassemble (one-shot export)
Iterates all syncable modules via \`moduleMap\`, calls \`exportModuleJS(moduleId)\` from exporter-3 to serialize each module to a \`.js\` file, and writes file attachments as decoded binary files.

### Runtime \u2192 Files (live)
Subscribes to \`onCodeChange\` from runtime-sdk. When a cell definition changes:
1. Checks \`__provenance.source\` on the definition \u2014 skips if \`"file-sync"\` (echo suppression)
2. Identifies the module via a reverse lookup (\`variable._module\` \u2192 module name)
3. Debounces 200ms per module, then calls \`exportModuleJS\` and writes the \`.js\` file and any file attachments

### Files \u2192 Runtime (live)
Polls the sync directory every 1 second:
1. **Fast path**: compares \`file.lastModified\` against \`fileSyncLastSeen\` map \u2014 skips unchanged files
2. **Delta check**: reads file text and compares against \`exportModuleJS\` output \u2014 skips if identical
3. **Apply**: dynamic-imports the \`.js\` file via blob URL, runs \`probeDefine\` to extract cells, then:
   - **Update**: matches cells to runtime variables by persistent ID (pid), redefines if changed
   - **Create**: new pids get \`mod.variable().define()\` \u2014 lopepage visualizer auto-discovers them
   - **Delete**: pids previously seen but now absent get \`variable.delete()\`
4. Tags all applied definitions with \`{source: "file-sync"}\` via \`tag()\` for echo suppression
5. **Attachments**: independently scans each module\\'s attachment subdirectory for changed files, creates new blob URLs, updates the runtime \`FileAttachment\` map via \`getFileAttachmentsMap\` (imported from \`@tomlarkworthy/fileattachments\`), and patches the DOM \`<script>\` tags so notebook re-exports persist the changes

### File Attachments
Each module can have a subdirectory of the same name containing binary file attachments (images, gzipped JS libraries, data files). These are synced bidirectionally:
- **Runtime\\u2192Files**: when \`writeModule\` fires, \`exportModuleJS\` returns a \`fileAttachments\` map; each entry is fetched and written to disk
- **Files\\u2192Runtime**: the poller scans the attachment subdirectory for each module, detects changed files via \`lastModified\`, reads them into blob URLs, and hot-swaps entries in the module\\'s \`FileAttachment\` resolver map

### Module Add/Remove
After polling existing modules, the poller scans the notebook directory for all \`.js\` files. New modules (not in the runtime) are loaded via \`runtime.module(defineFn, () => null)\` and registered in \`runtime.mains\`. Removed modules (previously on disk but now deleted) have all their variables deleted and are unregistered from \`runtime.mains\`. The first scan only records — no deletions — matching the \`knownFilePids\` safety pattern.

### Echo Suppression
Prevents feedback loops between the two sync directions. When file-sync applies a change from disk, it tags the definition with \`__provenance: {source: "file-sync"}\`. The runtime\u2192files listener checks this tag and skips changes it caused.

### Persistent IDs (pids)
Each cell has a content-hash-based pid (e.g. \`_4ie7s1\`) that survives renames and reordering. All matching is pid-first. Cells without pids (import bridges, builtins) are never managed by file-sync.

### Restart Tolerance
\`fileSyncLastSeen\` is a separate cell that only depends on \`directory\`. When \`filesToNotebook\` restarts due to reactive dependency changes, the lastSeen map persists, preventing the poller from re-applying stale disk content.`
)};
const _1h2nj16 = function _22(md){return(
md`## TODO

- **Notebook re-export handling**: detect when the notebook HTML is re-exported and reconcile
- **Import cell validation**: verify import bridges survive round-trip correctly
- **Conflict resolution**: when both disk and runtime edit the same cell simultaneously, detect and surface the conflict instead of last-write-wins`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-change-history", async () => runtime.module((await import("/@tomlarkworthy/local-change-history.js?v=4")).default));  
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  $def("_1th1rci", null, ["md"], _1th1rci);  
  $def("_1t1i3ml", "viewof directory", ["notebookId","htl","hashParam","location","history"], _1t1i3ml);  
  $def("_jnt0bt", "directory", ["Generators","viewof directory"], _jnt0bt);  
  $def("_yqx7l8", "viewof syncEnabled", ["notebookId","htl"], _yqx7l8);  
  $def("_xltqf6", "syncEnabled", ["Generators","viewof syncEnabled"], _xltqf6);  
  $def("_1mb10vh", "viewof disassemble", ["htl","directory","notebookId","manifestWriter","readFile","writeFile","syncableModules","exportModuleJS","hashSource","currentModules","runtime","probeDefine","tag","importShim","viewof syncEnabled"], _1mb10vh);  
  $def("_eoa5ga", "disassemble", ["Generators","viewof disassemble"], _eoa5ga);  
  $def("_1jyon1g", "syncStatus", ["htl","directory","syncableModules","notebookToFiles","filesToNotebook"], _1jyon1g);  
  $def("_1dl3i63", null, ["md"], _1dl3i63);  
  $def("_19lc4kb", null, ["md"], _19lc4kb);  
  $def("_m8q656", "notebookId", ["location"], _m8q656);  
  $def("_1gxl72e", "hashParam", ["location"], _1gxl72e);  
  $def("_8mu9u", "writeFile", [], _8mu9u);  
  $def("_18kj49o", "readFile", [], _18kj49o);  
  $def("_3ysbyb", "SKIP_MODULES", [], _3ysbyb);  
  $def("_gzzwmc", "syncableModules", ["currentModules","SKIP_MODULES"], _gzzwmc);  
  $def("_vxwmfh", "probeDefine", [], _vxwmfh);  
  $def("_jbApply", "jbApply", [], _jbApply);  
  $def("_7ajapw", "hashSource", [], _7ajapw);  
  $def("_ujgc0c", "manifestWriter", [], _ujgc0c);  
  $def("_1cy7bqk", "syncArmed", ["notebookId","viewof syncEnabled","directory","syncEnabled","readFile","exportModuleJS","hashSource"], _1cy7bqk);  
  $def("_3zm0bx", "notebookToFiles", ["directory","syncArmed","currentModules","notebookId","exportModuleJS","writeFile","manifestWriter","hashSource","readFile","onCodeChange","invalidation"], _3zm0bx);  
  $def("_1bf1rb4", "fileSyncLastSeen", ["directory"], _1bf1rb4);  
  $def("_43mwl9", "filesToNotebook", ["directory","syncArmed","currentModules","fileSyncLastSeen","notebookId","runtime","probeDefine","tag","readFile","exportModuleJS","manifestWriter","hashSource","writeFile","getFileAttachmentsMap","invalidation"], _43mwl9);  
  $def("_1b4kluo", null, ["md"], _1b4kluo);  
  $def("_1h2nj16", null, ["md"], _1h2nj16);  
  main.define("viewof currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("viewof currentModules", _));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportModuleJS", _));  
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("importShim", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("importShim", _));  
  main.define("tag", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("tag", _));  
  main.define("getFileAttachmentsMap", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachmentsMap", _));
  return main;
}