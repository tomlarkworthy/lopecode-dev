const _13upker = function _1(md){return(
md`# Command Palette

Plugin-driven command palette. Press **Cmd+K** (Mac) or **Ctrl+K** to open.

\`\`\`js
import {commandPaletteOverlay, commandPaletteStyles, commandPaletteKeybinding} from "@tomlarkworthy/command-palette"
\`\`\`

## Registering a plugin

A plugin is a function \`(query: string) => Command[]\` where \`Command = {label, href, hint?, module?, badge?, snippet?, score?}\`. Plugins run on every keystroke; results are merged and sorted by \`score\` (descending).

\`\`\`js
import {viewof commands as commandsView} from "@tomlarkworthy/command-palette"
{
  const myPlugin = (q) => [{label: "Hello " + q, href: "#" + q, score: 100}];
  const unregister = commandsView.addCommand(myPlugin);
  invalidation.then(unregister);
}
\`\`\`

## Built-in plugins

- **Module finder** — type a module name to open it.
- **Cell search** — type to find cells across all loaded modules.`
)};
const _1eng7wy = function _commands(Inputs,Event)
{
    const input = Inputs.input([]);
    input.addCommand = function (plugin) {
        input.value.push(plugin);
        input.dispatchEvent(new Event('input'));
        return () => {
            const i = input.value.indexOf(plugin);
            if (i >= 0) {
                input.value.splice(i, 1);
                input.dispatchEvent(new Event('input'));
            }
        };
    };
    return input;
};
const _7bve6u = (G, _) => G.input(_);
const _bpk8h7 = function _searchIndex(liveCellMap,modules){return(
(() => {
    const index = [];
    for (const [mod, cells] of liveCellMap.entries()) {
        const moduleName = modules?.get(mod)?.name ?? '<unknown>';
        for (const cell of cells) {
            if (!cell.name && cell.type !== 'import')
                continue;
            let source = null;
            try {
                const v = cell.variables?.[0];
                if (v?._definition)
                    source = v._definition.toString();
            } catch (e) {
            }
            index.push({
                module: moduleName,
                name: cell.name ?? null,
                type: cell.type ?? 'simple',
                source
            });
        }
    }
    return index;
})()
)};
const _1ptnr90 = function _commandPaletteStyles(theme_assets,htl)
{
    theme_assets;
    return htl.html`<style>
.command-palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}
.command-palette-overlay[hidden] {
  display: none;
}
.command-palette-box {
  width: 600px;
  max-width: 90vw;
  background: var(--theme-background-b, var(--theme-background, white));
  color: var(--theme-foreground, #1a1a1a);
  border: 1px solid var(--theme-foreground-faintest, transparent);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  overflow: hidden;
  font-family: var(--sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
}
.command-palette-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  border: none;
  outline: none;
  border-bottom: 1px solid var(--theme-foreground-faintest, #eee);
  box-sizing: border-box;
}
.command-palette-results {
  max-height: 400px;
  overflow-y: auto;
}
.command-palette-result {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.command-palette-result:hover,
.command-palette-result.selected {
  background: color-mix(in srgb, var(--theme-foreground-focus, #1a73e8) 18%, transparent);
}
.command-palette-module {
  color: var(--theme-foreground-muted, #666);
  font-size: 12px;
  flex-shrink: 0;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-palette-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--theme-foreground, #1a1a1a);
}
.command-palette-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--theme-background-a, #f0f0f0);
  color: var(--theme-foreground-muted, #666);
  flex-shrink: 0;
}
.command-palette-hint-right {
  font-size: 11px;
  color: var(--theme-foreground-faint, #999);
  margin-left: auto;
  flex-shrink: 0;
}
.command-palette-snippet {
  font-family: var(--monospace, "Menlo", "Consolas", monospace);
  font-size: 11px;
  color: var(--theme-foreground-muted, #555);
  padding: 4px 16px 6px;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 3.6em;
  line-height: 1.4;
  border-bottom: 1px solid var(--theme-foreground-faintest, #f0f0f0);
  background: var(--theme-background, #fafafa);
}
.command-palette-snippet mark {
  background: color-mix(in srgb, var(--theme-foreground-focus, #fff3b0) 35%, transparent);
  color: var(--theme-foreground, #1a1a1a);
  border-radius: 2px;
  padding: 0 1px;
}
.command-palette-empty {
  padding: 16px;
  text-align: center;
  color: var(--theme-foreground-faint, #999);
  font-size: 14px;
}
.command-palette-hint {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--theme-foreground-faint, #999);
  border-top: 1px solid var(--theme-foreground-faintest, #eee);
  display: flex;
  gap: 16px;
}
.command-palette-hint kbd {
  background: var(--theme-background-a, #f0f0f0);
  color: var(--theme-foreground, inherit);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}
</style>`;
};
const _fomuvm = function _commandPaletteOverlay($0,Node,invalidation)
{
    const $commands = $0;
    let selectedIdx = 0;
    let results = [];
    const overlay = document.createElement('div');
    overlay.className = 'command-palette-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<div class="command-palette-box">
      <input class="command-palette-input" placeholder="Type a command..." autocomplete="off" />
      <div class="command-palette-results"></div>
      <div class="command-palette-hint">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>`;
    const input = overlay.querySelector('.command-palette-input');
    const resultsContainer = overlay.querySelector('.command-palette-results');
    function search(query) {
        if (!query || query.length < 1)
            return [];
        const plugins = $commands.value || [];
        let all = [];
        for (const plugin of plugins) {
            try {
                const out = plugin(query);
                if (Array.isArray(out))
                    all = all.concat(out);
            } catch (e) {
                console.error('[command-palette] plugin error:', e);
            }
        }
        all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        return all.slice(0, 50);
    }
    function render() {
        resultsContainer.innerHTML = '';
        if (results.length === 0 && input.value.length > 0) {
            resultsContainer.innerHTML = '<div class="command-palette-empty">No results found</div>';
            return;
        }
        results.forEach((r, i) => {
            const row = document.createElement('a');
            row.className = 'command-palette-result' + (i === selectedIdx ? ' selected' : '');
            row.href = r.href || '#';
            row.style.textDecoration = 'none';
            row.style.color = 'inherit';
            if (r.module) {
                const modSpan = document.createElement('span');
                modSpan.className = 'command-palette-module';
                modSpan.textContent = r.module;
                row.appendChild(modSpan);
            }
            const labelSpan = document.createElement('span');
            labelSpan.className = 'command-palette-label';
            labelSpan.textContent = r.label ?? '';
            row.appendChild(labelSpan);
            if (r.badge) {
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'command-palette-badge';
                badgeSpan.textContent = r.badge;
                row.appendChild(badgeSpan);
            }
            if (r.hint) {
                const hintSpan = document.createElement('span');
                hintSpan.className = 'command-palette-hint-right';
                hintSpan.textContent = r.hint;
                row.appendChild(hintSpan);
            }
            row.addEventListener('click', e => {
                e.preventDefault();
                close();
                window.location.href = row.href;
            });
            resultsContainer.appendChild(row);
            if (r.snippet) {
                const snippet = document.createElement('div');
                snippet.className = 'command-palette-snippet';
                if (i === selectedIdx)
                    snippet.style.background = '#eef4ff';
                if (typeof r.snippet === 'string') {
                    snippet.textContent = r.snippet;
                } else if (r.snippet instanceof Node) {
                    snippet.appendChild(r.snippet);
                }
                snippet.addEventListener('click', e => {
                    e.preventDefault();
                    close();
                    window.location.href = row.href;
                });
                resultsContainer.appendChild(snippet);
            }
        });
    }
    function open() {
        overlay.hidden = false;
        input.value = '';
        results = [];
        selectedIdx = 0;
        render();
        requestAnimationFrame(() => input.focus());
    }
    function close() {
        overlay.hidden = true;
        input.blur();
    }
    function navigateToSelected() {
        if (results[selectedIdx]) {
            const r = results[selectedIdx];
            close();
            window.location.href = r.href || '#';
        }
    }
    input.addEventListener('input', () => {
        results = search(input.value);
        selectedIdx = 0;
        render();
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIdx = Math.min(selectedIdx + 1, results.length - 1);
            render();
            const sel = resultsContainer.querySelector('.selected');
            if (sel)
                sel.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIdx = Math.max(selectedIdx - 1, 0);
            render();
            const sel = resultsContainer.querySelector('.selected');
            if (sel)
                sel.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            navigateToSelected();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    });
    overlay.addEventListener('click', e => {
        if (e.target === overlay)
            close();
    });
    invalidation.then(() => overlay.remove());
    overlay._openPalette = open;
    overlay._closePalette = close;
    overlay._isOpen = () => !overlay.hidden;
    return overlay;
};
const _mqy6k9 = function _commandPaletteKeybinding(cellSearchPlugin,moduleFinderPlugin,commandPaletteOverlay,invalidation)
{
  cellSearchPlugin;
  moduleFinderPlugin;
  const handler = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      e.stopPropagation();
      if (commandPaletteOverlay._isOpen()) {
        commandPaletteOverlay._closePalette();
      } else {
        commandPaletteOverlay._openPalette();
      }
    }
  };
  document.addEventListener("keydown", handler, true);
  invalidation.then(() =>
    document.removeEventListener("keydown", handler, true)
  );
  return null;
};
const _k261kj = function _cellSearchPlugin(searchIndex,linkTo,$0,invalidation)
{
  const plugin = (query) => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    const out = [];
    for (const entry of searchIndex) {
      let score = 0;
      let nameMatch = false;
      let sourceMatch = false;
      const name = String(entry.name ?? "").toLowerCase();
      const mod = String(entry.module ?? "").toLowerCase();
      if (name.length && name.startsWith(q)) {
        score += 150;
        nameMatch = true;
      } else if (name.length && name.includes(q)) {
        score += 100;
        nameMatch = true;
      }
      if (mod.includes(q)) {
        score += 50;
      }
      if (entry.source && String(entry.source).toLowerCase().includes(q)) {
        score += 10;
        sourceMatch = true;
      }
      if (score === 0) continue;
      const nameStr = String(entry.name ?? "");
      const modStr = String(entry.module ?? "");
      const href = linkTo(nameStr ? modStr + "#" + nameStr : modStr);
      let snippet = null;
      if (entry.source) {
        const src = String(entry.source);
        const idx = src.toLowerCase().indexOf(q);
        const frag = document.createDocumentFragment();
        if (idx >= 0) {
          const start = Math.max(
            0,
            src.lastIndexOf("\n", Math.max(0, idx - 40)) + 1
          );
          const endNL = src.indexOf("\n", idx + query.length + 40);
          const lineEnd =
            endNL < 0 ? Math.min(src.length, idx + query.length + 80) : endNL;
          const before = src.slice(start, idx);
          const match = src.slice(idx, idx + query.length);
          const after = src.slice(idx + query.length, lineEnd);
          if (start > 0)
            frag.appendChild(document.createTextNode("\u2026" + before));
          else frag.appendChild(document.createTextNode(before));
          const mark = document.createElement("mark");
          mark.textContent = match;
          frag.appendChild(mark);
          frag.appendChild(
            document.createTextNode(
              after + (lineEnd < src.length ? "\u2026" : "")
            )
          );
        } else {
          const firstLine = src.slice(0, src.indexOf("\n", 0));
          frag.appendChild(
            document.createTextNode((firstLine || src).slice(0, 120))
          );
        }
        snippet = frag;
      }
      out.push({
        label: nameStr || "(anonymous)",
        module: modStr,
        badge: entry.type && entry.type !== "simple" ? entry.type : null,
        hint: sourceMatch && !nameMatch ? "source" : null,
        snippet,
        href,
        score
      });
    }
    return out;
  };
  const unregister = $0.addCommand(plugin);
  invalidation.then(unregister);
  return "cell-search plugin registered";
};
const _lq3msy = function _moduleFinderPlugin(currentModules,linkTo,$0,invalidation)
{
  // Use the REACTIVE module set (module-map currentModules), not cell-map's one-shot `modules` snapshot,
  // so modules created live (e.g. by robocoop-4) are immediately findable. This cell recomputes whenever
  // currentModules changes; the old plugin is unregistered via invalidation before the new one registers.
  const plugin = (query) => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    const out = [];
    for (const [, info] of currentModules.entries()) {
      const name = info?.name ?? "";
      if (!name) continue;
      const lower = name.toLowerCase();
      let score = 0;
      if (lower === q) score = 1000;
      else if (lower.startsWith(q)) score = 800;
      else if (lower.includes(q)) score = 600;
      if (score === 0) continue;
      out.push({
        label: name,
        href: linkTo(name),
        hint: "open module",
        score
      });
    }
    return out;
  };
  const unregister = $0.addCommand(plugin);
  invalidation.then(unregister);
  return "module-finder plugin registered";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/themes", async () => runtime.module((await import("/@tomlarkworthy/themes.js?v=4")).default));  
  $def("_13upker", null, ["md"], _13upker);  
  $def("_1eng7wy", "viewof commands", ["Inputs","Event"], _1eng7wy);  
  $def("_7bve6u", "commands", ["Generators","viewof commands"], _7bve6u);  
  $def("_bpk8h7", "searchIndex", ["liveCellMap","modules"], _bpk8h7);  
  $def("_1ptnr90", "commandPaletteStyles", ["theme_assets","htl"], _1ptnr90);  
  $def("_fomuvm", "commandPaletteOverlay", ["viewof commands","Node","invalidation"], _fomuvm);  
  $def("_mqy6k9", "commandPaletteKeybinding", ["cellSearchPlugin","moduleFinderPlugin","commandPaletteOverlay","invalidation"], _mqy6k9);  
  $def("_k261kj", "cellSearchPlugin", ["searchIndex","linkTo","viewof commands","invalidation"], _k261kj);  
  $def("_lq3msy", "moduleFinderPlugin", ["currentModules","linkTo","viewof commands","invalidation"], _lq3msy);
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));
  main.define("viewof liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("viewof liveCellMap", _));  
  main.define("liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("liveCellMap", _));  
  main.define("modules", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("modules", _));  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("theme_assets", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("theme_assets", _));
  return main;
}