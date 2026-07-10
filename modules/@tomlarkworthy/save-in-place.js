const _sip0doc = function _sip_doc(md){return(
md`# Save in place

A lopepage-2 menu plugin that writes the current notebook back to its own file on
disk via the File System Access API, instead of downloading a fresh copy.

It carries its own dependencies — [\`exporter-3\`](https://observablehq.com/@tomlarkworthy/exporter-3) (\`exportToHTML\`) for the bytes and the FSA/IndexedDB handle machinery here — and composes into lopepage-2 purely by \`plugins.add("lp2-menu", …)\` on the shared [\`@tomlarkworthy/plugin-registry\`](https://observablehq.com/@tomlarkworthy/plugin-registry) bus. It imports NEITHER lopepage-2 (they meet only at the \`"lp2-menu"\` name) nor anything lopepage-specific; a notebook opts in by adding \`@tomlarkworthy/save-in-place\` to its bootconf \`mains\`.

Mechanics:

- **Handle persistence** — the picked \`FileSystemFileHandle\` is stored in IndexedDB keyed by the notebook's path (\`sip_notebookId\`), so subsequent saves skip the picker while read-write permission holds; permission is re-requested on demand.
- **Export** — \`exportToHTML\` re-serialises the live runtime. The saved boot hash keeps the current \`view=\` layout but strips volatile params (\`cc\`, \`open\`, \`close\`, \`filesync\`) so a pairing token is never baked into the file.
- **Feedback** — \`sip_toast\` surfaces Saving / Saved / failure in place, since the menu closes on click.

Constraints (shared with [\`file-sync\`](https://observablehq.com/@tomlarkworthy/file-sync)): Chromium only, secure context (\`file://\` or \`https://\`), and the write happens in the user's own browser — not the headless QA browser, whose picker is not driven.`
)};
const _sip0nid = function _sip_notebookId(location){return(
(location.pathname || '') + (location.search || '')
)};
const _sip0hst = function _sip_handleStore(sip_notebookId)
{
  const IDB_NAME = 'lopecode-save-in-place';
  const STORE = 'handles';
  const key = sip_notebookId || 'default';
  const openDB = () => new Promise((resolve, reject) => {
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const get = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  };
  const put = async handle => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };
  const del = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };
  return {
    get,
    put,
    del,
    key
  };
};
const _sip0tst = function _sip_toast()
{
  // a single fixed toast, bottom-left; returns a handle to update + auto-dismiss
  return (msg, kind) => {
    let el = document.querySelector('.sip-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'sip-toast';
      Object.assign(el.style, {
        position: 'fixed',
        left: '12px',
        bottom: '12px',
        zIndex: 2000,
        padding: '8px 12px',
        borderRadius: '5px',
        font: '12px var(--sans-serif, sans-serif)',
        boxShadow: '0 3px 12px rgba(0,0,0,.22)',
        border: '1px solid var(--theme-foreground-faint, rgba(128,128,128,.3))',
        borderLeft: '3px solid transparent',
        maxWidth: '60vw',
        pointerEvents: 'none'
      });
      document.body.appendChild(el);
    }
    if (el.__sipTimer) {
      window.clearTimeout(el.__sipTimer);
      el.__sipTimer = 0;
    }
    const paint = (text, k) => {
      el.textContent = text;
      // solid themed surface + themed foreground = guaranteed contrast in any theme;
      // status is carried by the left-border accent, not the background tint
      const accent = {
        ok: 'var(--theme-green, #3fb950)',
        err: 'var(--theme-error, var(--theme-red, #e5534b))',
        busy: 'var(--theme-foreground-focus, #6cb0ff)',
        muted: 'var(--theme-foreground-muted, #888)'
      };
      el.style.background = 'var(--theme-background-raised, var(--theme-background-b, #fff))';
      el.style.color = 'var(--theme-foreground, #000)';
      el.style.borderLeftColor = accent[k] || accent.busy;
      el.style.opacity = '1';
    };
    const hide = ms => {
      el.__sipTimer = window.setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity .4s';
      }, ms);
    };
    paint(msg, kind);
    if (kind && kind !== 'busy')
      hide(kind === 'err' ? 5000 : 2200);
    return {
      done: (text, k) => {
        paint(text, k);
        hide(k === 'err' ? 5000 : 2200);
      }
    };
  };
};
const _sip0svg = function _sip_svg(){return(
'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2.5 2.5h8.3L13.5 5.2v8.3a.7.7 0 0 1-.7.7H3.2a.7.7 0 0 1-.7-.7V3.2a.7.7 0 0 1 .7-.7Z"/><path d="M5 2.5h5v3H5z" fill="currentColor" stroke="none"/><rect x="4.5" y="8.5" width="7" height="4" rx=".4"/></svg>'
)};
const _sip0sav = function _sip_save(exportToHTML,sip_handleStore,sip_toast,location,runtime)
{
  const store = sip_handleStore;
  // current layout, minus volatile params, becomes the saved file's boot hash
  const cleanHash = () => {
    const raw = String(location.hash || '').replace(/^#/, '');
    const drop = new Set([
      'cc',
      'open',
      'close',
      'filesync',
      'from',
      'focus'
    ]);
    const kept = raw.split('&').filter(Boolean).filter(p => !drop.has(p.split('=')[0]));
    return kept.length ? '#' + kept.join('&') : '';
  };
  const acquire = async () => {
    const saved = await store.get().catch(() => null);
    if (saved) {
      let perm = 'granted';
      if (saved.queryPermission)
        perm = await saved.queryPermission({ mode: 'readwrite' }).catch(() => 'denied');
      if (perm !== 'granted' && saved.requestPermission)
        perm = await saved.requestPermission({ mode: 'readwrite' }).catch(() => 'denied');
      if (perm === 'granted')
        return saved;
    }
    if (!window.showSaveFilePicker)
      throw new Error('File System Access API unavailable (needs Chromium + a secure context)');
    const suggested = (document.title || 'notebook').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'notebook';
    const handle = await window.showSaveFilePicker({
      suggestedName: suggested + '.html',
      types: [{
          description: 'HTML',
          accept: { 'text/html': ['.html'] }
        }]
    });
    await store.put(handle).catch(() => {
    });
    return handle;
  };
  const save = async () => {
    const toast = sip_toast('Saving…', 'busy');
    try {
      const handle = await acquire();
      // pass mains explicitly (like exporter-3's exportAnchor) — a bare call leaves
      // bootconf mains empty and the saved file boots blank. runtime.mains re-includes
      // every booted main, so the saved copy keeps save-in-place too.
      const resp = await exportToHTML({
        mains: new Map(runtime.mains),
        runtime,
        options: { hash: cleanHash() }
      });
      const html = resp?.source ?? resp;
      if (typeof html !== 'string' || html.length < 1000)
        throw new Error('export produced no source');
      const writable = await handle.createWritable();
      await writable.write(html);
      await writable.close();
      toast.done('Saved ✓ ' + handle.name, 'ok');
      return {
        ok: true,
        name: handle.name,
        bytes: html.length
      };
    } catch (e) {
      if (e && e.name === 'AbortError') {
        toast.done('Save cancelled', 'muted');
        return {
          ok: false,
          cancelled: true
        };
      }
      toast.done('Save failed: ' + (e && e.message || e), 'err');
      throw e;
    }
  };
  return save;
};
const _sip0reg = function _sip_register(plugins,sip_svg,sip_save,invalidation)
{
  // Register straight onto the shared plugin-registry "lp2-menu" set — no import of lopepage-2.
  // {invalidation} auto-removes the item if this cell re-runs.
  plugins.add("lp2-menu", {
    id: 'save-in-place',
    order: 5,
    label: 'Save in place',
    svg: sip_svg,
    action: () => {
      sip_save();
    }
  }, { invalidation });
  return 'registered: save-in-place';
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  $def("_sip0doc", "sip_doc", ["md"], _sip0doc);
  $def("_sip0nid", "sip_notebookId", ["location"], _sip0nid);
  $def("_sip0hst", "sip_handleStore", ["sip_notebookId"], _sip0hst);
  $def("_sip0tst", "sip_toast", [], _sip0tst);
  $def("_sip0svg", "sip_svg", [], _sip0svg);
  $def("_sip0sav", "sip_save", ["exportToHTML", "sip_handleStore", "sip_toast", "location", "runtime"], _sip0sav);
  $def("_sip0reg", "sip_register", ["plugins", "sip_svg", "sip_save", "invalidation"], _sip0reg);
  main.define("exportToHTML", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportToHTML", _));
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  return main;
}
