/*
 * Lopepage tab drag-out / drop-in PROTOTYPE.
 *
 * Run this via the pairing channel's `eval_code` against a notebook that
 * mounts @tomlarkworthy/lopepage (e.g. @tomlarkworthy_golden-layout-2-6-0.html).
 *
 * What it does:
 *  - Adds a ⧉ "copy" grip to each golden-layout tab. Dragging the grip emits a
 *    Chromium DownloadURL dataTransfer entry so the module materializes as a
 *    plain .js file on Finder / desktop / another window.
 *  - Listens for .js file drops on document.body. Filename schemes accepted:
 *      at_<user>_<module>.js   →  @<user>/<module>
 *      d_<hash>[@<v>].js       →  d/<hash>[@<v>]
 *    On drop: imports via importShim (so /@user/x.js?v=4 imports resolve via
 *    the page's importmap), instantiates with runtime.module(define), adds to
 *    runtime.mains, and injects a <script type="text/plain" id="<name>"
 *    data-mime="application/javascript"> block so subsequent
 *    window.lopecode.contentSync(name) finds the source (enables drag-out of
 *    the freshly-installed module and is also the path toward HTML re-export
 *    persistence).
 *
 * Constraints worth remembering when baking into a lopepage cell:
 *  - Grip must be a child element of .lm_tab with stopPropagation on
 *    pointerdown/mousedown/touchstart in CAPTURE phase — golden-layout's
 *    DragListener uses pointer events with passive pointerdown, and a
 *    draggable=true on the .lm_tab itself races with GL's drag.
 *  - Drag-out file is the unmodified contentSync bytes — no header markers,
 *    no metadata wrappers. Filename IS the canonical name.
 *  - Chrome's DownloadURL filename sanitizer strips a leading `@`. Hence the
 *    `at_` / `d_` type-prefix scheme (also avoids ambiguity between @user/x
 *    and d/x namespaces with `/` substituted by `_`).
 *  - Drop-in registers via runtime.mains.set ONLY. Don't call
 *    addModuleAndPersist or define a `module <name>` variable on
 *    notebookModule — additionalModules persistence triggers a remote
 *    importNotebook re-fetch that fails for local blob sources.
 *  - DOM <script type="text/plain"> block lets contentSync find the source
 *    for later drag-out and is naturally captured by HTML re-export.
 */

(() => {
  const runtime = window.__ojs_runtime;
  let msModule = null;
  for (const m of runtime._modules.values()) {
    if (m._scope.get("addModuleAndPersist")) { msModule = m; break; }
  }

  function readModuleSource(name) {
    const r = window.lopecode?.contentSync?.(name);
    if (!r || r.status !== 200 || !r.bytes) return null;
    return new TextDecoder().decode(r.bytes);
  }
  function filenameFor(name) {
    let m = name.match(/^@([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)$/);
    if (m) return `at_${m[1]}_${m[2]}.js`;
    m = name.match(/^d\/([A-Za-z0-9]+)(@\d+)?$/);
    if (m) return `d_${m[1]}${m[2] ?? ""}.js`;
    return name.replace(/[/]/g, "_") + ".js";
  }
  function parseModuleName(filename) {
    let m = filename.match(/^at_([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)_([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.js$/);
    if (m) return `@${m[1]}/${m[2]}`;
    m = filename.match(/^d_([A-Za-z0-9]+)(@\d+)?\.js$/);
    if (m) return `d/${m[1]}${m[2] ?? ""}`;
    return null;
  }
  const HAS_IMPORT_SHIM = typeof window.importShim === "function";

  function ensureDomScriptTag(name, source) {
    let el = document.getElementById(name);
    if (el && el.tagName === "SCRIPT" && el.getAttribute("type") === "text/plain") {
      el.textContent = source;
      return el;
    }
    el = document.createElement("script");
    el.type = "text/plain";
    el.id = name;
    el.setAttribute("data-mime", "application/javascript");
    el.textContent = source;
    document.body.appendChild(el);
    return el;
  }

  function hookTab(tabEl) {
    if (tabEl.__gripHooked) return;
    tabEl.__gripHooked = true;
    const title = tabEl.querySelector(".lm_title")?.textContent || "module";

    const grip = document.createElement("span");
    grip.className = "lm_drag_out_grip";
    grip.textContent = "⧉";
    grip.title = `Drag out ${title} as .js`;
    Object.assign(grip.style, {
      marginRight: "4px", cursor: "grab", opacity: "0.6", userSelect: "none",
    });
    grip.setAttribute("draggable", "true");

    ["pointerdown", "mousedown", "touchstart"].forEach(ev => {
      grip.addEventListener(ev, e => e.stopPropagation(), { capture: true });
    });
    grip.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      const t = tabEl.querySelector(".lm_title")?.textContent || title;
      const source = readModuleSource(t);
      const filename = filenameFor(t);
      console.log("[drag-out grip] dragstart", { title: t, filename, srcLen: source?.length });
      if (!source) {
        e.dataTransfer.setData("text/plain", `// no source for ${t}`);
        return;
      }
      const dataUrl = "data:text/javascript;base64," + btoa(unescape(encodeURIComponent(source)));
      e.dataTransfer.setData("DownloadURL", `text/javascript:${filename}:${dataUrl}`);
      e.dataTransfer.setData("text/plain", source);
      e.dataTransfer.effectAllowed = "copyMove";
    });
    grip.addEventListener("dragend", (e) => {
      console.log("[drag-out grip] dragend", { dropEffect: e.dataTransfer.dropEffect });
    });

    const titleEl = tabEl.querySelector(".lm_title");
    if (titleEl && titleEl.parentNode === tabEl) tabEl.insertBefore(grip, titleEl);
    else tabEl.prepend(grip);
  }

  document.querySelectorAll(".lm_tab").forEach(hookTab);

  if (window.__tabDragHookObs) window.__tabDragHookObs.disconnect();
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.classList?.contains("lm_tab")) hookTab(n);
        n.querySelectorAll?.(".lm_tab")?.forEach(hookTab);
      }
    }
  });
  obs.observe(document.body, { subtree: true, childList: true });
  window.__tabDragHookObs = obs;

  async function installFromFile(file) {
    const name = parseModuleName(file.name);
    if (!name) {
      console.warn("[drop-in] filename doesn't match at_/d_ scheme:", file.name);
      return;
    }
    if (runtime.mains.has(name)) {
      console.warn("[drop-in] module already in mains:", name, "— skipping");
      return;
    }
    const src = await file.text();
    const blob = new Blob([src], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    let imported;
    try {
      imported = HAS_IMPORT_SHIM
        ? await window.importShim(url, `file://${name}`)
        : await import(url);
    } catch (e) { console.error("[drop-in] import failed:", e); return; }
    if (typeof imported.default !== "function") {
      console.warn("[drop-in] default export not a function"); return;
    }
    const newModule = runtime.module(imported.default);
    runtime.mains.set(name, newModule);
    ensureDomScriptTag(name, src);
    console.log("[drop-in] installed + DOM script:", name);
  }

  if (window.__dropInOver) document.body.removeEventListener("dragover", window.__dropInOver);
  if (window.__dropInDrop) document.body.removeEventListener("drop", window.__dropInDrop);
  window.__dropInOver = (e) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  window.__dropInDrop = (e) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    console.log("[drop-in] file dropped:", f?.name);
    if (f) installFromFile(f).catch(err => console.error("[drop-in] failed:", err));
  };
  document.body.addEventListener("dragover", window.__dropInOver);
  document.body.addEventListener("drop", window.__dropInDrop);

  return { mainsKeys: [...runtime.mains.keys()], grips: document.querySelectorAll(".lm_drag_out_grip").length };
})();
