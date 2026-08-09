// The editor-5 swap: build the always-present cell shell with compileDataflow instead of
// cloneDataflow. One compilation for the whole module, one call per cell editor.
import { readFileSync, writeFileSync } from "node:fs";

const impl = readFileSync(new URL("./compile-dataflow.mjs", import.meta.url).pathname, "utf8")
  .replace(/^\/\/[^\n]*\n/gm, (m, off) => (off < 700 ? "" : m))
  .replace(/^export default [^\n]*\n/gm, "")
  .replace(/^export /gm, "")
  .trim();

const cells = [`compileDataflow = {\n${impl}\n\nreturn compileDataflow;\n}`];
const add = (s) => cells.push(s.trim());

// Compiled ONCE for the module. `frontier: "all"` puts `viewof edit`, `viewof editedCell` and
// `selectVariable` in the body, so every call constructs a fresh set — that is the per-instance
// state cloneDataflow gives you, minus the reactive variables.
add(`shellCompiled = compileDataflow(shellTemplate, {
  module: editorModule,
  outputs: ["hotbar_shell", "selectVariable", "viewof edit"],
  frontier: "all",
  live: false
})`);

// The toggle rebuild: same subgraph, but `viewof edit` is now a parameter so the instance keeps the
// view it already has listeners on. Only `edit` and `hotbar_shell` are recompiled.
add(`shellRebuild = compileDataflow(shellTemplate, {
  module: editorModule,
  inputs: ["viewof edit"],
  outputs: ["hotbar_shell"],
  live: false
})`);

add(`cellEditor = (variable, { pinned = undefined } = {}) => {
    const host = document.createElement('div');
    let heavyDispose = null;
    let editView = null;
    let shellEl = null;
    let body = null;
    const clearBody = () => {
        if (body) body.replaceChildren();
    };
    const closeHeavy = () => {
        if (heavyDispose) {
            heavyDispose();
            heavyDispose = null;
        }
        clearBody();
    };
    const openHeavy = () => {
        if (heavyDispose) return;
        if (!body) return;
        heavyDispose = cloneDataflow(editorTemplate, name => {
            if (name === 'editor_panel') {
                return {
                    fulfilled: element => {
                        if (!element) return;
                        if (!body) return;
                        if (body.firstChild !== element || body.childNodes.length !== 1) {
                            body.replaceChildren(element);
                        }
                    }
                };
            }
            if (name === 'selectVariable') {
                return {
                    fulfilled: selectVariable => {
                        if (typeof selectVariable !== 'function') return;
                        selectVariable(variable);
                    }
                };
            }
            return {};
        });
    };
    const syncOpen = () => {
        const open = !!(editView && editView.value);
        if (open) openHeavy();
        else closeHeavy();
        if (shellEl) {
            const bodyEl = shellEl.querySelector('.cell-editor-body');
            if (bodyEl) bodyEl.style.display = open ? 'block' : 'none';
        }
    };
    const mount = element => {
        if (!element) return;
        shellEl = element;
        host.replaceChildren(element);
        body = element.querySelector('.cell-editor-body');
        const hotbar = element.querySelector('.hotbar');
        if (hotbar && !hotbar.querySelector('.add-cell-btn')) {
            const add = document.createElement('span');
            add.className = 'add-cell-btn';
            add.textContent = '➕';
            add.title = 'Add cell below';
            add.style.cssText = 'cursor: pointer; margin-right: 6px;';
            add.tabIndex = -1;
            add.addEventListener('mousedown', e => e.preventDefault());
            add.addEventListener('click', e => {
                e.stopPropagation();
                createCell({ cell: findCell(variable) });
            });
            hotbar.prepend(add);
        }
        if (hotbar && !hotbar.dataset.reorderable) {
            hotbar.dataset.reorderable = '1';
            hotbar.style.cursor = 'grab';
            const grip = document.createElement('span');
            grip.className = 'reorder-grip';
            grip.textContent = '⠿';
            grip.title = 'Drag to reorder cell';
            grip.style.cssText = 'float: left; margin-left: 4px; opacity: 0.55;';
            hotbar.prepend(grip);
            dragReorder(variable, hotbar);
        }
        if (body) syncOpen();
    };
    let shellCtx = null;
    let rebuildCtx = null;
    (async () => {
        // .run() rather than a bare call: shellCompiled is ONE compilation shared by every cell
        // editor, so the lifetime we need to own is the call's context, not the function's.
        const call = await shellCompiled.run({});
        shellCtx = call.dispose;
        const built = call.outputs;
        editView = built['viewof edit'];
        if (typeof built.selectVariable === 'function') built.selectVariable(variable);
        const forceOpen = !!(variable?.pid && pinOnCreate.has(variable.pid));
        if (forceOpen) pinOnCreate.delete(variable.pid);
        editView.value = forceOpen || !!getOption(variable, 'pinned', pinned);
        editView.addEventListener('input', async () => {
            setOption(variable, 'pinned', !!editView.value);
            // The shell is a pure function of \`edit\`, so a toggle is a re-call, not a re-render.
            const call = await shellRebuild.run({ 'viewof edit': editView });
            if (rebuildCtx) rebuildCtx();
            rebuildCtx = call.dispose;
            mount(call.outputs.hotbar_shell);
        });
        // The label is a function of edit, and we only learned the pinned state after building.
        // With a clone the runtime would recompute; compiled, we re-call.
        const first = await shellRebuild.run({ 'viewof edit': editView });
        rebuildCtx = first.dispose;
        mount(first.outputs.hotbar_shell);
        if (shellCtx) { shellCtx(); shellCtx = null; }
    })();
    host.dispose = () => {
        closeHeavy();
        if (shellCtx) { shellCtx(); shellCtx = null; }
        if (rebuildCtx) { rebuildCtx(); rebuildCtx = null; }
    };
    return host;
}`);

writeFileSync(new URL("./cells.json", import.meta.url).pathname, JSON.stringify(cells, null, 2));
console.log(`${cells.length} cells`);
