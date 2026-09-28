const _1noor04 = function _1(md){return(
md`# Exporter 3

## [video explainer for exporter 2](https://www.youtube.com/watch?v=wx93r1pY_6Y)
`
)};
const _vpmotg = function _2(exporter,$0,Event){return(
exporter({
  output: out => {
    $0.value = out;
    $0.dispatchEvent(new Event('input'));
  }
})
)};
const _16yvadj = function _3(md,downloadAnchor,forkAnchor){return(
md`
Serialize literate computational notebooks with their dependancies into single ${ downloadAnchor({}, 'downloadable') } files. Double click to open locally. No server required, works in a \`file://\` context for simplicity.

- **File-first** representation. The [Observable Runtime](https://github.com/observablehq/runtime) and common builtins like \`Inputs\`, \`htl\`, \`highlight\`, \`_\` (lodash) and \`markdown\` are bundled for offline operation.
- **Recursive and self-sustaining**, the exporter is implemented in userspace and can be ${ forkAnchor({}, 'forked') } again after exporting.
- **Fast**, single file notebooks open fast!
- **Moldable**, the file format is uncompressed, readable, editable with a text editor, and diffable by Git. 
- **Runtime-as-the-source-of-truth**, format derived from the live [Obervable Runtime](https://github.com/observablehq/runtime) representation.
- **No sandboxing**, the notebook is rendered without an iframe
- **Custom bootloaders**, for control over the standard library
- **Userspace**, implementation is a normal notebook.

Exporter improves upon [exporter 2](https://observablehq.com/@tomlarkworthy/exporter-2) by refactoring out Observable Javascript concepts, it works on the low level reprentation directly, which has allowed us to added support for Notebook 2.0 syntax.

`
)};
const _xnho81 = function _4(md,forkAnchor,downloadAnchor){return(
md`## Usage Guide

To put the exporter in one of your notebooks, first import the UI builder. 
\`\`\`js
import {exporter, forkAnchor, exportAnchor } from '@tomlarkworthy/exporter'
\`\`\`

Then call the builder to make the UI. You don't need to pass any options, but the options is where you can customise the output format.
\`\`\`js
exporter({
  handler: (action, state) => {}, // Optional UI click handler
  style: undefined,// customer reference to a style DOM node or a string to insert as a style block
  output: (out) => {}, // hook to get result of exporting
  notebook_url: undefined,// hardcode the default notebook_url
})
\`\`\`


If you want to export without a UI, use the function \`exportToHTML\`, see the [example](https://observablehq.com/@tomlarkworthy/export-to-html-example)

\`\`\`js
import {exportToHTML } from '@tomlarkworthy/exporter'
\`\`\`

\`\`\`js
async function exportToHTML({
  mains = new Map(), // (name -> module) Map of main modules
  runtime = _runtime,
  options = {} // Object, export options, e.g. head, title
} = {})
\`\`\`

You can also just use inline anchor tags: ${ forkAnchor({}, 'forkAnchor()') } or ${ downloadAnchor({}, 'downloadAnchor()') }`
)};
const _lv8hyy = function _5(md){return(
md`## Lopecode HTML Format Specification


### Inline http responses
The HTML file contains \`<script>\` blocks that hold content to serve internal network requests locally.

~~~html
<script id="d/c2dae147641e012a@46" 
        type="text/plain"
        data-encoding="base64+gzip"
        data-mime="application/javascript"
>
...inline text or base64 string
</scr\ipt>
~~~

Requests to the URL matching the \`id\` are served locally, this includes \`import\`, \`fetch\`, \`XMLHttpRequest\` and \`<script>\` src attribute.
`
)};
const _1wae1tk = function _6(md){return(
md`### Main script

The main script loads the Observable runtime with no standard library and loads a bootloader module. The bootloader is responsible for setting up the standard library and loading the first real modules, which it discovers by reading the \`bootconf.json\`. \`@tomlarkworthy/bootloader\` is the default which comes with d3, Plot, md, htl and lodash local.
`
)};
const _mob2ng = function _7(md){return(
md`## Persisted Hash URL

To help carry state across an export, the URL hash parameter is remembered in the \`bootconf.json\` and set automatically when opening the file if one is not present. URLs are limited in size, ff you need to move large amount of data across an export, use a [local FileAttachment](https://observablehq.com/@tomlarkworthy/fileattachments) instead.`
)};
const _1n6u02c = function _8(md){return(
md`## Themes

Themes are sourced from NotebookKit. A theme is fetched *once* from Github once when switching themes, but integrated into the export, and reused locally on subsequent exports. This keeps the bundle small, and you only need a network connection if switching to obtain the new CSS source files.`
)};
const _17bj13d = function _9(disk_svg){return(
disk_svg()
)};
const _fl78rz = function _disk_svg(html){return(
fill => html`<svg ${ fill ? `fill="${ fill }" ` : '' }width="50px" height="50px" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect height="4" width="4" x="20" y="50"/><rect height="4" width="16" x="28" y="50"/><path d="M32,38a8,8,0,1,0-8-8A8.009,8.009,0,0,0,32,38Zm0-12a4,4,0,1,1-4,4A4,4,0,0,1,32,26Z"/><path d="M6,62H58a2,2,0,0,0,2-2V15a2,2,0,0,0-.586-1.414l-11-11A2,2,0,0,0,47,2H6A2,2,0,0,0,4,4V60A2,2,0,0,0,6,62Zm42-4H16V46H48ZM16,6H31v4h4V6h4v8H16ZM8,6h4V16a2,2,0,0,0,2,2H41a2,2,0,0,0,2-2V6h3.172L56,15.829V58H52V44a2,2,0,0,0-2-2H14a2,2,0,0,0-2,2V58H8Z"/></svg>`
)};
const _ibwdcx = function _11(md){return(
md`## Implementation`
)};
const _1p4bp3o = function _exporter(actionHandler,css,keepalive,exporter_module,variable,domView,view,disk_svg,linkTo,Inputs,themes,$0)
{
  return ({handler = actionHandler, style = css, output = out => {
    }, debug = false} = {}) => {
    keepalive(exporter_module, 'futureExportedState');
    const handlerVar = variable(handler);
    const feedback = domView();
    // prerender defaults ON; only an explicit "prerender": false in bootconf turns it off
    let prerenderDefault = true;
    // headless picks the page's observer, which is a separate question from what is in mains.
    // A frame main (lopepage-2) mounts the page itself, so the inspector must stay OFF or it
    // renders every cell into <body> a second time; a bare module has no frame and needs the
    // inspector or the export is blank. Neither is derivable from the other, so it is a control.
    // Default to what this notebook booted with. On observablehq.com there is no bootconf, and the
    // export now defaults to the lopepage-2 frame (defaultExportOptions), so the inspector has to
    // default OFF alongside it. Measured 2026-09-23: a default export from observablehq.com shipped
    // "headless": false WITH lopepage-2 in mains, and rendered every cell into <body> underneath
    // the frame. The toggle always sends an explicit boolean, so exportToHTML's `headless == null`
    // branch can never fire from this UI -- the default belongs HERE, where the control is built.
    let headlessDefault = false;
    // Same reason as headless: defaultExportOptions supplies the frame at export time, so the box
    // read empty while the export shipped lopepage-2 anyway -- the user could not see the default
    // and typed it in again. Show it in the control instead. Note this makes the export take the
    // `additionalMains.length` path in defaultExportOptions, which then adds no headless; that is
    // only safe because headlessDefault above already decides headless at this same control.
    let additionalMainsDefault = '';
    try {
      const conf = JSON.parse(new window.TextDecoder().decode(window.lopecode.contentSync('bootconf.json').bytes));
      if (conf.prerender === false)
        prerenderDefault = false;
      if (conf.headless === true)
        headlessDefault = true;
    } catch (e) {
      // No bootconf at all: the observablehq.com path, which gets the frame by default.
      headlessDefault = true;
      additionalMainsDefault = '@tomlarkworthy/lopepage-2';
    }
    const options = {
      style,
      output,
      debug
    };
    const spinner = async (...args) => {
      try {
        ui.querySelector('.disk-image').classList.add('spinning');
        await handler(...args, cb => feedback.value = cb);
        ui.querySelector('.disk-image').classList.remove('spinning');
      } catch (e) {
        ui.querySelector('.disk-image').classList.remove('spinning');
        throw e;
      }
    };
    const ui = view`<div class="moldbook-exporter" style="max-width: 440px;">
    <style>
      .moldbook-exporter {
        margin: 4px;
        padding: 6px 8px;
        background: var(--theme-background-alt);
        fill: var(--theme-foreground);
        color: var(--theme-foreground);
        border-radius: 6px;
      }
      .moldbook-exporter .disk-image svg { width: 38px; height: 38px; display: block; }
      .moldbook-exporter button {
        background: var(--theme-foreground-focus);
        color: var(--theme-background);
        height: 22px;
        border-radius: 3px;
      }
      .moldbook-exporter input[type=text] { width: 100%; }
      .moldbook-exporter form {
        width: auto;
        background: var(--theme-background);
        color: var(--theme-foreground);
      }
      .moldbook-exporter a.moldbook-target { color: var(--theme-foreground-focus); font-weight: 600; text-decoration: none; }
      .moldbook-exporter a.moldbook-target:hover { text-decoration: underline; }
      .moldbook-exporter summary.moldbook-topline {
        display: flex;
        align-items: baseline;
        gap: 8px;
        cursor: pointer;
        user-select: none;
        list-style: none;
      }
      .moldbook-exporter summary.moldbook-topline::-webkit-details-marker { display: none; }
      .moldbook-exporter .moldbook-options-hint { color: var(--theme-foreground-focus); opacity: 0.85; font-size: 13px; }
      .moldbook-exporter .moldbook-options-hint::before { content: '▸'; margin-right: 3px; }
      .moldbook-exporter details[open] .moldbook-options-hint::before { content: '▾'; }
      .moldbook-exporter .moldbook-advanced-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 6px 2px 2px;
      }
      @keyframes spin {
        from { transform: rotateY(0deg); }
        to { transform: rotateY(180deg); }
      }
      .moldbook-exporter .spinning {
        transform-style: preserve-3d;
        animation-name: spin;
        animation-duration: 0.2s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        animation-direction: alternate;
      }
    </style>
    ${ [
      'handler',
      handlerVar
    ] }
    <div style="display: flex; align-items: flex-start; gap: 8px;">
      <div class="disk-image">${ disk_svg() }</div>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
        <details class="moldbook-options">
          <summary class="moldbook-topline">
            <a class="moldbook-target" href="${ linkTo('@tomlarkworthy/exporter-3') }">fork notebook</a>
            <span style="flex: 1"></span>
            <span class="moldbook-options-hint">options</span>
          </summary>
          <div class="moldbook-advanced-body">
            ${ [
      'prerender',
      Inputs.toggle({
        label: 'prerender',
        value: prerenderDefault
      })
    ] }
            ${ [
      'headless',
      Inputs.toggle({
        label: 'headless',
        value: headlessDefault
      })
    ] }
            ${ [
      'theme',
      Inputs.bind(Inputs.select(themes, { label: 'theme' }), $0)
    ] }
            ${ [
      'bootloader',
      Inputs.text({
        label: 'bootloader',
        value: '@tomlarkworthy/bootloader',
        placeholder: '@tomlarkworthy/bootloader'
      })
    ] }
            ${ [
      'additionalMains',
      Inputs.text({
        label: 'extra mains',
        value: additionalMainsDefault,
        placeholder: '@tomlarkworthy/lopepage-2'
      })
    ] }
          </div>
        </details>
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
          ${ [
      'copyjs',
      Inputs.button('Copy as JS', { reduce: () => spinner('copyjs', ui.value, options) })
    ] }
          ${ [
      'blob',
      Inputs.button('Fork', { reduce: () => spinner('tab', ui.value, options) })
    ] }
          ${ [
      'html',
      Inputs.button('Download', { reduce: () => spinner('file', ui.value, options) })
    ] }
        </div>
      </div>
    </div>
    <div>${ feedback }</div>
  </div>`;
    // keep the "fork notebook" link navigable without toggling the <details>
    ui.querySelector('.moldbook-target')?.addEventListener('click', e => e.stopPropagation());
    return ui;
  };
};
const _14mjs7h = function _copyTextToClipboard(globalThis){return(
async text => {
  text = String(text ?? '');
  if (globalThis.navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok)
    throw new Error('Clipboard copy failed (no navigator.clipboard and execCommand failed)');
  return true;
}
)};
const _1sbph8c = function _htmlToConsoleSnippet(utf8ToBase64){return(
(html, {title = 'Observable notebook', zIndex = 2147483647} = {}) => {
  const b64 = utf8ToBase64(html);
  const safeTitle = String(title).replace(/`/g, '\\`');
  return `(async () => {
  const b64 = "${ b64 }";
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const html = new TextDecoder().decode(bytes);

  const z = ${ Math.max(0, Math.min(2147483647, zIndex | 0)) };

  const host = document.createElement("div");
  host.setAttribute("data-lopecode-notebook", ${ JSON.stringify(safeTitle) });
  Object.assign(host.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    bottom: "12px",
    width: "calc(50vw - 12px)",
    maxWidth: "1100px",
    minWidth: "360px",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 24px 90px rgba(0,0,0,0.35)",
    overflow: "hidden",
    zIndex: String(z),
    pointerEvents: "auto"
  });

  const topbar = document.createElement("div");
  Object.assign(topbar.style, {
    position: "absolute",
    left: "0",
    right: "0",
    top: "0",
    height: "46px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "8px",
    gap: "8px",
    background: "linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,0.75))",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    zIndex: String(z + 1)
  });

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close");
  Object.assign(close.style, {
    width: "34px",
    height: "34px",
    borderRadius: "17px",
    border: "1px solid rgba(0,0,0,0.18)",
    background: "rgba(255,255,255,0.98)",
    fontSize: "22px",
    lineHeight: "30px",
    cursor: "pointer"
  });

  const iframe = document.createElement("iframe");
  iframe.title = ${ JSON.stringify(safeTitle) };
  iframe.setAttribute("referrerpolicy", "no-referrer");
  Object.assign(iframe.style, {
    position: "absolute",
    left: "0",
    right: "0",
    top: "46px",
    bottom: "0",
    width: "100%",
    height: "calc(100% - 46px)",
    border: "0",
    background: "#fff"
  });

  close.addEventListener("click", () => host.remove());

  topbar.appendChild(close);
  host.appendChild(iframe);
  host.appendChild(topbar);
  (document.body || document.documentElement).appendChild(host);

  iframe.srcdoc = html;
})();`;
}
)};
const _1w6fc3k = function _exportAnchor(Node,notebook_name,main,_runtime,exportToHTML,location,getCompactISODate){return(
(action, attrs = {}, label = action, exportOpts = {}) => {
  const a = document.createElement('a');
  const {href = '#', title, className, style, target, rel, ...rest} = attrs ?? {};
  a.href = href;
  if (title != null)
    a.title = title;
  if (className != null)
    a.className = className;
  if (style != null)
    a.setAttribute('style', style);
  if (target != null)
    a.target = target;
  if (rel != null)
    a.rel = rel;
  for (const [k, v] of Object.entries(rest)) {
    if (v == null)
      continue;
    if (k.startsWith('on') && typeof v === 'function')
      continue;
    try {
      a.setAttribute(k, String(v));
    } catch {
    }
  }
  if (label instanceof Node)
    a.appendChild(label);
  else
    a.textContent = label == null ? '' : String(label);
  const clickHandler = async event => {
    event.preventDefault();
    event.stopPropagation();
    if (a.dataset.busy === '1')
      return;
    a.dataset.busy = '1';
    const prevAriaBusy = a.getAttribute('aria-busy');
    a.setAttribute('aria-busy', 'true');
    const prevPointerEvents = a.style.pointerEvents;
    const prevOpacity = a.style.opacity;
    a.style.pointerEvents = 'none';
    a.style.opacity = '0.6';
    let blobUrl = null;
    try {
      const mains = exportOpts.mains ?? (notebook_name ? new Map([[
          notebook_name,
          main
        ]]) : _runtime.mains);
      const runtime = exportOpts.runtime ?? _runtime;
      const title = exportOpts.title ?? [...mains.keys()][0] ?? 'notebook';
      const bootloader = exportOpts.bootloader ?? '@tomlarkworthy/bootloader';
      const appendHash = exportOpts.appendHash ?? true;
      const resp = await exportToHTML({
        mains,
        runtime,
        options: {
          title,
          bootloader,
          ...exportOpts.options ?? {},
          ...exportOpts.theme != null ? { theme: exportOpts.theme } : null,
          ...exportOpts.style != null ? { style: exportOpts.style } : null,
          ...exportOpts.head != null ? { head: exportOpts.head } : null,
          ...exportOpts.headless != null ? { headless: exportOpts.headless } : null,
          ...exportOpts.hash != null ? { hash: exportOpts.hash } : null
        }
      });
      const html = resp?.source ?? resp;
      blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (action === 'tab' || action === 'fork') {
        const hash = exportOpts.hash ?? location.hash ?? '';
        window.open(blobUrl + (appendHash ? hash : ''), '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else if (action === 'download' || action === 'file') {
        const filename = exportOpts.filename ?? `${ title }_${ getCompactISODate() }.html`;
        const dl = document.createElement('a');
        dl.href = blobUrl;
        dl.download = filename;
        dl.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } else {
        throw new Error(`Unknown export action: ${ action }`);
      }
    } finally {
      a.dataset.busy = '0';
      if (prevAriaBusy == null)
        a.removeAttribute('aria-busy');
      else
        a.setAttribute('aria-busy', prevAriaBusy);
      a.style.pointerEvents = prevPointerEvents;
      a.style.opacity = prevOpacity;
    }
  };
  a.addEventListener('click', clickHandler);
  if (typeof attrs?.onclick === 'function') {
    const userHandler = attrs.onclick;
    a.addEventListener('click', e => userHandler(e));
  }
  return a;
}
)};
const _1u2ju69 = function _forkAnchor(exportAnchor){return(
(attrs = {}, label = 'fork', exportOpts = {}) => exportAnchor('tab', attrs, label, exportOpts)
)};
const _1a8n42w = function _downloadAnchor(exportAnchor){return(
(attrs = {}, label = 'download', exportOpts = {}) => exportAnchor('download', attrs, label, exportOpts)
)};
const _4zsqot = function _actionHandler(Inputs,getSourceModule,notebook_name,_runtime,exportToHTML,htmlToConsoleSnippet,copyTextToClipboard,view,linkTo,location,getCompactISODate,parseAdditionalMains)
{
  return async (action, state, options, feedback_callback) => {
    feedback_callback(Inputs.textarea({ value: `Generating source...\n` }));
    const {notebook, module, runtime} = await getSourceModule(state);
    const mains = notebook_name ? new Map([[
        notebook,
        module
      ]]) : _runtime.mains;
    let title = [...mains.keys()][0];
    try {
      const r = window.lopecode.contentSync('bootconf.json');
      const b = JSON.parse(new window.TextDecoder().decode(r.bytes)).mains[0];
      if (!notebook_name && mains.has(b))
        title = b;
    } catch (e) {
    }
    const additionalMains = parseAdditionalMains(state.additionalMains);
    const response = await exportToHTML({
      mains,
      runtime,
      options: {
        bootloader: state.bootloader,
        title,
        ...state.prerender != null ? { prerender: state.prerender } : null,
        ...state.headless != null ? { headless: state.headless } : null,
        ...additionalMains.length ? { additionalMains } : null,
        ...options
      }
    });
    if (options.output)
      options.output(response);
    const {source, report} = response;
    if (action === 'copyjs') {
      const snippet = htmlToConsoleSnippet(source, { title });
      await copyTextToClipboard(snippet);
      feedback_callback(view`<div style="padding: 8px;">
      <div><b>Copied</b> JS snippet to clipboard.</div>
      <div style="opacity: 0.75; font-size: 12px;">Paste into a JS console to inject the notebook as a full-screen overlay.</div>
    </div>`);
      return;
    }
    const url = URL.createObjectURL(new Blob([source], { type: 'text/html' }));
    // The report table doubles as a table of contents: the notebook's own openable
    // modules (@user/module, not versioned npm deps or the observablehq namespace)
    // render their `id` as a link that opens that module in the live layout via the
    // lopepage "open" intent; everything else stays plain text.
    const isOpenableModule = id => typeof id === 'string' && /^@[^@/\s]+\/[^@/\s]+$/.test(id) && !id.startsWith('@observablehq/');
    feedback_callback(view`
    <center><a href="${ url }" target="_blank">export</a></center>
    ${ Inputs.table(report.filter(f => !f.file), {
      columns: [
        'id',
        'size'
      ],
      width: {
        id: '80%',
        size: '20%'
      },
      format: {
        id: id => {
          if (!isOpenableModule(id))
            return id;
          const a = document.createElement('a');
          a.textContent = id;
          a.href = linkTo({ open: id });
          a.style.color = 'var(--theme-foreground-focus)';
          return a;
        }
      },
      sort: 'size',
      reverse: true
    }) }
  `);
    if (action === 'tab') {
      window.open(url + location.hash, '_blank');
    } else if (action === 'file') {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ title }_${ getCompactISODate() }.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
};
const _lhn762 = function _exportToHTML(_runtime,cssForTheme,css,location,keepalive,exporter_module,$0,additionalMainUrl,resolveHeadless,defaultExportOptions,defaultViewHash,resolveExportHash,Runtime){return(
async function exportToHTML({mains = new Map(), runtime = _runtime, options = {}} = {}) {
        // Callers hand in the LIVE runtime.mains (actionHandler does exactly that) and
        // everything below adds to this map — the extra mains especially. Mutating it writes an
        // additionalMain permanently into the host's own mains, so it rides along in every
        // later export of this notebook; that is the same contamination the scratch runtime
        // exists to prevent, arriving by a second route. The export reads task.mains, not the
        // caller's object, so a copy costs nothing.
        mains = new Map(mains);
        let conf = { headless: false };
        // Track the FAILURE, not the value: a missing bootconf and a bootconf saying
        // "headless": false both leave conf.headless falsey, and only the first should get defaults.
        let hasBootconf = true;
        try {
            conf = (await import('file://bootconf.json')).default;
        } catch (_) {
            hasBootconf = false;
        }
        {
            // No bootconf and nothing asked for: exporting from observablehq.com produced a bare
            // stack of inspector output with no frame. Supply the frame and headless the corpus
            // already uses everywhere, and only then.
            const d = defaultExportOptions({
                hasBootconf,
                additionalMains: options.additionalMains,
                headless: options.headless
            });
            if (d.additionalMains)
                options = { ...options, additionalMains: d.additionalMains };
            if (d.headless != null)
                options = { ...options, headless: d.headless };
        }
        if (runtime.module_names) {
            runtime.mains.forEach((name, module) => mains.set(name, module));
        }
        // Extra mains the caller wants in the export; what they are is none of our business.
        // They load into a SCRATCH runtime, never the live one. Instantiating into the page's
        // own runtime injected 1935 variables for a single extra main (measured on
        // blog-netlify-deployment-manager, 2026-09-21) and, because runtime.mains is folded
        // into mains above, that extra main then rode along in every later export of the host.
        // Additional mains are roots rather than dependencies of the host, so nothing in the
        // live runtime bridges into them and isolating them severs no references.
        if (options.additionalMains?.length) {
            const iso = new Runtime();
            // Carry across the host runtime's own function properties; a bootloader puts some there.
            // This does NOT supply fileAttachments — measured 2026-09-24 on old.observablehq.com,
            // the host carries it on its PROTOTYPE (own property: false) and this Runtime class does
            // not have it at all, so an attachment-owning module instantiated here throws
            // "runtime.fileAttachments is not a function" inside its own define. That is why the
            // stub repair in moduleNames builds a runtime from the HOST's class instead of this one.
            for (const k of Object.getOwnPropertyNames(runtime)) {
                if (typeof runtime[k] === 'function' && typeof iso[k] !== 'function')
                    iso[k] = runtime[k];
            }
            const isolatedMains = new Map();
            for (const spec of options.additionalMains) {
                const { default: define } = await import(additionalMainUrl(spec));
                isolatedMains.set(spec, iso.module(define, () => ({})));
            }
            // Nothing forces the bridges here. moduleNames runs moduleMap(iso, …) over this
            // runtime, and moduleMap's module_definition_variables IS the batch force-load: it
            // awaits importedModule(v) for every import cell and loops while the count grows, so
            // nested imports arrive too. Forcing here as well only puts a second, weaker fixpoint
            // in front of the real one — a hand-rolled _definition() loop left 3 of 146 bridges
            // stuck on blog-netlify-deployment-manager, which moduleMap resolves.
            options.isolatedRuntime = iso;
            options.isolatedMains = isolatedMains;
            isolatedMains.forEach((mod, name) => mains.set(name, mod));
        }
        if (!options.bootloader) {
            options.bootloader = '@tomlarkworthy/bootloader';
        }
        options.headless = resolveHeadless(options.headless, conf.headless);
        if (options.tick == null) {
            options.tick = conf.tick;
        }
        if (options.tickDelayMs == null) {
            options.tickDelayMs = conf.tickDelayMs;
        }
        // Prerender defaults ON (matching the exporter UI toggle); only an explicit
        // "prerender": false in bootconf.json turns it off. Flag persists across re-exports.
        if (options.prerender == null) {
            options.prerender = conf.prerender !== false;
        }
        // Snapshot the live lopepage-2 DOM (only when exporting this running notebook).
        // The snapshot keeps its id="lopepage-2" and scoped styles unchanged; book() emits it
        // as light DOM (so parsers read it) and hoists it into a shadow root before boot, so
        // it is invisible to the runtime's document queries (otherwise duplicated
        // editors/inputs corrupt the boot).
        if (options.prerender && runtime === _runtime && options.prerenderHTML == null) {
            try {
                const src = document.getElementById('lopepage-2');
                if (src) {
                    const clone = src.cloneNode(true);
                    clone.querySelectorAll('script').forEach(s => s.remove());
                    // Styles the snapshot needs but does not contain: Observable Inputs injects
                    // #observable-inputs-style into document.head, which neither reaches the
                    // shadow root the snapshot is hoisted into nor exists at all with JS off. So
                    // prerendered forms rendered as bare browser defaults and restyled on swap.
                    // Carry head styles in with the clone; skip our own overlay rule.
                    const headCss = [...document.head.querySelectorAll('style')].filter(s => s.id !== 'lope-prerender-style').map(s => s.outerHTML).join('\n');
                    options.prerenderHTML = headCss + clone.outerHTML;
                }
            } catch (_) {
            }
        }
        if (options.theme) {
            options.style = await cssForTheme(options.theme);
        }
        if (!options.style) {
            options.style = css;
        }
        // An empty hash makes lopepage-2 skip (lp2_syncFromUrl returns {status:'skipped'}), so the
        // child opens on lp2Model's hardcoded runtime-sdk + visualizer rather than the notebook it
        // was exported from. Four sources, most specific first -- see resolveExportHash.
        options.hash = resolveExportHash({
            optionHash: options.hash,
            locationHash: location.hash,
            confHash: conf.hash,
            hasBootconf,
            defaultHash: defaultViewHash([...mains.keys()], options.additionalMains)
        });
        if (runtime === _runtime) {
            try {
                const ogContent = sel => document.querySelector(sel)?.getAttribute('content')?.trim() || undefined;
                if (options.description == null)
                    options.description = ogContent('meta[property="og:description"]') || ogContent('meta[name="description"]');
                if (options.image == null)
                    options.image = ogContent('meta[property="og:image"]');
                // Preserve arbitrary <meta> across re-export (at:*, twitter:*, keywords,
                // theme-color, custom module metadata, …). Skip charset/viewport and the
                // og/description tags lopebook regenerates from title/description/image.
                // Merge, don't replace: caller-supplied options.metas win for any key they
                // define; scanned tags for every other key are preserved. Repeatable keys
                // (at:alternate, at:author) survive via full key+content dedup.
                const managed = new Set(['viewport', 'og:title', 'og:type', 'og:description', 'description', 'og:image']);
                const provided = Array.isArray(options.metas) ? options.metas : [];
                const ownedKeys = new Set(provided.map(m => m.key));
                const seen = new Set(provided.map(m => `${ m.key }\n${ m.content }`));
                const merged = [...provided];
                for (const el of document.head.querySelectorAll('meta[property], meta[name]')) {
                    const key = el.getAttribute('property') || el.getAttribute('name');
                    const content = el.getAttribute('content');
                    if (key == null || content == null || managed.has(key) || ownedKeys.has(key)) continue;
                    const dedup = `${ key }\n${ content }`;
                    if (seen.has(dedup)) continue;
                    seen.add(dedup);
                    merged.push({ key, isProperty: el.hasAttribute('property'), content });
                }
                if (merged.length) options.metas = merged;
            } catch (_) {
            }
        }
        keepalive(exporter_module, 'tomlarkworthy_exporter_task');
        const response = await $0.send({
            mains,
            runtime,
            options
        });
        return response;
    }
)};
const _amurl1 = function _additionalMainUrl(){return(
function additionalMainUrl(spec) {
  // Callers name a main `@ns/slug`; choosing the URL is ours. This is the form Notebook Kit
  // compiles an Observable import to, which is what makes it the canonical external 1.0
  // spelling rather than one of several. It is public and serves
  // `access-control-allow-origin: *`, so it works cross-origin from new.observablehq.com —
  // unlike /api/import/@ns/slug, which is internal and answers 403.
  //
  // No `resolutions` pin: the served document already pins its own closure (lopepage-2 and the
  // editor-5 it pulls both carried resolutions=f2dac8191520a531@4033), so a pin adds nothing
  // and a DIFFERENT pin would split module identity against a copy the page already holds.
  if (/^(https?:)?\/\//.test(spec) || spec.startsWith("/")) return spec;
  return `https://api.observablehq.com/${spec}.js?v=4`;
}
)};
const _amurl2 = function _test_additionalMainUrl_expands_a_slug(expect,additionalMainUrl)
{
  expect(additionalMainUrl("@tomlarkworthy/lopepage-2")).toBe(
    "https://api.observablehq.com/@tomlarkworthy/lopepage-2.js?v=4"
  );
  return "ok";
};
const _amurl3 = function _test_additionalMainUrl_passes_a_url_through(expect,additionalMainUrl)
{
  // The escape hatch for a module that is not on Observable at all — canonical.json records
  // several as `upstream: null`, and those can only ever be named by URL.
  const u = "https://example.com/mod.js";
  expect(additionalMainUrl(u)).toBe(u);
  expect(additionalMainUrl("/@tomlarkworthy/lopepage-2.js?v=4")).toBe("/@tomlarkworthy/lopepage-2.js?v=4");
  return "ok";
};
const _amurl4 = function _test_additionalMainUrl_leaves_no_resolutions_pin(expect,additionalMainUrl)
{
  // Pinning is the thing that splits one slug into several module instances; assert we emit none.
  expect(additionalMainUrl("@tomlarkworthy/runtime-sdk").includes("resolutions")).toBe(false);
  return "ok";
};
const _dvh1 = function _defaultViewHash(){return(
function defaultViewHash(mainNames, additionalMains = []) {
  // lopepage-2 SKIPS an empty hash -- lp2_syncFromUrl returns {status:'skipped'} when there is no
  // view=/open=/close= -- leaving its hardcoded initial lp2Model, a 50/50 row of runtime-sdk and
  // visualizer. Measured 2026-09-23: a default export from observablehq.com shipped "hash": "" and
  // the child opened on those two modules instead of the notebook it came from.
  // Frame mains are chrome, not content, so name the first main that is not one.
  const extra = new Set(additionalMains);
  const primary = (mainNames || []).find(n => !extra.has(n));
  return primary ? `#view=R100(S100(${ primary }))` : '';
}
)};
const _dvh2 = function _test_defaultViewHash_names_the_exported_notebook(expect,defaultViewHash)
{
  // the observablehq.com shape: the notebook first, the defaulted frame appended after it
  expect(defaultViewHash(["@u/nb", "@tomlarkworthy/lopepage-2"], ["@tomlarkworthy/lopepage-2"]))
    .toBe("#view=R100(S100(@u/nb))");
  return "ok";
};
const _dvh3 = function _test_defaultViewHash_uses_the_round_tripping_spelling(expect,defaultViewHash)
{
  // R100(S100(<module>)) is what lp2_serializeDSL(lp2_parseDSL(x)) returns unchanged, checked
  // against the live parser 2026-09-23. A weight-prefixed leaf, R100(S100(100@u/nb)), parses but
  // serialises back without the 100, so it does NOT round-trip. Asserted here rather than by
  // calling the parser: importing lopepage-2 into exporter-3 would add a cross-module dependency
  // that embedding notebooks need not carry.
  expect(defaultViewHash(["@u/nb"], [])).toBe("#view=R100(S100(@u/nb))");
  return "ok";
};
const _dvh4 = function _test_defaultViewHash_has_nothing_to_name(expect,defaultViewHash)
{
  // only a frame, or nothing at all -> no hash, and the pre-existing behaviour stands
  expect(defaultViewHash(["@tomlarkworthy/lopepage-2"], ["@tomlarkworthy/lopepage-2"])).toBe("");
  expect(defaultViewHash([], [])).toBe("");
  return "ok";
};
const _reh1 = function _resolveExportHash(){return(
function resolveExportHash({optionHash, locationHash, confHash, hasBootconf, defaultHash}) {
  // A blob: fork is an opaque origin, and there the bootloader's `location.hash = conf.hash` is a
  // silent no-op -- lopepage-2's lp2_setHash documents the same failure ("fails the same-origin
  // check and drops every layout-to-URL update") and routes around it via history.replaceState.
  // So a child can boot on its bootconf layout while location.hash stays empty; exporting from
  // that child captured "" and the grandchild regressed to lp2Model's hardcoded runtime-sdk +
  // visualizer. Measured 2026-09-24: file:// reproduced nothing, because the write succeeds there.
  // Inheriting confHash is what makes the fork chain survive past the first generation.
  if (optionHash) return optionHash;
  if (locationHash) return locationHash;
  if (confHash) return confHash;
  // Nothing to inherit from: the observablehq.com path. Gated on hasBootconf so re-exporting any
  // of the 243 corpus notebooks, which carry their own hash, is untouched.
  return hasBootconf ? '' : defaultHash || '';
}
)};
const _reh2 = function _test_resolveExportHash_inherits_the_notebooks_own_hash(expect,resolveExportHash)
{
  // the reported regression: a blob: child booted on its bootconf but location.hash never took
  expect(resolveExportHash({
    optionHash: '', locationHash: '', confHash: '#view=R100(S100(@u/nb))',
    hasBootconf: true, defaultHash: '#view=R100(S100(@other/x))'
  })).toBe('#view=R100(S100(@u/nb))');
  return "ok";
};
const _reh3 = function _test_resolveExportHash_prefers_the_live_location(expect,resolveExportHash)
{
  // a user who navigated the layout exports what they are looking at, not what they booted with
  expect(resolveExportHash({
    optionHash: '', locationHash: '#view=R100(S100(@live/now))', confHash: '#view=R100(S100(@u/nb))',
    hasBootconf: true, defaultHash: ''
  })).toBe('#view=R100(S100(@live/now))');
  expect(resolveExportHash({
    optionHash: '#view=R100(S100(@explicit/x))', locationHash: '#view=R100(S100(@live/now))',
    confHash: '#view=R100(S100(@u/nb))', hasBootconf: true, defaultHash: ''
  })).toBe('#view=R100(S100(@explicit/x))');
  return "ok";
};
const _reh4 = function _test_resolveExportHash_defaults_only_without_config(expect,resolveExportHash)
{
  // observablehq.com: nothing anywhere, so name the exported notebook
  expect(resolveExportHash({
    optionHash: '', locationHash: '', confHash: undefined,
    hasBootconf: false, defaultHash: '#view=R100(S100(@u/nb))'
  })).toBe('#view=R100(S100(@u/nb))');
  // a configured notebook that genuinely has no hash keeps having none
  expect(resolveExportHash({
    optionHash: '', locationHash: '', confHash: undefined,
    hasBootconf: true, defaultHash: '#view=R100(S100(@u/nb))'
  })).toBe('');
  return "ok";
};
const _dm1 = function _defaultExportOptions(){return(
function defaultExportOptions({hasBootconf, additionalMains, headless}) {
  // Exporting from observablehq.com there is no bootconf and no extra mains, so the export had no
  // frame and no headless flag: it opened as a bare stack of inspector output. Every one of the 243
  // corpus notebooks already carries a lopepage main and headless:true, so this default only ever
  // fires on that no-config path and leaves configured exports byte-identical.
  // "absence of mains AND config" -- both, not either. A user who typed extra mains on
  // observablehq.com has said what they want the export to boot, and must not silently also get
  // headless:true they never asked for.
  const out = {};
  if (hasBootconf) return out;
  if (additionalMains && additionalMains.length) return out;
  out.additionalMains = ["@tomlarkworthy/lopepage-2"];
  if (headless == null)
    out.headless = true;
  return out;
}
)};
const _dm2 = function _test_defaultExportOptions_only_without_config(expect,defaultExportOptions)
{
  // a notebook with a bootconf decides for itself; nothing is added
  expect(defaultExportOptions({hasBootconf: true, additionalMains: [], headless: null})).toEqual({});
  expect(defaultExportOptions({hasBootconf: true, additionalMains: ["@a/b"], headless: false})).toEqual({});
  return "ok";
};
const _dm3 = function _test_defaultExportOptions_supplies_frame_and_headless(expect,defaultExportOptions)
{
  // the observablehq.com case: no bootconf, nothing typed
  expect(defaultExportOptions({hasBootconf: false, additionalMains: [], headless: null})).toEqual({
    additionalMains: ["@tomlarkworthy/lopepage-2"],
    headless: true
  });
  return "ok";
};
const _dm4 = function _test_defaultExportOptions_respects_what_the_caller_said(expect,defaultExportOptions)
{
  // an explicit choice always wins over the default, in both directions
  // mains supplied -> the caller has configured the export; nothing is added, headless included
  expect(defaultExportOptions({hasBootconf: false, additionalMains: ["@x/y"], headless: false})).toEqual({});
  expect(defaultExportOptions({hasBootconf: false, additionalMains: ["@x/y"], headless: null})).toEqual({});
  expect(defaultExportOptions({hasBootconf: false, additionalMains: [], headless: false})).toEqual({
    additionalMains: ["@tomlarkworthy/lopepage-2"]
  });
  return "ok";
};
const _rh1 = function _resolveHeadless(){return(
function resolveHeadless(optionValue, confValue) {
  // An explicit false must survive. The old guard was `if (!options.headless)`, which cannot
  // tell "caller said false" from "caller said nothing", so a headless toggle could never be
  // turned OFF -- bootconf silently won. Absent still falls back to bootconf, and a missing
  // bootconf (observablehq.com) still means false.
  return optionValue != null ? !!optionValue : !!confValue;
}
)};
const _rh2 = function _test_resolveHeadless_explicit_false_survives(expect,resolveHeadless)
{
  // The regression this cell exists for: bootconf says true, the user unticks the box.
  expect(resolveHeadless(false, true)).toBe(false);
  expect(resolveHeadless(false, false)).toBe(false);
  return "ok";
};
const _rh3 = function _test_resolveHeadless_absent_falls_back_to_bootconf(expect,resolveHeadless)
{
  expect(resolveHeadless(undefined, true)).toBe(true);
  expect(resolveHeadless(null, true)).toBe(true);
  expect(resolveHeadless(undefined, false)).toBe(false);
  // no bootconf at all, as on observablehq.com
  expect(resolveHeadless(undefined, undefined)).toBe(false);
  return "ok";
};
const _rh4 = function _test_resolveHeadless_explicit_true_wins(expect,resolveHeadless)
{
  expect(resolveHeadless(true, false)).toBe(true);
  expect(resolveHeadless(true, undefined)).toBe(true);
  return "ok";
};
const _amain1 = function _parseAdditionalMains(){return(
function parseAdditionalMains(text) {
  // The UI box is one line; a main is a slug or a URL, neither of which can contain a comma
  // or a space, so both separators are unambiguous. Empty box -> [], which the export loop
  // already no-ops on, so nothing is added to options unless the user typed something.
  if (typeof text !== "string") return [];
  return text.split(/[,\s]+/).filter(s => s.length > 0);
}
)};
const _amain2 = function _test_parseAdditionalMains_splits_on_commas_and_spaces(expect,parseAdditionalMains)
{
  expect(parseAdditionalMains("@tomlarkworthy/lopepage-2")).toEqual(["@tomlarkworthy/lopepage-2"]);
  expect(parseAdditionalMains("@a/b, @c/d")).toEqual(["@a/b", "@c/d"]);
  expect(parseAdditionalMains("@a/b @c/d")).toEqual(["@a/b", "@c/d"]);
  expect(parseAdditionalMains("  @a/b ,, @c/d  ")).toEqual(["@a/b", "@c/d"]);
  return "ok";
};
const _amain3 = function _test_parseAdditionalMains_empty_contributes_nothing(expect,parseAdditionalMains)
{
  // The empty box must not put additionalMains into options at all, so every existing caller
  // and every export that does not use the feature is byte-identical to before.
  expect(parseAdditionalMains("")).toEqual([]);
  expect(parseAdditionalMains("   ")).toEqual([]);
  expect(parseAdditionalMains(undefined)).toEqual([]);
  expect(parseAdditionalMains(null)).toEqual([]);
  return "ok";
};
const _amain4 = function _test_parseAdditionalMains_keeps_urls_intact(expect,parseAdditionalMains)
{
  const u = "https://example.com/mod.js?v=4";
  expect(parseAdditionalMains(u)).toEqual([u]);
  return "ok";
};
const _43zr7 = function _getSourceModule(notebook_name,main,_runtime)
{
  return async state => {
    // source picker was removed; the exporter always serialises this notebook
    if (!state.source || state.source == 'this notebook')
      return {
        notebook: notebook_name,
        module: main,
        runtime: _runtime
      };
    const url = state.source == 'a notebook url' ? state.notebook_url.child : state.top_100.child;
    const notebook = url.trim().replace('', '');
    const [{Runtime, Inspector}, {default: define}] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/@observablehq/runtime@4/dist/runtime.js'),
      import(`https://api.observablehq.com/${ notebook }.js?v=4`)
    ]);
    const runtime = new Runtime();
    return {
      notebook,
      module: runtime.module(define),
      runtime
    };
  };
};
const _tpv4tl = function _createShowable(variable,view)
{
  return function createShowable(child, {
    show = true
  } = {}) {
    const showVariable = variable(show, { name: 'show' });
    const showable = view`<div>${ [
      'show',
      showVariable
    ] }${ [
      'child',
      child
    ] }`;
    // The showable logic is to toggle the visibility of the enclosing div based
    // on the show variable state
    const updateDisplay = () => {
      if (showVariable.value) {
        showable.style.display = 'inline';
      } else {
        showable.style.display = 'none';
      }
    };
    // Variables have additional assign event so presentation can be
    // updated as soon as variables change but before dataflow
    // because this is a pure presentation state it makes sense not to trigger
    // dataflow so we do not use 'input' event
    showVariable.addEventListener('assign', updateDisplay);
    updateDisplay();
    return showable;
  };
};
const _rnq9mt = function _reportValidity(){return(
(view, invalidation) => {
  const input = view.querySelector('input');
  const report = () => view.reportValidity();
  input.addEventListener('input', report);
  invalidation.then(() => input.removeEventListener('input', report));
  return view;
}
)};
const _3vwqe7 = function _top120List(){return(
[
  '@jashkenas/inputs',
  '@d3/gallery',
  '@d3/learn-d3',
  '@makio135/creative-coding',
  '@observablehq/module-require-debugger',
  '@d3/zoomable-sunburst',
  '@observablehq/plot',
  '@tmcw/enigma-machine',
  '@d3/force-directed-graph-component',
  '@d3/bar-chart-race-explained',
  '@observablehq/data-wrangler',
  '@d3/collapsible-tree',
  '@sxywu/introduction-to-svg-and-d3-js',
  '@d3/sankey-component',
  '@d3/zoomable-circle-packing',
  '@d3/selection-join',
  '@bstaats/graph-visualization-introduction',
  '@d3/color-legend',
  '@uwdata/introducing-arquero',
  '@mbostock/10-years-of-open-source-visualization',
  '@nitaku/tangled-tree-visualization-ii',
  '@makio135/give-me-colors',
  '@johnburnmurdoch/bar-chart-race-the-most-populous-cities-in-the-world',
  '@d3/color-schemes',
  '@tezzutezzu/world-history-timeline',
  '@d3/calendar',
  '@observablehq/a-taste-of-observable',
  '@d3/bar-chart-race',
  '@mourner/martin-real-time-rtin-terrain-mesh',
  '@uwdata/introduction-to-vega-lite',
  '@mbostock/voronoi-stippling',
  '@ben-tanen/a-tutorial-to-using-d3-force-from-someone-who-just-learned-ho',
  '@d3/hierarchical-edge-bundling',
  '@observablehq/introduction-to-data',
  '@harrystevens/directly-labelling-lines',
  '@observablehq/summary-table',
  '@observablehq/plot-cheatsheets',
  '@tomshanley/cheysson-color-palettes',
  '@tophtucker/inferring-chart-type-from-autocorrelation-and-other-evils',
  '@mitvis/introduction-to-d3',
  '@veltman/watercolor',
  '@veltman/centerline-labeling',
  '@mbostock/scrubber',
  '@observablehq/electoral-college-decision-tree',
  '@d3/tree-component',
  '@d3/radial-tree-component',
  '@d3/world-tour',
  '@observablehq/introduction-to-generators',
  '@yurivish/peak-detection',
  '@mkfreeman/plot-tooltip',
  '@aboutaaron/racial-demographic-dot-density-map',
  '@mbostock/methods-of-comparison-compared',
  '@rreusser/gpgpu-boids',
  '@rreusser/2d-n-body-gravity-with-poissons-equation',
  '@bumbeishvili/data-driven-range-sliders',
  '@observablehq/introducing-visual-dataflow',
  '@observablehq/vega-lite',
  '@observablehq/observable-for-jupyter-users',
  '@observablehq/how-observable-runs',
  '@unkleho/introducing-d3-render-truly-declarative-and-reusable-d3',
  '@vega/a-guide-to-guides-axes-legends-in-vega',
  '@bartok32/diy-inputs',
  '@mbostock/polar-clock',
  '@dakoop/learn-js-data',
  '@mbostock/manipulating-flat-arrays',
  '@uwdata/an-illustrated-guide-to-arquero-verbs',
  '@daformat/rounding-polygon-corners',
  '@yurivish/seasonal-spirals',
  '@emamd/animating-lots-and-lots-of-circles-with-regl-js',
  '@uwdata/data-visualization-curriculum',
  '@d3/d3-group',
  '@d3/tree-of-life',
  '@d3/arc-diagram',
  '@d3/choropleth',
  '@mattdzugan/generative-art-using-wind-turbine-data',
  '@jashkenas/handy-embed-code-generator',
  '@analyzer2004/plot-gallery',
  '@nsthorat/how-to-build-a-teachable-machine-with-tensorflow-js',
  '@d3/sunburst-component',
  '@tomlarkworthy/saas-tutorial',
  '@mbostock/the-wealth-health-of-nations',
  '@yy/covid-19-fatality-rate',
  '@bryangingechen/importing-data-from-google-spreadsheets-into-a-notebook-we',
  '@mbostock/slide',
  '@kerryrodden/sequences-sunburst',
  '@d3/zoom-to-bounding-box',
  '@ambassadors/interactive-plot-dashboard',
  '@sethpipho/fractal-tree',
  '@mbostock/saving-svg',
  '@analyzer2004/west-coast-weather-from-seattle-to-san-diego',
  '@tmcw/tables',
  '@observablehq/introduction-to-serverless-notebooks',
  '@mootari/range-slider',
  '@d3/animated-treemap',
  '@d3/treemap-component',
  '@uwdata/interaction',
  '@hydrosquall/d3-annotation-with-d3-line-chart',
  '@jiazhewang/introduction-to-antv',
  '@d3/hierarchical-bar-chart',
  '@uwdata/data-types-graphical-marks-and-visual-encoding-channels',
  '@observablehq/why-use-a-radial-data-visualization',
  '@kerryrodden/introduction-to-text-analysis-with-tf-idf',
  '@uw-info474/javascript-data-wrangling',
  '@karimdouieb/try-to-impeach-this-challenge-accepted',
  '@observablehq/plot-gallery',
  '@carmen-tm/women-architects-i-didnt-hear-about',
  '@d3/versor-dragging',
  '@analyzer2004/timespiral',
  '@d3/brushable-scatterplot-matrix',
  '@observablehq/require',
  '@anjana/functional-javascript-first-steps',
  '@hamzaamjad/tiny-charts',
  '@observablehq/views',
  '@yurivish/quarantine-now',
  '@analyzer2004/performance-chart',
  '@freedmand/sounds',
  '@d3/bubble-chart-component',
  '@d3/mobile-patent-suits',
  '@observablehq/notebook-visualizer',
  '@d3/force-directed-tree'
]
)};
const _yq61j2 = function _notebook_name(isOnObservableCom)
{
  if (isOnObservableCom()) {
    return new URL(document.baseURI).pathname.replace('/', '');
  }
};
const _1pwnq79 = function _notebook_title(notebook_name,_runtime){return(
notebook_name || [..._runtime.mains.keys()][0]
)};
const _433z46 = function _utf8ToBase64(){return(
str => {
  const bytes = new TextEncoder().encode(String(str));
  const chunk = 32768;
  let bin = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
)};
const _14gyvdn = function _27(md){return(
md`### Single File Notebook Generator Flow`
)};
const _3dtu61 = function _TRACE_MODULE(){return(
'@tomlarkworthy/lopepage'
)};
const _g3fan0 = function _29(task){return(
task
)};
const _1km8e4e = function _task_runtime(task){return(
task.runtime
)};
const _tdkfs5 = function _runtime_variables(task_runtime,variableToObject){return(
[...task_runtime._variables].map(variableToObject)
)};
const _qc5kek = function _buildModuleNames(nkImportedModuleNames)
{
  return function buildModuleNames(runtime, {
    cache = []
  } = {}) {
    const names = new Map();
    for (const [module, info] of cache)
      names.set(module, info);
    if (runtime.mains) {
      for (const [name, module] of runtime.mains) {
        if (!names.has(module))
          names.set(module, {
            name,
            module
          });
      }
    }
    // Pass 1: "module X" variables with resolved _value
    for (const v of runtime._variables) {
      if (typeof v._name === 'string' && v._name.startsWith('module ') && v._value && !names.has(v._value)) {
        const name = v._name.slice(7);
        names.set(v._value, {
          name,
          module: v._value
        });
      }
    }
    // Pass 2: for import-bridged variables whose source module is still unnamed,
    // find the "module X" variable in the same module and use its name.
    // This handles lazy/unresolved modules on Observable.
    for (const v of runtime._variables) {
      if (v._inputs?.length === 1 && v._inputs[0]?._module && v._inputs[0]._module !== v._module && !names.has(v._inputs[0]._module)) {
        // Find a "module X" variable in v._module that could reference this source
        for (const mv of runtime._variables) {
          if (mv._module === v._module && typeof mv._name === 'string' && mv._name.startsWith('module ')) {
            // Try to match: if mv._value is the source module, or if mv._value is unresolved
            // but mv is the only module var, use its name
            const targetModule = v._inputs[0]._module;
            if (mv._value === targetModule) {
              names.set(targetModule, {
                name: mv._name.slice(7),
                module: targetModule
              });
              break;
            }
          }
        }
      }
      // Also for @variable pattern imports
      if (v._inputs?.length === 2 && v._inputs[1]?._name === '@variable' && v._inputs[0]?._value && !names.has(v._inputs[0]._value)) {
        names.set(v._inputs[0]._value, {
          name: v._inputs[0]._name?.slice(7) || 'unknown',
          module: v._inputs[0]._value
        });
      }
    }
    nkImportedModuleNames(runtime, names);
    const builtinModule = runtime._builtin;
    if (builtinModule && !names.has(builtinModule))
      names.set(builtinModule, {
        name: 'builtin',
        module: builtinModule
      });
    for (const v of runtime._variables) {
      if (!names.has(v._module))
        names.set(v._module, {
          name: 'main',
          module: v._module
        });
    }
    return names;
  };
};
const _1pfdk6e = function _isModuleVar(){return(
v => typeof v._name === 'string' && v._name.startsWith('module ')
)};
const _1vua7u7 = function _isDynamicVar(){return(
v => typeof v._name === 'string' && v._name.startsWith('dynamic ')
)};
const _stub001 = function _stubModuleSlugs(isModuleVar,isDynamicVar){return(
// Names the modules that reached a runtime as an import but never instantiated. Such a module holds
// only its own import bridges and no cells, and generate_define then emits a define() with an import
// preamble and nothing in it -- a stub that looks like a module and defines nothing, so every
// importer silently gets undefined with no error badge. Measured 2026-09-24 on an exporter-3
// exported from old.observablehq.com: editor-5 shipped 2901 bytes / 0 definitions against 220 real
// cells, dataflow-templating 501 against 91, and lopepage-2 -- which imports attachContextManu,
// auto_attach and viewof attachContextManu from editor-5 -- booted to a blank page with 0 panes,
// 0 error badges and 0 page errors, because an unmet import on a lazy runtime never resolves and
// never throws.
//
// Takes the NAMES map (module -> {name}), not a runtime. A bridge variable's `_value` is the wrong
// signal: moduleMap resolves imports through its own cache, and `_value` is only assigned when the
// runtime COMPUTES the variable, which needs observation -- measured the same day, editor-5's bridge
// still had no `_value` after moduleMap's batch force-load, in every runtime. The names map holds
// real Module objects, and every one of them carries `_runtime`.
(named, {isModuleVar: isMod = isModuleVar, isDynamicVar: isDyn = isDynamicVar} = {}) => {
  // Several entries can share a name -- the host copy and an isolated-runtime copy of the same
  // module. Only a name where NO copy has cells needs repairing: js-toolchain and
  // observablejs-toolchain both appear with 0 cells in the isolated runtime while their host copies
  // carry 47 and 210, and the block that ships is chosen by cell count, so they are already fine.
  const cellsByName = new Map();
  const liveNames = new Set();
  for (const [module, info] of named) {
    const name = info?.name;
    if (typeof name !== 'string')
      continue;
    const own = module._runtime;
    const vars = own ? [...own._variables].filter(v => v._module === module) : [];
    // A dynamic variable means the module is being authored live in this page (create_module over
    // the pairing channel), not an import that failed to instantiate. There is no published copy to
    // fetch, so asking for one would 404 on every export. Leave it alone.
    if (vars.some(v => isDyn(v)))
      liveNames.add(name);
    const cells = vars.filter(v => !isMod(v) && !isDyn(v)).length;
    cellsByName.set(name, Math.max(cellsByName.get(name) ?? 0, cells));
  }
  const slugs = [];
  for (const [name, cells] of cellsByName) {
    if (cells > 0 || liveNames.has(name))
      continue;
    // Only a published spelling can be fetched: `@ns/slug`, or `d/<hash>` for a shared document.
    // This also drops `builtin`, `main`, and any `<unknown …>` the resolver could not name.
    if (!/^(@[^/]+\/[^/]+|d\/[a-f0-9]{16}(@\d+)?)$/.test(name))
      continue;
    slugs.push(name);
  }
  return slugs;
}
)};
const _stub002 = function _test_stubModuleSlugs_names_a_module_with_no_cells(expect,stubModuleSlugs)
{
  // A module built from cells and one built only from import bridges, as included_modules holds
  // them: real Module objects, each carrying the runtime that owns it.
  const moduleOf = vars => {
    const m = {};
    m._runtime = { _variables: vars.map(v => ({ ...v, _module: m })) };
    return m;
  };
  const stub = moduleOf([{ _name: 'module 9' }, { _name: 'module 12' }]);
  const real = moduleOf([{ _name: 'cellMap' }, { _name: 'module 3' }]);
  const named = new Map([
    [stub, { name: '@tomlarkworthy/editor-5' }],
    [real, { name: '@tomlarkworthy/cell-map' }]
  ]);
  expect(stubModuleSlugs(named)).toEqual(['@tomlarkworthy/editor-5']);
  return 'ok';
};
const _stub003 = function _test_stubModuleSlugs_spares_a_name_whose_other_copy_has_cells(expect,stubModuleSlugs)
{
  // The js-toolchain / observablejs-toolchain case, measured 2026-09-24: an empty copy in the
  // isolated runtime and a populated one in the host. The block that ships is chosen by cell count,
  // so nothing needs fetching and re-fetching it would only add a duplicate.
  const moduleOf = vars => {
    const m = {};
    m._runtime = { _variables: vars.map(v => ({ ...v, _module: m })) };
    return m;
  };
  const empty = moduleOf([{ _name: 'module 1' }, { _name: 'module 2' }]);
  const full = moduleOf([{ _name: 'compile' }, { _name: 'decompile' }]);
  const named = new Map([
    [empty, { name: '@tomlarkworthy/js-toolchain' }],
    [full, { name: '@tomlarkworthy/js-toolchain' }]
  ]);
  expect(stubModuleSlugs(named)).toEqual([]);
  return 'ok';
};
const _stub004 = function _test_stubModuleSlugs_skips_a_name_it_cannot_fetch(expect,stubModuleSlugs)
{
  // Only a published spelling can be fetched. `builtin` and a resolver placeholder are empty by
  // nature; asking api.observablehq.com for them would 404 on every export.
  const moduleOf = vars => {
    const m = {};
    m._runtime = { _variables: vars.map(v => ({ ...v, _module: m })) };
    return m;
  };
  const named = new Map([
    [moduleOf([]), { name: 'builtin' }],
    [moduleOf([]), { name: '<unknown 0.503951547926479>' }],
    [moduleOf([{ _name: 'module 1' }]), { name: 'd/57d79353bac56631@44' }]
  ]);
  // The document-id form IS fetchable, so it survives while the other two are dropped.
  expect(stubModuleSlugs(named)).toEqual(['d/57d79353bac56631@44']);
  return 'ok';
};
const _stub005 = function _test_stubModuleSlugs_leaves_a_live_authored_module_alone(expect,stubModuleSlugs)
{
  const moduleOf = vars => {
    const m = {};
    m._runtime = { _variables: vars.map(v => ({ ...v, _module: m })) };
    return m;
  };
  // A module created in the page over the pairing channel has dynamic variables and no published
  // source. It looks cell-less to the counter, but fetching it would 404 on every export.
  const live = moduleOf([
    { _name: 'dynamic draft' },
    { _name: 'module 1' }
  ]);
  expect(stubModuleSlugs(new Map([[
    live,
    { name: '@tomlarkworthy/scratch-notebook' }
  ]]))).toEqual([]);
  return 'ok';
};
const _e3nks = function _nkShape(acorn)
{
  // what a definition's syntax says Notebook Kit emitted; memoised per definition function
  const cache = new WeakMap();
  const walk = (node, visit) => {
    if (!node || typeof node.type !== 'string')
      return;
    visit(node);
    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child))
        child.forEach(c => walk(c, visit));
      else if (child && typeof child.type === 'string')
        walk(child, visit);
    }
  };
  const literal = node => node?.type === 'Literal' && typeof node.value === 'string' ? node.value : null;
  const named = (node, name) => node?.type === 'MemberExpression' && !node.computed && node.property.name === name;
  const read = definition => {
    let node;
    try {
      node = acorn.parseExpressionAt(String(definition), 0, { ecmaVersion: 'latest' });
    } catch (e) {
      return { kind: 'unparsed' };
    }
    const kind = node.type === 'ArrowFunctionExpression' ? 'arrow' : node.type === 'FunctionExpression' ? 'function' : 'other';
    // a js expression cell is `() => {\nreturn (\n…\n)\n}`
    const expression = kind === 'arrow' && node.body.type === 'BlockStatement' && node.body.body.length === 1 && node.body.body[0].type === 'ReturnStatement';
    const param = kind === 'arrow' && node.async && node.params.length === 1 && node.params[0].type === 'Identifier' ? node.params[0].name : null;
    if (!param)
      return { kind, expression };
    let loads = false, specifier = null;
    const pairs = [];
    walk(node.body, n => {
      // <param>._module._runtime.module(…)
      if (n.type === 'CallExpression' && named(n.callee, 'module') && named(n.callee.object, '_runtime') && named(n.callee.object.object, '_module') && n.callee.object.object.object?.type === 'Identifier' && n.callee.object.object.object.name === param)
        loads = true;
      if (n.type === 'ImportExpression' && specifier == null)
        specifier = literal(n.source) ?? (n.source.type === 'NewExpression' ? literal(n.source.arguments[0]) : null);
      // outputs.get("<local>")?.import("<imported>", …)
      if (n.type === 'CallExpression' && named(n.callee, 'import') && n.callee.object?.type === 'CallExpression' && named(n.callee.object.callee, 'get')) {
        const local = literal(n.callee.object.arguments[0]);
        const imported = literal(n.arguments[0]);
        if (local != null && imported != null)
          pairs.push({ local, imported });
      }
    });
    return loads ? { kind: 'import', specifier, pairs } : { kind, expression };
  };
  return definition => {
    if (typeof definition !== 'function')
      return read(definition);
    let shape = cache.get(definition);
    if (!shape)
      cache.set(definition, shape = read(definition));
    return shape;
  };
};
const _e3nkic = function _isNkImportCell(nkShape){return(
v => v._inputs.length === 1 && v._inputs[0]?._name === '@variable' && nkShape(v._definition).kind === 'import'
)};
const _e3nko = function _nkImportOwners(isNkImportCell,nkShape){return(
variables => {
  // an output a Notebook Kit import cell enumerates belongs to that cell, whether or not the import has run
  const owners = new Map();
  const byName = new Map(variables.filter(v => v._name != null).map(v => [v._name, v]));
  for (const cell of variables.filter(isNkImportCell))
    for (const {local} of nkShape(cell._definition).pairs) {
      const output = byName.get(local);
      if (output && output !== cell && !owners.has(output))
        owners.set(output, cell);
    }
  return owners;
}
)};
const _e3nkc = function _nkCellStates(nkShape,displayStateOf){return(
variables => {
  // A cell Notebook Kit's own define made (a notebook viewed on observablehq.com) has no js-toolchain display state.
  // Rebuild the definition define was given from the variables it left, so the cell exports and loads as a js-toolchain cell does.
  const states = new Map();
  const byName = new Map(variables.filter(v => v._name != null).map(v => [v._name, v]));
  const holderId = name => /^cell (\d+)$/.exec(name ?? '')?.[1];
  // an input that resolves to a display or view shadow has no name of its own
  const inputName = (v, input) => input._name ?? [...v._shadow ?? []].find(([, s]) => s === input)?.[0] ?? null;
  const dependents = head => variables.filter(v => v._inputs.length === 1 && v._inputs[0] === head && !(v._shadow instanceof Map));
  for (const head of variables) {
    if (!(head._shadow instanceof Map) || displayStateOf(head))
      continue;
    const name = head._name;
    const shape = nkShape(head._definition);
    const inputs = head._inputs.map(i => inputName(head, i));
    let definition, extras = [];
    if (shape.kind === 'import') {
      extras = [...new Set(shape.pairs.map(p => p.local))].map(n => byName.get(n)).filter(v => v && v !== head);
      definition = { id: Number(holderId(name)), body: head._definition, inputs, outputs: extras.map(v => v._name), autodisplay: false };
    } else if (holderId(name) != null) {
      extras = dependents(head);
      definition = { id: Number(holderId(name)), body: head._definition, inputs, outputs: extras.map(v => v._name), autodisplay: false };
    } else if (typeof name === 'string' && name.startsWith('viewof$')) {
      extras = dependents(head).filter(v => v._name === name.slice(7));
      definition = { body: head._definition, inputs, output: name, autodisplay: true, autoview: true };
    } else {
      const mutator = head._inputs.length === 1 && holderId(head._inputs[0]._name) != null ? head._inputs[0] : null;
      const initial = mutator && byName.get(`mutable ${ name }`);
      if (initial && mutator._inputs[0] === initial) {
        extras = [initial, mutator, byName.get(`mutable$${ name }`)].filter(Boolean);
        definition = { id: Number(holderId(mutator._name)), body: initial._definition, inputs: initial._inputs.map(i => i._name), output: `mutable ${ name }`, autodisplay: true, automutable: true };
      } else {
        const autodisplay = shape.kind === 'function' || shape.expression && !inputs.includes('display') && !inputs.includes('view');
        definition = { body: head._definition, inputs, output: name ?? undefined, autodisplay };
      }
    }
    states.set(head, { definition, variables: [head, ...extras] });
  }
  return states;
}
)};
const _e3nkn = function _nkImportedModuleNames(isNkImportCell,nkShape){return(
function nkImportedModuleNames(runtime, names) {
  // A Notebook Kit import cell leaves no `module X` variable. Once it has run, each output reads from the module it loaded,
  // and the specifier names that module; a relative one is resolved against the importing module's name.
  const unnamed = info => info == null || ['main', 'unknown'].includes(info.name);
  for (let progress = true; progress;) {
    progress = false;
    for (const cell of runtime._variables) {
      if (!isNkImportCell(cell))
        continue;
      const {specifier, pairs} = nkShape(cell._definition);
      const importer = names.get(cell._module);
      const relative = /^\.\.?\//.test(specifier ?? '');
      if (specifier == null || relative && unnamed(importer))
        continue;
      const url = new URL(specifier, 'https://lopecode.invalid/' + (relative ? importer.name : ''));
      const name = decodeURIComponent(url.pathname).replace(/^\/(api\/import\/)?/, '').replace(/\.js$/, '');
      for (const {local} of pairs) {
        const module = cell._module._scope.get(local)?._inputs[0]?._module;
        if (!module || module === cell._module || !unnamed(names.get(module)))
          continue;
        names.set(module, { ...names.get(module), name, module });
        progress = true;
      }
    }
  }
  return names;
}
)};
const _e3rel = function _resolveRelative(){return(
(id, parentUrl) => /^\.\.?\//.test(id) && typeof parentUrl === 'string' && parentUrl.startsWith('file://') ? new URL(id, 'https://lopecode.invalid/' + parentUrl.slice(7)).pathname.slice(1) : id
)};
const _e3trel = function _test_resolveRelative(expect,resolveRelative)
{
  expect(resolveRelative('./tests', 'file://@tomlarkworthy/module-map')).toBe('@tomlarkworthy/tests');
  expect(resolveRelative('../@mootari/access-runtime', 'file://@tomlarkworthy/runtime-sdk')).toBe('@mootari/access-runtime');
  expect(resolveRelative('@tomlarkworthy/tests', 'file://@tomlarkworthy/module-map')).toBe('@tomlarkworthy/tests');
  expect(resolveRelative('./tests', 'https://example.com/a/b.js')).toBe('./tests');
  return 'ok';
};
const _e3tnks = function _test_nkShape_reads_import_cells(expect,nkShape)
{
  // the import cell Notebook Kit's transpiler writes for `import {x, x as y} from "./lib"`
  const cell = nkShape(['async (__variable) => {', 'const {x, x: y} = await (import("./lib").then((_) => {', '  const module = __variable._module._runtime.module(_.default);', '  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));', '  outputs.get("x")?.import("x", module);', '  outputs.get("y")?.import("x", "y", module);', '  return {};', '}));', '', 'return {x,y};', '}'].join('\n'));
  expect(cell).toEqual({ kind: 'import', specifier: './lib', pairs: [{ local: 'x', imported: 'x' }, { local: 'y', imported: 'x' }] });
  expect(nkShape('async (__variable) => { const {a} = await (import(new URL("/api/import/@u/lib", document.baseURI)).then((_) => { const module = __variable._module._runtime.module(_.default); return {}; })); return {a}; }').specifier).toBe('/api/import/@u/lib');
  // compiled lopecode imports are not Notebook Kit import cells
  expect(nkShape('(_, v) => v.import("x", _)').kind).toBe('arrow');
  expect(nkShape('async () => runtime.module((await importShim("/@u/lib.js?v=4")).default)').kind).toBe('arrow');
  expect(nkShape('() => {\nreturn (\n1 + 1\n)\n}').expression).toBe(true);
  expect(nkShape('(display) => {\ndisplay(1);\n}').expression).toBe(false);
  return 'ok';
};
const _e3tnbf = function _test_networking_script_resolves_in_a_blob_fork(networking_script,expect){return(
(async () => {
  // a fork opens as a blob: document; the module an import cell asks for is a block in that document
  const tag = "scr" + "ipt";
  // a blob: frame from a file:// page is cross-origin, so the frame reports back by message
  const probe = `try {
    parent.postMessage({
      href: location.href,
      baseURI: document.baseURI,
      resolved: esmsInitOptions.resolve(new URL("/api/import/@u/lib", document.baseURI), "file://@u/app", () => "unresolved"),
      link: String(new URL("#view=x", document.baseURI))
    }, "*");
  } catch (error) {
    parent.postMessage({error: String(error)}, "*");
  }`;
  const html = `<!doctype html><${tag} type="text/plain" id="@u/lib" data-mime="application/javascript">export default 1</${tag}><${tag}>${networking_script}</${tag}><${tag}>${probe}</${tag}>`;
  const url = URL.createObjectURL(new window.Blob([html], {type: "text/html"}));
  const frame = document.createElement("iframe");
  frame.style.display = "none";
  let listener;
  try {
    const report = new Promise((resolve, reject) => {
      listener = (event) => event.source === frame.contentWindow && resolve(event.data);
      window.addEventListener("message", listener);
      setTimeout(() => reject(new Error("the blob: frame did not report within 5s")), 5000);
    });
    frame.src = url;
    document.body.appendChild(frame);
    const {error, href, baseURI, resolved, link} = await report;
    expect(error).toBeUndefined();
    expect(resolved).toBe("file://@u/lib");
    // a URL that parsed before is unchanged, so links built from document.baseURI still point at the fork
    expect(baseURI).toBe(href);
    expect(link).toBe(href + "#view=x");
    return "ok";
  } finally {
    window.removeEventListener("message", listener);
    frame.remove();
    URL.revokeObjectURL(url);
  }
})()
)};
const _9cxfm9 = function _isImportBridged(isNkImportCell)
{
  return function isImportBridged(v) {
    // a Notebook Kit import cell loads its module itself; it is exported as it is
    if (isNkImportCell(v))
      return false;
    if (v._inputs.length === 1 && v._inputs[0]._module !== v._module && !v._inputs[0]._name?.startsWith?.('@'))
      return true;
    if (v._inputs.length === 2 && v._inputs[1]?._name === '@variable')
      return true;
    // Observable closure-based imports: single @variable input + definition contains .import(
    if (v._inputs.length === 1 && v._inputs[0]?._name === '@variable' && v._definition?.toString().includes('.import('))
      return true;
    return false;
  };
};
const _1omyant = function _findImportedName3(){return(
async function findImportedName(v) {
  if (v._inputs.length === 1 && v._inputs[0]._name === '@variable') {
    let capture;
    await v._definition({ import: (...args) => capture = args });
    return capture[0];
  }
  if (v._inputs.length === 1)
    return v._inputs[0]._name;
  const regex = /v\.import\("([^"]+)",\s*"([^"]+)"/;
  const match = v._definition.toString().match(regex);
  if (match)
    return match[1];
  return v._name;
}
)};
const _x9dxs8 = async function _moduleNames(task,moduleMap,task_runtime,nkImportedModuleNames,stubModuleSlugs,additionalMainUrl)
{
  if (task.options?.debug)
    debugger;
  const names = nkImportedModuleNames(task_runtime, await moduleMap(task_runtime, {
    cache: [...task.mains.entries()].map(([name, module]) => [
      module,
      {
        name,
        module
      }
    ])
  }));
  // Modules loaded for additionalMains live in a scratch runtime, so a moduleMap over
  // task_runtime cannot see them. Resolve them with the SAME resolver, pointed at that runtime.
  // buildModuleNames is not a substitute here: it takes the name from the "module X" variable,
  // and Observable's compiled form spells those "module 1", "module 2" — the document-id form —
  // so scratch modules were emitted as blocks with id "1".."6" instead of their slugs, and
  // nothing deduped against the host (measured on daw: 6 numbered blocks and a second copy of
  // runtime-sdk/fileattachments/exporter-3, +354KB). moduleMap recovers the slug from the
  // import URL, which is what makes the host-wins dedupe in module_specs able to match at all.
  const iso = task.options?.isolatedRuntime;
  if (iso) {
    const isoNames = nkImportedModuleNames(iso, await moduleMap(iso, {
      cache: [...task.options.isolatedMains.entries()].map(([name, module]) => [
        module,
        {
          name,
          module
        }
      ])
    }));
    for (const [module, info] of isoNames)
      if (!names.has(module))
        names.set(module, info);
  }
  // A module that reached a runtime as an import but never instantiated contributes no cells, and
  // generate_define then emits a define() with an import preamble and nothing in it — a stub that
  // looks like a module and defines nothing, so every importer silently gets undefined with no
  // error badge. Measured 2026-09-24 on old.observablehq.com: editor-5 shipped 2901 bytes / 0
  // definitions against 220 real cells and dataflow-templating 501 / 0 against 91, and lopepage-2 —
  // which imports attachContextManu, auto_attach and viewof attachContextManu from editor-5 — booted
  // to a blank page with 0 panes, 0 error badges and 0 page errors.
  //
  // The repair loads each stub's PUBLISHED definition into a runtime of its own. It cannot go into
  // the isolated runtime: that one comes from the exporter's Runtime class, which has no
  // fileAttachments (the host carries it on its prototype), so editor-5 throws inside its own define
  // there. Nor can forcing help — runtime.module(definition) is memoised per runtime, so re-invoking
  // a loader returns the same empty module. moduleMap over the repair runtime then names the repairs
  // AND their closure, which is what brings observablehq-lezer and codemirror-6-v2 into the export
  // rather than leaving the child to fetch them from the network at boot.
  const stubs = stubModuleSlugs(names);
  if (stubs.length) {
    const repair = new task_runtime.constructor();
    for (const k of Object.getOwnPropertyNames(task_runtime))
      if (typeof task_runtime[k] === 'function' && typeof repair[k] !== 'function')
        repair[k] = task_runtime[k];
    if (typeof repair.fileAttachments !== 'function' && typeof task_runtime.fileAttachments === 'function')
      repair.fileAttachments = task_runtime.fileAttachments.bind(task_runtime);
    const repaired = new Map();
    for (const slug of stubs) {
      try {
        const { default: define } = await import(additionalMainUrl(slug));
        repaired.set(slug, repair.module(define, () => ({})));
      } catch (e) {
        console.warn(`[exporter-3] ${ slug } contributed no cells and could not be fetched for repair; it will export as a definition-less stub.`, e);
      }
    }
    if (repaired.size) {
      const repairedNames = nkImportedModuleNames(repair, await moduleMap(repair, {
        cache: [...repaired.entries()].map(([name, module]) => [
          module,
          {
            name,
            module
          }
        ])
      }));
      for (const [module, info] of repairedNames)
        if (!names.has(module))
          names.set(module, info);
    }
  }
  return names;
};
const _2o6tia = function _38(resolve_modules){return(
resolve_modules
)};
const _dx8tp1 = function _39(summary){return(
summary
)};
const _ti9fu1 = function _excluded_module_names(){return(
[
  'TBD',
  'error',
  'builtin',
  'main',
  'bootloader'
]
)};
const _po3sop = function _excluded_modules(moduleNames,excluded_module_names){return(
new Map([...moduleNames.entries()].filter(([m, info]) => excluded_module_names.includes(info.name)))
)};
const _16u7vne = function _included_modules(moduleNames,excluded_module_names){return(
new Map([...moduleNames.entries()].filter(([m, info]) => !excluded_module_names.includes(info.name)))
)};
const _kxkh98 = async function _module_specs(task,included_modules,TRACE_MODULE,task_runtime,isModuleVar,isDynamicVar,getFileAttachments,main,generate_module_source,moduleNames)
{
  if (task.options?.debug)
    debugger;
  // additionalMains live in a scratch runtime, so each module must be read from the runtime
  // that actually holds its variables. Reading the wrong one yields zero variables and emits
  // an empty block, which fails at boot rather than here.
  const iso = task.options?.isolatedRuntime;
  const hostModules = new Set([...task_runtime._variables].map(v => v._module));
  // A module knows which runtime owns it, which the iso/host guess cannot — a repaired stub module
  // lives in a third runtime of its own. Measured 2026-09-24: all 60 entries of included_modules
  // carry `_runtime`. The old guess stays as the fallback.
  const runtimeOf = module => module._runtime ?? (iso && !hostModules.has(module) ? iso : task_runtime);
  // An extra main that imports something the host already has re-instantiates it in the scratch
  // runtime. Blocks are keyed by name, so keep the host's copy and drop the scratch duplicate.
  // A repaired module and the empty one it replaces carry the SAME name, and blocks are keyed by
  // name, so one of them has to go. Host-wins would keep the empty copy and throw the repair away,
  // so rank by how many real cells each carries and only fall back to host-wins on a tie -- which
  // is every pre-existing case, where the host copy is the populated one.
  const cellsOf = m => [...runtimeOf(m)._variables].filter(v => v._module === m && !isModuleVar(v) && !isDynamicVar(v)).length;
  const best = new Map();
  for (const [m, s] of included_modules.entries()) {
    const cells = cellsOf(m), host = runtimeOf(m) === task_runtime ? 1 : 0;
    const prev = best.get(s.name);
    if (!prev || cells > prev.cells || cells === prev.cells && host > prev.host)
      best.set(s.name, { m, s, cells, host });
  }
  const wanted = [...best.values()].map(({ m, s }) => [m, s]);
  return new Map(await Promise.all(wanted.map(async ([module, spec]) => {
    if (spec.name === TRACE_MODULE)
      debugger;
    // Raw variables for this module (user-defined, non-dynamic)
    const variables = [...runtimeOf(module)._variables].filter(v => v._module === module && (v._type === 1 || isModuleVar(v)) && !isDynamicVar(v));
    const imports = variables.filter(v => isModuleVar(v)).map(v => v._name.slice(7)).filter(m => !['builtin'].includes(m));
    const fileAttachments = getFileAttachments(module) || new Map();
    if (spec.name === task.notebook && task?.options?.main_files !== false) {
      (getFileAttachments(main) ?? new Map()).forEach((value, key) => fileAttachments.set(key, value));
    }
    // A module the page never instantiated yields no variables, and generate_define then emits a
    // block with the import preamble and NO definitions -- a stub that looks like a module and
    // defines nothing. Measured 2026-09-22 on an exporter-3 exported from old observablehq.com:
    // observablejs-toolchain (1101 bytes), editor-5 (2901) and dataflow-templating (501) exported
    // this way, against 186/148/67 cells in the corpus, and every importer of them silently got
    // undefined -- lopepage-2 rendered zero panes with `findModuleName is not defined`. Say so; a
    // stub is worse than a missing module because nothing downstream can tell it is empty.
    if (!variables.length)
      console.warn(`[exporter-3] ${ spec.name } contributed no variables; exporting it as a definition-less stub. It was probably never instantiated on this page.`);
    const source = await generate_module_source(spec, variables, fileAttachments, { moduleNames });
    return [
      spec.name,
      {
        url: spec.name,
        imports,
        fileAttachments,
        source,
        variables,
        module,
        define: spec.define
      }
    ];
  })));
};
const _1r3eg9r = function _findImports(){return(
cells => [...cells.keys()].filter(name => typeof name === 'string' && name.startsWith('module ')).map(name => name.replace('module ', ''))
)};
const _15bukmh = function _getFileAttachments(){return(
module => {
  let fileMap;
  const FileAttachment = module._builtins.get('FileAttachment');
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  Map.prototype.has = Map.prototype.get = function (...args) {
    fileMap = this;
  };
  try {
    FileAttachment('');
  } catch (e) {
  }
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  return fileMap;
}
)};
const _1omzjc4 = function _streamingModuleOrder(){return(
(mainNames, specByName, blockByName) => {
    // Small blocks first, so each one unblocks the parser sooner: bootconf-declared mains lead (they
    // boot the page), then every other module in ascending emitted-block size — the biggest module,
    // which stalls the parser longest, lands last. `blockByName` holds each module's already-rendered
    // block, which includes its FileAttachment blocks (they must stay adjacent to their module, see
    // lopemodule), so an attachment-heavy module sorts by its real weight. Without it, fall back to
    // the source length. Ties break alphabetically, so order depends only on content and re-exporting
    // an unchanged notebook still produces byte-identical block order. The import graph is ignored:
    // define-time contentSync only needs each module's own attachments to precede it.
    const sizeOf = name => blockByName?.get(name)?.length ?? specByName.get(name)?.source?.length ?? 0;
    const bySize = (a, b) => sizeOf(a) - sizeOf(b) || (a < b ? -1 : a > b ? 1 : 0);
    const mains = new Set(mainNames.filter(n => specByName.has(n)));
    const lead = [...mains].sort(bySize);
    const rest = [...specByName.keys()].filter(n => !mains.has(n)).sort(bySize);
    return [
      ...lead,
      ...rest
    ];
  }
)};
const _111n4kn = function _book(task,inlineModule,inlineGzipModule,es_module_shims,runtime_gz,inspector_gz,module_specs,lopemodule,streamingModuleOrder,lopebook){return(
(async () => {
  const cssBlocks = task.options.style
    .map(([url, content]) => inlineModule(url, content, { mime: "text/css" }))
    .join("\n");
  const cssUrls = task.options.style.map(([url]) => url);
  const systemBlocks = [
    inlineGzipModule("es-module-shims@2.6.2", es_module_shims),
    inlineGzipModule("@observablehq/runtime@6.0.0", runtime_gz),
    inlineGzipModule("@observablehq/inspector@5.0.1", inspector_gz)
  ].join("\n");
  // Render every block first (same total work — they already all rendered in parallel), so the
  // order can be decided on the emitted byte size rather than an estimate.
  const blockByName = new Map(
    await Promise.all(
      [...module_specs.keys()].map(async (name) => [
        name,
        await lopemodule(module_specs.get(name))
      ])
    )
  );
  const orderedNames = streamingModuleOrder(
    [...task.mains.keys()],
    module_specs,
    blockByName
  );
  const userBlocks = orderedNames.map((name) => blockByName.get(name)).join("");
  const bootloader = task.options.bootloader || "@tomlarkworthy/bootloader";
  const tickLine =
    task.options.tick != null
      ? `,\n  "tick": ${JSON.stringify(task.options.tick)}`
      : "";
  const tickDelayLine =
    task.options.tickDelayMs != null
      ? `,\n  "tickDelayMs": ${JSON.stringify(task.options.tickDelayMs)}`
      : "";
  const prerenderLine = task.options.prerender ? `,\n  "prerender": true` : "";
  const bootconfBlock =
    `<script id="bootconf.json"
        type="text/plain"
        data-mime="application/json"
>
{
  "mains": ${JSON.stringify([...task.mains.keys()])},
  "hash": "${task.options.hash || ""}",
  "headless": ${!!task.options
    .headless}${tickLine}${tickDelayLine}${prerenderLine}
}
</scr` + `ipt><!--/-->`;
  // Prerender: bake the live lopepage-2 chrome+content into <body> so the page shows
  // (styled, no JS) before boot, then a MutationObserver removes it once the real
  // #lopepage-2 mounts. Snapshot captured in exportToHTML (browser side).
  const themeCss = (task.options.style || [])
    .map(([, content]) => content)
    .join("\n");
  // Prerender: the snapshot ships as ordinary light DOM so anything that reads the HTML
  // without running it (crawlers, scrapers, readers) gets the text from source. It cannot
  // STAY in light DOM: its duplicated ids/widgets and 100+ global <style> blocks corrupt
  // the boot (measured: 876/1731 vars computed, 0 cells rendered). So the inline script
  // below hoists it into a shadow root synchronously, before the runtime boots — same
  // isolation the old Declarative Shadow DOM gave, minus the invisibility to parsers.
  // Theme CSS goes OUTSIDE (its :root custom props inherit through the shadow boundary)
  // and INSIDE (component rules must match the snapshot once it is shadow-scoped).
  // The overlay is class-gated, not baked into #lope-prerender: with JS off the snapshot
  // stays in flow and scrolls like a normal document instead of being clipped to one
  // screenful by a fixed, overflow:hidden host.
  const prerenderBlock =
    task.options.prerender && task.options.prerenderHTML
      ? [
          `<style id="lope-prerender-style">
${themeCss}
#lope-prerender.lope-prerender-overlay { position: fixed; inset: 0; z-index: 2147483000; overflow: hidden; background: var(--theme-background, #fff); }
</style>`,
          `<div id="lope-prerender"><style>\n${themeCss}\n</style>${task.options.prerenderHTML}</div>`,
          `<script id="lope-prerender-cleanup">
(function () {
  var pr = document.getElementById('lope-prerender');
  if (!pr) return;
  function drop() { if (pr && pr.parentNode) pr.remove(); }
  // JS is on, so become the opaque overlay that covers the still-booting live page, then
  // move the snapshot out of the light DOM. Both synchronous: no paint in between, and the
  // runtime (a later, async block) has not queried the document yet.
  try {
    pr.className = 'lope-prerender-overlay';
    if (!pr.shadowRoot) {
      var sr = pr.attachShadow({ mode: 'open' });
      while (pr.firstChild) sr.appendChild(pr.firstChild);
    }
  } catch (e) { drop(); return; } // no shadow support: drop rather than corrupt the boot
  // snapshot's own #lopepage-2 is inside the shadow -> this only matches the live page
  function ready() { return !!document.querySelector('#lopepage-2 .observablehq'); }
  if (ready()) { drop(); return; }
  var mo = new MutationObserver(function () { if (ready()) { mo.disconnect(); drop(); } });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(function () { mo.disconnect(); drop(); }, 5000); // never linger
})();
</scr` + `ipt>`
        ].join("\n")
      : "";
  // A bootloader that is also a main is already in userBlocks, and that copy wins (it is
  // emitted first, so contentSync resolves to it). Emitting this one too just duplicates the id.
  const bootloaderBlock = task.mains.has(bootloader)
    ? ""
    : inlineModule(
        bootloader,
        await (
          await fetch(`https://api.observablehq.com/${bootloader}.js?v=4`)
        ).text()
      );
  const blocks = [
    "<!-- CSS -->",
    cssBlocks,
    `<style>
body .inputs-3a86ea-table thead th {
  background: var(--theme-foreground-faintest);
}
</style>`,
    "<!-- System Modules -->",
    systemBlocks,
    "<!-- Bootloader -->",
    bootconfBlock,
    bootloaderBlock,
    "<!-- Userspace -->",
    userBlocks
  ].join("\n");
  return lopebook({
    blocks,
    cssUrls,
    bootloader,
    bodyPrepend: prerenderBlock,
    title:
      task.options.title ||
      (typeof document !== "undefined" && document.title) ||
      "Lopecode notebook",
    description: task.options.description,
    image: task.options.image,
    metas: task.options.metas,
    head: task.options.head
  });
})()
)};
const _tztkf6 = function _48(Inputs,module_specs){return(
Inputs.table([...module_specs.entries().map(([name, spec]) => ({
    name,
    source: spec.source.length,
    imports: spec.imports,
    fileAttachments: spec.fileAttachments
  }))], {
  layout: 'auto',
  format: {
    fileAttachments: f => !f ? 'none' : Inputs.table([...f.entries().map(([name, f]) => ({
        name,
        url: f.url || f
      }))]),
    imports: f => Inputs.table(f.map(i => ({ name: i })))
  }
})
)};
const _1razd4c = function _49(md){return(
md`##### Generate a report on the sizes of components`
)};
const _avn3ei = function _report(DOMParser,book)
{
  let report;
  try {
    report = [...new DOMParser().parseFromString(book, 'text/html').querySelectorAll('script')].map(script => ({
      ...script.getAttribute('file') && {
        file: script.getAttribute('file'),
        module: script.getAttribute('module')
      },
      type: script.getAttribute('data-mime') || 'application/javascript',
      size: script.text.length,
      id: script.id
    }));
  } catch (err) {
    report = err;
  }
  console.log('report', report);
  return report;
};
const _186iat6 = function _tomlarkworthy_exporter_task(book,report,exporter_module,$0)
{
  const result = {
    source: book,
    report: report
  };
  exporter_module;
  return $0.resolve(result);
};
const _9aqzbs = function _52(md){return(
md`## Module Source Generator`
)};
const _1h8zj4h = function _53(md){return(
md`### exportModuleJS

Serialize a single module from the live runtime to a \`.js\` module source string. Unlike \`module_specs\` (which serializes all modules as part of the full HTML export pipeline), \`exportModuleJS\` works on-demand against the live runtime with no \`task\` dependency.

\`\`\`js
import {exportModuleJS} from "@tomlarkworthy/exporter-3"
\`\`\`

\`\`\`js
const {source, fileAttachments} = await exportModuleJS(moduleId, {runtime, moduleNamesFn})
\`\`\`

**Parameters**
- \`moduleId\` — module name string, e.g. \`"@tomlarkworthy/flow-queue"\`
- \`options.runtime\` — Observable runtime instance (default: \`_runtime\`)
- \`options.moduleNamesFn\` — function to build module name map (default: \`buildModuleNames\`)

**Returns** \`{source, fileAttachments}\`
- \`source\` — full \`.js\` module source with \`export default function define(runtime, observer)\`
- \`fileAttachments\` — \`Map<name, {url, mimeType}>\` of the module's file attachments
`
)};
const _1xx9ynh = function _exportModuleJS(_runtime,buildModuleNames,isModuleVar,isDynamicVar,getFileAttachments,generate_module_source)
{
  const fn = async (moduleId, {runtime = _runtime, moduleNamesFn = buildModuleNames} = {}) => {
    const names = moduleNamesFn(runtime);
    let targetModule = null;
    for (const [module, info] of names) {
      if (info.name === moduleId) {
        targetModule = module;
        break;
      }
    }
    if (!targetModule)
      throw new Error(`Module not found: ${ moduleId }`);
    const variables = [...runtime._variables].filter(v => v._module === targetModule && (v._type === 1 || isModuleVar(v)) && !isDynamicVar(v));
    const fileAttachments = getFileAttachments(targetModule) || new Map();
    const spec = { name: moduleId };
    const source = await generate_module_source(spec, variables, fileAttachments, { moduleNames: names });
    return {
      source,
      fileAttachments
    };
  };
  return fn;
};
const _e3ord = function _orderForEmission(){return(
(variables, states) => {
  // Notebook Kit registers cells in authoring order, but the runtime enumerates them back to front,
  // so a kit-origin module exports upside down. Measured 2026-09-21 on a cold observablehq.com page:
  // the served module's main.define calls run in authoring order (disk_svg, exporter,
  // copyTextToClipboard ...) while [...runtime._variables] is the exact reverse -- 95/95 shared
  // cells, all 23 anonymous md cells included. Emission order is enumeration order, so the export
  // inherits the flip.
  // This compensates for a defect we do not own: tools/probe-kit-order-assumption.ts exits non-zero
  // when upstream stops reversing, and that is the signal to delete this cell and its caller.
  // states is non-empty only for cells Notebook Kit's own define made -- nkCellStates skips
  // js-toolchain and legacy $def cells -- so the legacy path is untouched. It is permuted 23% for a
  // separate, undiagnosed reason and must NOT be reversed.
  return states?.size ? [...variables].reverse() : variables;
}
)};
const _e3tord = function _test_orderForEmission(expect,orderForEmission)
{
  const a = { _name: 'a' }, b = { _name: 'b' }, c = { _name: 'c' };
  // no kit states: legacy and js-toolchain modules pass through untouched
  expect(orderForEmission([a, b, c], new Map()).map(v => v._name)).toEqual(['a', 'b', 'c']);
  expect(orderForEmission([a, b, c], undefined).map(v => v._name)).toEqual(['a', 'b', 'c']);
  // any rebuilt kit state marks a kit-origin module, which is emitted back to front
  expect(orderForEmission([a, b, c], new Map([[a, {}]])).map(v => v._name)).toEqual(['c', 'b', 'a']);
  // the caller's array is not mutated -- nkCellStates and nkImportOwners still hold it
  const input = [a, b, c];
  orderForEmission(input, new Map([[a, {}]]));
  expect(input.map(v => v._name)).toEqual(['a', 'b', 'c']);
  return 'ok';
};
const _udwrns = function _generate_module_source(generate_definitions,generate_define,nkCellStates,nkImportOwners,orderForEmission){return(
async (spec, variables, fileAttachments, {moduleNames} = {}) => {
  const states = nkCellStates(variables);
  const owners = nkImportOwners(variables);
  // states and owners are built from the caller's order; only emission is reordered
  const ordered = orderForEmission(variables, states);
  return `
${ generate_definitions(ordered, { states, owners }) }
${ await generate_define(spec, ordered, fileAttachments, { moduleNames, states, owners }) }`;
}
)};
const _19ft5zb = function _generate_definitions(variableToDefinition,nkExtras){return(
(variables, {states, owners} = {}) => {
  const extras = nkExtras(variables, states);
  return variables.map(v => variableToDefinition(v, { extras, states, owners })).join('');
}
)};
const _u3aown = function _generate_define(variableToDefine,nkExtras,displayStateOf,nkHelper){return(
async (spec, variables, fileAttachments, {moduleNames, states, owners} = {}) => {
  const extras = nkExtras(variables, states);
  const nk = variables.some(v => states?.get(v) ?? displayStateOf(v));
  // an /api/import module's mutable calls Notebook Kit's Mutable without `new`
  const nkMutable = variables.some(v => typeof v._name === 'string' && v._name.startsWith('mutator ') && v._inputs[0]?._name === 'Mutable');
  const fileAttachmentExpression = fileAttachments?.size ? `  const fileAttachments = new Map(${ JSON.stringify([...fileAttachments.keys()]) }.map((name) => {
    const module_name = "${ spec.name }";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));\n` : '';
  const varLines = (await Promise.all(variables.map(v => variableToDefine(v, { moduleNames, extras, states, owners })))).flat();
  const definedModules = new Set(varLines.filter(l => l.includes('runtime.module(')).map(l => {
    const m = l.match(/main\.define\("module ([^"]+)"/);
    return m ? m[1] : null;
  }).filter(Boolean));
  const referencedModules = new Set(varLines.map(l => {
    const m = l.match(/\["module ([^"]+)", "@variable"\]/);
    return m ? m[1] : null;
  }).filter(Boolean));
  if (nk || nkMutable)
    referencedModules.add('@tomlarkworthy/js-toolchain');
  const missingModules = [...referencedModules].filter(m => !definedModules.has(m));
  const moduleDefineLines = missingModules.map(m => `  main.define("module ${ m }", async () => runtime.module((await importShim("/${ m }.js?v=4")).default));`);
  return `export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
${ nk ? nkHelper : '' }${ fileAttachmentExpression }${ moduleDefineLines.join('  \n') }
${ nkMutable ? '  main.builtin("Mutable", Promise.resolve().then(() => main.value("module @tomlarkworthy/js-toolchain")).then((toolchain) => toolchain.value("nkRuntime")).then(({Mutator}) => (value) => Mutator(value)[0]));\n' : '' }${ varLines.join('  \n') }
  return main;
}`;
}
)};
const _e4nkx = function _nkExtras(displayStateOf){return(
(variables, states) => new Set(variables.flatMap(v => (states?.get(v) ?? displayStateOf(v))?.variables.slice(1) ?? []))
)};
const _e4nkh = function _nkHelper(){return(
`  const $nk = (pid, name, definition, extras) => {
    // pending until js-toolchain's defineCell has rebuilt the cell on these same variables
    let settle;
    const ready = new Promise((resolve, reject) => settle = { resolve, reject });
    const head = main.variable(undefined, { shadow: {} }).define(name, [], () => ready);
    head.pid = pid;
    const variables = [head, ...extras.map(([extraPid, extraName]) => {
      const extra = main.variable(definition.output == null || undefined).define(extraName, [name], (value) => value);
      extra.pid = extraPid;
      return extra;
    })];
    Promise.resolve()
      .then(() => main.value("module @tomlarkworthy/js-toolchain"))
      .then((toolchain) => toolchain.value("defineCell"))
      .then((defineCell) => {
        defineCell(main, definition, { variables });
        settle.resolve();
      })
      .catch((error) => settle.reject(error));
  };
`
)};
const _1hslsmt = function _isLiveImport(){return(
v => !v._name && v._definition?.toString().includes('observablehq' + '--inspect ' + 'observablehq--import')
)};
const _4i5mmq = function _variableToDefinition(isModuleVar,isImportBridged,isLiveImport,isNkImportCell,isDynamicVar,pid,restoreCanonicalImports,restoreKitImportSpecifiers,deshadowImportShim,displayStateOf){return(
function variableToDefinition(v, {extras, states, owners} = {}) {
  if (extras?.has(v))
    return '';
  // Only a real kit import cell gets its specifier rewritten. Applied to every body it also hit
  // FIXTURES -- test_isImportCell_shapes and test_findModuleName_kit_import_cell carry a kit-shaped
  // `import(new URL("/api/import/..."))` as the thing under test, and canonicalising it left both
  // passing while no longer testing the kit shape. Measured 2026-09-22 on a kit export: 14 of 29
  // /api/import bodies are import cells; the other 15 are fixtures and source-as-string cells
  // (networking_script, additionalMainUrl). test_exportModuleJS_every_page_module_loads caught it.
  const kitSpec = isNkImportCell(v) ? restoreKitImportSpecifiers : (s) => s;
  const state = states?.get(v) ?? displayStateOf(v);
  if (state) {
    const {body, ...definition} = state.definition;
    return `const ${ pid(v) } = Object.assign(${ JSON.stringify(definition) }, { body: ${ deshadowImportShim(kitSpec(restoreCanonicalImports(String(body)))) } });\n`;
  }
  if (isModuleVar(v))
    return '';
  // an import cell's output that the import has already rewired is written back as the projection it started as
  if (owners?.has(v) && v._inputs[0]?._module !== v._module)
    return `const ${ pid(v) } = (_) => _${ /^[A-Za-z_$][\w$]*$/.test(v._name) ? '.' + v._name : '[' + JSON.stringify(v._name) + ']' };\n`;
  if (isImportBridged(v))
    return '';
  if (isLiveImport(v))
    return '';
  if (isDynamicVar(v))
    return '';
  return `const ${ pid(v) } = ${ deshadowImportShim(kitSpec(restoreCanonicalImports(v._definition.toString()))) };\n`;
}
)};
const _e3kis = function _restoreKitImportSpecifiers(acorn,normalize){return(
source => {
  // Notebook Kit spells an Observable import as `import(new URL("/api/import/<slug>", document.baseURI))`.
  // That URL only resolves on observablehq.com: it is internal (403 cross-origin) and in an export it
  // resolves against the file, so every one of them fails and the module never loads. Measured
  // 2026-09-22 on an exporter-3 exported from observablehq.com: 13 such cells, each a CORS failure,
  // leaving view/themes/runtime-sdk/module-map and 9 more unresolved. restoreCanonicalImports cannot
  // do this -- it early-returns unless the source contains `importShim(`, which a kit body never has.
  // Rewrite to the form the bootloader serves from the embedded block.
  if (!/\/api\/import\//.test(source))
    return source;
  let ast;
  try {
    ast = acorn.Parser.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true
    });
  } catch (e) {
    console.warn('[exporter-3] kit specifier parse failed; leaving cell unchanged:', e.message);
    return source;
  }
  // Splice character ranges rather than regenerate, so comments and quoting survive -- same approach
  // as restoreCanonicalImports.
  const edits = [];
  const visit = node => {
    if (!node || typeof node !== 'object')
      return;
    if (node.type === 'ImportExpression' && node.source) {
      const src = node.source;
      const lit = src.type === 'Literal' && typeof src.value === 'string' ? src
        : src.type === 'NewExpression' && src.arguments?.[0]?.type === 'Literal' && typeof src.arguments[0].value === 'string' ? src.arguments[0]
        : null;
      if (lit && /\/api\/import\//.test(lit.value)) {
        const slug = normalize(lit.value);
        if (slug && slug !== lit.value)
          edits.push([src.start, src.end, JSON.stringify(`/${ slug }.js?v=4`)]);
      }
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v))
        v.forEach(visit);
      else if (v && typeof v === 'object' && v.type)
        visit(v);
    }
  };
  visit(ast);
  let out = source;
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0]))
    out = out.slice(0, start) + text + out.slice(end);
  return out;
}
)};
const _79c94t = function _restoreCanonicalImports(acorn){return(
source => {
  if (!/\bimportShim\s*\(/.test(source))
    return source;
  let ast;
  try {
    ast = acorn.Parser.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true
    });
  } catch (e) {
    console.warn('[exporter-3] importShim AST parse failed; leaving cell unchanged:', e.message);
    return source;
  }
  // The rewrite is local: only the callee identifier changes, plus the parent
  // URL Observable appends. Collect character ranges and splice them, rather
  // than regenerating the cell, so comments, quote style and indentation
  // survive. Same approach as the toolchain's source-preserving observableToJs.
  const edits = [];
  const visit = node => {
    if (!node || typeof node !== 'object')
      return;
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'importShim' && node.arguments.length >= 1) {
      edits.push([
        node.callee.start,
        node.callee.end,
        'import'
      ]);
      // Observable compiles a cell's `import(x)` to `importShim(x, "<notebook
      // url>")`, where argument 2 is the es-module-shims parent. Native import
      // takes an options object there, so a string second argument is dropped
      // and an object one (import attributes) is kept.
      const [spec, second] = node.arguments;
      if (node.arguments.length === 2 && second.type === 'Literal' && typeof second.value === 'string')
        edits.push([
          spec.end,
          second.end,
          ''
        ]);
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v))
        v.forEach(visit);
      else if (v && typeof v === 'object' && v.type)
        visit(v);
    }
  };
  visit(ast);
  let out = source;
  // Descending, so earlier offsets stay valid as we rewrite.
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0]))
    out = out.slice(0, start) + text + out.slice(end);
  return out;
}
)};
const _e3dsh = function _deshadowImportShim(acorn){return(
source => {
  // es-module-shims rewrites a cell's `import(` to `importShim(` when an exported block is loaded
  // as a shimmed module. A Notebook Kit import cell that also binds a local named importShim --
  // and runtime-sdk exports one -- then reads that binding before it is initialised. The TDZ throw
  // happens inside an async body, so the cell never settles and nothing marks it: no error badge,
  // no pageerror, just a variable stuck pending and every importer of it stranded.
  // Renaming the binding and its references removes the collision. Exported names are unchanged
  // because a shorthand property is expanded rather than replaced.
  if (!/\bimportShim\b/.test(source))
    return source;
  let ast;
  try {
    ast = acorn.Parser.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true
    });
  } catch (e) {
    console.warn('[exporter-3] importShim deshadow parse failed; leaving cell unchanged:', e.message);
    return source;
  }
  const walk = (node, fn) => {
    if (!node || typeof node !== 'object')
      return;
    fn(node);
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v))
        v.forEach(c => walk(c, fn));
      else if (v && typeof v === 'object' && v.type)
        walk(v, fn);
    }
  };
  // Only a declared binding shadows the global the rewrite reaches for. A module-scope importShim
  // -- what this notebook's own cells import from runtime-sdk and call -- must be left alone.
  let declared = false;
  walk(ast, node => {
    if (node.type !== 'VariableDeclarator')
      return;
    walk(node.id, n => {
      if (n.type === 'Identifier' && n.name === 'importShim')
        declared = true;
    });
  });
  if (!declared)
    return source;
  let alias = '__importShim';
  while (new RegExp('\\b' + alias + '\\b').test(source))
    alias += '$';
  const skip = new Set();
  walk(ast, node => {
    if (node.type === 'MemberExpression' && !node.computed && node.property && node.property.type === 'Identifier')
      skip.add(node.property);
    if (node.type === 'Property' && !node.computed && !node.shorthand && node.key && node.key.type === 'Identifier')
      skip.add(node.key);
    // a shorthand with a default is a shape Notebook Kit never emits; leave it untouched rather
    // than rewrite it wrongly
    if (node.type === 'Property' && node.shorthand && node.value && node.value.type === 'AssignmentPattern')
      walk(node.value.left, n => skip.add(n));
  });
  const edits = [];
  walk(ast, node => {
    if (node.type === 'Property' && node.shorthand && node.value && node.value.type === 'Identifier' && node.value.name === 'importShim') {
      edits.push([node.start, node.end, 'importShim: ' + alias]);
      skip.add(node.key);
      skip.add(node.value);
      return;
    }
    if (node.type === 'Identifier' && node.name === 'importShim' && !skip.has(node))
      edits.push([node.start, node.end, alias]);
  });
  let out = source;
  // Descending, so earlier offsets stay valid as we rewrite.
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0]))
    out = out.slice(0, start) + text + out.slice(end);
  return out;
}
)};
const _e3tdsh = function _test_deshadowImportShim(expect,deshadowImportShim)
{
  const D = deshadowImportShim;
  // Nothing to do.
  expect(D('async () => 1')).toBe('async () => 1');
  // A module-scope importShim is a reference, not a binding: this notebook's own cells call it.
  expect(D('async () => await importShim("/@a/b.js?v=4")')).toBe('async () => await importShim("/@a/b.js?v=4")');
  expect(D('async () => register(importShim, 1)')).toBe('async () => register(importShim, 1)');
  // A member access of the same name is not the binding either.
  expect(D('async () => window.importShim("x")')).toBe('async () => window.importShim("x")');
  // The Notebook Kit import cell shape: the binding is renamed, the exported names survive.
  const src = 'async (__variable) => {\nconst {persistentId: pid, importShim} = await (import("/api/import/@u/sdk").then((_) => ({})));\nreturn {pid,importShim};\n}';
  const out = D(src);
  expect(out.includes('const {persistentId: pid, importShim: __importShim}')).toBe(true);
  expect(out.includes('return {pid,importShim: __importShim};')).toBe(true);
  // Both sites carry the alias, so no bare binding is left for the rewrite to capture.
  // Asserted by counting rather than by matching a closing brace: the module source extractor
  // counts braces literally, even inside a string, so a lone one here would truncate this cell.
  expect(out.split('importShim: __importShim').length - 1).toBe(2);
  // Unparseable input falls back to the original source.
  const broken = 'const importShim = ("unclosed';
  expect(D(broken)).toBe(broken);
  return 'ok';
};
const _e3msn = function _moduleSlugOf(acorn,normalize){return(
(v, moduleNames) => {
  // Observable spells an imported module by INDEX -- `module 4` -- and the index is per-notebook, so
  // the same `module 4` names a different module in each block. Rebuilding `/4.js?v=4` from it emits
  // a bridge nothing can resolve, and every importer of it strands with no error badge. The loader
  // body still carries the real URL, so recover the slug from this variable itself rather than from
  // any table keyed by the bare number. Only a numeric name is touched; a spelled-out slug is correct.
  let name = typeof v._name === 'string' ? v._name.slice(7) : '';
  if (v._value && moduleNames?.has(v._value))
    name = moduleNames.get(v._value).name;
  if (!/^\d+$/.test(name))
    return name;
  let ast;
  try {
    ast = acorn.Parser.parse(String(v._definition ?? ''), {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true
    });
  } catch (e) {
    return name;
  }
  const walk = (node, fn) => {
    if (!node || typeof node !== 'object')
      return;
    fn(node);
    for (const k of Object.keys(node)) {
      const c = node[k];
      if (Array.isArray(c))
        c.forEach(x => walk(x, fn));
      else if (c && typeof c === 'object' && c.type)
        walk(c, fn);
    }
  };
  let specifier = null;
  walk(ast, node => {
    if (specifier != null || node.type !== 'ImportExpression')
      return;
    const s = node.source;
    if (s?.type === 'Literal' && typeof s.value === 'string')
      specifier = s.value;
    else if (s?.type === 'NewExpression' && s.arguments?.[0]?.type === 'Literal' && typeof s.arguments[0].value === 'string')
      specifier = s.arguments[0].value;
  });
  const slug = specifier ? normalize(specifier) : null;
  return slug && !/^\d+$/.test(slug) ? slug : name;
}
)};
const _e3tmsn = function _test_moduleSlugOf(expect,moduleSlugOf)
{
  const V = (name, definition, value) => ({
    _name: name,
    _definition: definition,
    _value: value
  });
  // Observable's compiled loader: the index is in the NAME, the slug survives only in the body.
  const legacy = 'async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4&resolutions=c5bd58fe29172a81@17307")).default)';
  expect(moduleSlugOf(V('module 4', legacy), new Map())).toBe('@tomlarkworthy/cell-map');
  // Notebook Kit spells the specifier new URL("/api/import/<slug>", document.baseURI).
  const kit = 'async () => runtime.module((await import(new URL("/api/import/@tomlarkworthy/runtime-sdk", document.baseURI))).default)';
  expect(moduleSlugOf(V('module 2', kit), new Map())).toBe('@tomlarkworthy/runtime-sdk');
  // An already-slugged name is returned untouched, and its body is never parsed.
  expect(moduleSlugOf(V('module @tomlarkworthy/view', 'nonsense('), new Map())).toBe('@tomlarkworthy/view');
  // The names map still wins wherever it can resolve the module, so the working path is unchanged.
  const mod = {};
  expect(moduleSlugOf(V('module 4', legacy, mod), new Map([[
    mod,
    { name: '@tomlarkworthy/file-sync' }
  ]]))).toBe('@tomlarkworthy/file-sync');
  // An unparseable body falls back to the raw index rather than throwing.
  expect(moduleSlugOf(V('module 7', 'const x = ("unclosed'), new Map())).toBe('7');
  return 'ok';
};
const _1g13ozv = function _variableToDefine(isLiveImport,isDynamicVar,isModuleVar,isImportBridged,findImportedName3,pid,displayStateOf,moduleSlugOf)
{
  const EXCLUDED = [
    'main',
    'builtin',
    'TBD',
    'error'
  ];
  return async function variableToDefine(v, {moduleNames, extras, states, owners} = {}) {
    if (extras?.has(v))
      return [];
    const state = states?.get(v) ?? displayStateOf(v);
    if (state)
      return [`  $nk("${ pid(v) }", ${ JSON.stringify(v._name) }, ${ pid(v) }, ${ JSON.stringify(state.variables.slice(1).map(e => [pid(e), e._name])) });`];
    if (isLiveImport(v))
      return [];
    if (isDynamicVar(v))
      return [];
    if (isModuleVar(v)) {
      // "module 1" is Observable's per-notebook index spelling. moduleSlugOf prefers the names map,
      // then falls back to the slug in this variable's own loader URL -- which survives even when the
      // module never resolved, and the map therefore cannot be keyed by its value.
      const moduleName = moduleSlugOf(v, moduleNames);
      if (EXCLUDED.includes(moduleName))
        return [];
      return [`  main.define("module ${ moduleName }", async () => runtime.module((await import("/${ moduleName }.js?v=4")).default));`];
    }
    if (owners?.has(v) && v._inputs[0]?._module !== v._module)
      return [`  $def("${ pid(v) }", ${ JSON.stringify(v._name) }, ${ JSON.stringify([owners.get(v)._name]) }, ${ pid(v) });`];
    if (isImportBridged(v)) {
      const importedName = await findImportedName3(v);
      let moduleVarName = null;
      if (v._inputs.length === 2 && v._inputs[1]?._name === '@variable') {
        // must resolve identically to the module-var branch above, or the bridge is defined under one
        // name and depended on under another, and the import silently never wires up
        moduleVarName = `module ${ moduleSlugOf(v._inputs[0], moduleNames) }`;
      } else if (v._inputs.length === 1 && v._inputs[0]?._name === '@variable') {
        // Observable closure-based import: single @variable input, module captured in closure.
        // Find source module by searching which module's _scope contains this variable name.
        for (const [mod, info] of moduleNames) {
          if (info.name === 'main' || info.name === 'builtin')
            continue;
          if (mod._scope?.has(v._name)) {
            moduleVarName = `module ${ info.name }`;
            break;
          }
        }
      } else if (v._inputs.length === 1 && v._inputs[0]._module !== v._module) {
        const sourceModule = v._inputs[0]._module;
        const sourceInfo = moduleNames?.get(sourceModule);
        if (sourceInfo)
          moduleVarName = `module ${ sourceInfo.name }`;
      }
      if (!moduleVarName)
        return [];
      const resolvedName = moduleVarName.slice(7);
      if (EXCLUDED.includes(resolvedName))
        return [];
      return [`  main.define("${ v._name }", ["${ moduleVarName }", "@variable"], (_, v) => v.import(${ importedName && importedName !== v._name ? `"${ importedName }", ` : '' }"${ v._name }", _));`];
    }
    const deps = JSON.stringify(v._inputs.map(i => i._name));
    const name_literal = v._name ? `"${ v._name }"` : 'null';
    return [`  $def("${ pid(v) }", ${ name_literal }, ${ deps }, ${ pid(v) });`];
  };
};
const _8rymrb = function _62(md){return(
md`## Assemble `
)};
const _g33g3u = function _es_module_shims(){return(
'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'
)};
const _1na8qih = function _inspector_gz(){return(
'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'
)};
const _1w6i0s3 = function _inlineModule(){return(
(id, source, {mime = 'application/javascript', main = false} = {}) => `<script id="${ id }" 
  type="text/plain"
  data-mime="${ mime }"${ main ? `
  data-main` : '' }
>${ source }</scr\ipt><!--/-->`
)};
const _br30i1 = function _inlineGzipModule(){return(
(id, source) => `<script id="${ id }" 
  type="text/plain"
  data-encoding="base64+gzip"
  data-mime="application/javascript">
${ source }
</scr\ipt><!--/-->`
)};
const _bwex58 = function _normalize(){return(
url => url.replace(/^(?:[a-z][a-z0-9+.-]*:\/\/[^/]*)?\/api\/import\/(.+?)(?:\.js)?(?:\?.*)?$/, '$1').replace(/^(?:https:\/\/api\.observablehq\.com)?\/(.*?)\.js(?:\?.*)?$/, '$1').replace(/^(d\/[a-f0-9]{16})@\d+$/, '$1')
)};
const _1vymoni = function _test_normalize(expect,normalize)
{
  expect(normalize('d/57d79353bac56631@4')).toBe('d/57d79353bac56631');
  expect(normalize('https://api.observablehq.com/@tomlarkworthy/runtime-sdk.js?v=4')).toBe('@tomlarkworthy/runtime-sdk');
  expect(normalize('https://api.observablehq.com/@tomlarkworthy/bootloader.js?v=4')).toBe('@tomlarkworthy/bootloader');
  expect(normalize('https://api.observablehq.com/d/57d79353bac56631.js?v=4')).toBe('d/57d79353bac56631');
  expect(normalize('/@tomlarkworthy/runtime-sdk.js?v=4')).toBe('@tomlarkworthy/runtime-sdk');
  expect(normalize('/d/57d79353bac56631.js?v=4')).toBe('d/57d79353bac56631');
  expect(normalize('/@tomlarkworthy/fileattachments.js?v=4&resolutions=4b0160c7af70b609@8453')).toBe('@tomlarkworthy/fileattachments');
  expect(normalize('https://api.observablehq.com/@tomlarkworthy/jest-expect-standalone.js?v=4&resolutions=03dda470c56b93ff@8390')).toBe('@tomlarkworthy/jest-expect-standalone');
  // Notebook Kit import cells: new URL("/api/import/<slug>", document.baseURI)
  expect(normalize('file:///api/import/@tomlarkworthy/js-toolchain')).toBe('@tomlarkworthy/js-toolchain');
  expect(normalize('https://tomlarkworthy.static.observableusercontent.com/api/import/@tomlarkworthy/runtime-sdk')).toBe('@tomlarkworthy/runtime-sdk');
  expect(normalize('/api/import/@mootari/access-runtime')).toBe('@mootari/access-runtime');
  expect(normalize('/api/import/d/57d79353bac56631@44')).toBe('d/57d79353bac56631');
};
const _158qnvp = function _test_networking_script_is_streaming(networking_script,expect)
{
  const src = networking_script;
  // the streaming gate + waiting helper
  expect(src.includes('window.__lopeStreaming = true')).toBe(true);
  expect(src.includes('function __waitForId')).toBe(true);
  // event-driven (MutationObserver), not a setTimeout poll: robust to Safari background-tab
  // timer throttling when a fork opens via window.open into an unfocused blob: tab
  expect(src.includes('new MutationObserver')).toBe(true);
  expect(src.includes('await new Promise((r) => setTimeout')).toBe(false);
  // DOMContentLoaded/load clear the streaming flag even if the inline sentinel never runs.
  // String checks, not regex literals: the push decompiler can't round-trip regex literals.
  expect(src.includes('addEventListener("DOMContentLoaded", __endStreaming')).toBe(true);
  expect(src.includes('window.addEventListener("load", __endStreaming')).toBe(true);
  // dvfBytes (global fetch / XHR / blob path) waits for the block to stream in.
  // Keep braces balanced everywhere in this cell (even in strings and comments): the
  // module source extractor counts braces literally, so a stray open brace makes this
  // cell's _definition run past its end and decompile/push silently drops it.
  expect(src.includes('async function dvfBytes(id)')).toBe(true);
  expect(src.includes('await __waitForId(id);')).toBe(true);
  // es-module-shims fetch + source hooks are async and wait (es-module-shims awaits both)
  expect(src.includes('async fetch(url, options, parent)')).toBe(true);
  expect(src.includes('async source(url, fetchOpts, parent, defaultSourceHook)')).toBe(true);
  const fetchIdx = src.indexOf('async fetch(url, options, parent)');
  expect(fetchIdx).toBeGreaterThan(-1);
  expect(src.indexOf('await __waitForId(id);', fetchIdx)).toBeGreaterThan(fetchIdx);
  // resolve stays synchronous (es-module-shims does not await it) but keeps streaming notebook
  // ids local instead of rewriting them to the remote observablehq API
  expect(src.includes('\n    resolve(id, parentUrl, defaultResolve)')).toBe(true);
  expect(src.includes('if (window.__lopeStreaming && isNotebook(id)) return')).toBe(true);
  return 'ok';
};
const _1d9ux6v = function _test_lopebook_main_at_top_with_sentinel(lopebook,expect)
{
  const MARK = '<!--USER_BLOCKS_MARK-->';
  const html = lopebook({
    blocks: MARK,
    cssUrls: [],
    bootloader: '@tomlarkworthy/bootloader',
    title: 't'
  });
  const mainIdx = html.indexOf('<script id="main">');
  const blocksIdx = html.indexOf(MARK);
  const sentinelIdx = html.indexOf('streaming_sentinel');
  // main is a classic (non-deferred) script so it runs from the top during streaming
  expect(mainIdx).toBeGreaterThan(-1);
  expect(html.includes('<script type="module" id="main">')).toBe(false);
  // main runs before the module blocks, the end sentinel after them
  expect(mainIdx).toBeLessThan(blocksIdx);
  expect(sentinelIdx).toBeGreaterThan(blocksIdx);
  // bootstrap awaits the now-async fetch hook before reading .text()
  expect(html.includes('.fetch("file://es-module-shims@2.6.2").then(r => r.text())')).toBe(true);
  return 'ok';
};
const _1i253lz = function _test_streaming_order_prioritizes_mains(expect,streamingModuleOrder)
{
  const mk = names => new Map(names.map(n => [
    n,
    {
      url: n,
      imports: []
    }
  ]));
  const specByName = mk([
    '@u/app',
    '@u/lib',
    '@u/junk'
  ]);
  // equal size (no blocks, no source) degrades to alphabetical; main still leads
  expect(streamingModuleOrder(['@u/app'], specByName).join(',')).toBe('@u/app,@u/junk,@u/lib');
  // multiple mains lead, alphabetically among themselves at equal size
  expect(streamingModuleOrder([
    '@u/lib',
    '@u/app'
  ], specByName).join(',')).toBe('@u/app,@u/lib,@u/junk');
  // deterministic: independent of specByName insertion order
  expect(streamingModuleOrder(['@u/app'], mk([
    '@u/junk',
    '@u/lib',
    '@u/app'
  ])).join(',')).toBe('@u/app,@u/junk,@u/lib');
  // unknown main is ignored; every module still present exactly once
  expect(streamingModuleOrder(['@u/missing'], specByName).join(',')).toBe('@u/app,@u/junk,@u/lib');
  return 'ok';
};
const _8g15pf = function _test_streaming_order_runtime(Runtime,streamingModuleOrder,expect)
{
  // Build a real Runtime with the module-import wiring the exporter introspects, then order it.
  const rt = new Runtime();
  const libMod = rt.module();
  libMod.variable().define('x', [], () => 1);
  const appMod = rt.module();
  appMod.variable().define('module @u/lib', [], () => libMod);
  // app imports lib
  const junkMod = rt.module();
  junkMod.variable().define('y', [], () => 2);
  // derive specs exactly as `module_specs` does: a module's `module ` vars are its imports
  const names = new Map([
    [
      appMod,
      '@u/app'
    ],
    [
      libMod,
      '@u/lib'
    ],
    [
      junkMod,
      '@u/junk'
    ]
  ]);
  const specByName = new Map();
  for (const [mod, name] of names) {
    const imports = [...rt._variables].filter(v => v._module === mod && typeof v._name === 'string' && v._name.startsWith('module ')).map(v => v._name.slice(7));
    specByName.set(name, {
      url: name,
      imports
    });
  }
  const order = streamingModuleOrder(['@u/app'], specByName);
  expect(order.join(',')).toBe('@u/app,@u/junk,@u/lib');
  // main first, then the rest — no sizes available here, so alphabetical
  return 'ok';
};
const _1didxs7 = function _test_restoreCanonicalImports(restoreCanonicalImports,expect)
{
  const R = restoreCanonicalImports;
  // Nothing to rewrite: identity.
  expect(R('async () => 1 + 2')).toBe('async () => 1 + 2');
  // Callee position becomes the canonical dynamic import.
  expect(R('async () => await importShim("/@a/b.js?v=4")')).toBe('async () => await import("/@a/b.js?v=4")');
  // Several calls of differing length: the offsets must stay valid.
  expect(R('async () => [await importShim("a"), await importShim("bb")]')).toBe('async () => [await import("a"), await import("bb")]');
  expect(R('async () => importShim(await importShim("inner"))')).toBe('async () => import(await import("inner"))');
  // Argument 2 is the es-module-shims parent URL that Observable appends when
  // it compiles a cell's own `import(x)`. Native import has no such parameter.
  expect(R("f = () => importShim(objectURL, 'https://api.observablehq.com/@a/b.js?v=4')")).toBe('f = () => import(objectURL)');
  expect(R('f = () => importShim(`${ nb }.js?v=4`, "https://api.observablehq.com/@a/b.js?v=4")')).toBe('f = () => import(`${ nb }.js?v=4`)');
  // ...but a real options object is import attributes, and must survive.
  expect(R("async () => await importShim(url, { with: { type: 'css' } })")).toBe("async () => await import(url, { with: { type: 'css' } })");
  // Callee position only. A bare `import` identifier is a syntax error, so a
  // reference passed as a value has to be left alone.
  expect(R('async () => register(importShim, importShim("real"))')).toBe('async () => register(importShim, import("real"))');
  expect(R('async () => window.importShim("x") + importShim("y")')).toBe('async () => window.importShim("x") + import("y")');
  expect(R('async () => importShim() || importShim("x")')).toBe('async () => importShim() || import("x")');
  // A string that merely mentions importShim is not a call.
  expect(R('async () => { const s = "call importShim(x) later"; return importShim("real"); }')).toBe('async () => { const s = "call importShim(x) later"; return import("real"); }');
};
const _e3tkis = function _test_restoreKitImportSpecifiers(expect,restoreKitImportSpecifiers)
{
  const R = restoreKitImportSpecifiers;
  // the shape Notebook Kit emits for an Observable import
  const kit = 'async (__variable) => { const {view} = await (import(new URL("/api/import/@tomlarkworthy/view", document.baseURI)).then((_) => ({}))); return {view}; }';
  expect(R(kit).includes('"/@tomlarkworthy/view.js?v=4"')).toBe(true);
  expect(R(kit).includes('/api/import/')).toBe(false);
  // a bare string specifier, same treatment
  expect(R('async () => await import("/api/import/@a/b")')).toBe('async () => await import("/@a/b.js?v=4")');
  // already canonical: untouched, so every existing export is byte-identical
  const canonical = 'async () => runtime.module((await import("/@a/b.js?v=4")).default)';
  expect(R(canonical)).toBe(canonical);
  // a cell that merely mentions the path in a string is not an ImportExpression -- left alone
  const mention = 'async () => "/api/import/@a/b"';
  expect(R(mention)).toBe(mention);
  // unparseable source must survive unchanged rather than throw
  const broken = 'const x = ("unclosed';
  expect(R(broken)).toBe(broken);
  return "ok";
};
const _ogm44p = function _test_restoreCanonicalImports_preserves_source(expect,restoreCanonicalImports)
{
  // Only the callee identifier changes, so the rest survives byte-for-byte —
  // escodegen used to reformat the whole cell.
  const src = [
    'function _f() {',
    "  // keep  this   comment",
    "  const s = 'single-quoted';   /* and this */",
    '  return importShim("tpl");',
    '}'
  ].join('\n');
  expect(restoreCanonicalImports(src)).toBe(src.replace('return importShim("tpl")', 'return import("tpl")'));
  // Unparseable input falls back to the original source.
  const broken = 'async () => importShim("unclosed';
  expect(restoreCanonicalImports(broken)).toBe(broken);
};
const _1vgrzwk = function _isNotebook(){return(
id => /^(@[^/]+\/[^/]+|d\/[a-f0-9]{16})$/.test(id)
)};
const _yqhmq9 = function _networking_script(normalize,isNotebook,resolveRelative){return(
`
  const normalize = ${ normalize.toString() };
  const resolveRelative = ${ resolveRelative.toString() };
  const isNotebook = ${ isNotebook.toString() };

  // a fork opens as a blob: document, and a blob: URL cannot be the base of Notebook Kit's new URL("/api/import/<slug>", document.baseURI)
  if (location.protocol === "blob:") {
    const NativeURL = URL;
    const rebase = (url, base) => {
      if (base === undefined || !String(base).startsWith("blob:")) return base;
      try {
        new NativeURL(url, base);
        return base;
      } catch {
        const origin = new NativeURL(String(base)).origin;
        return origin === "null" ? "https://lopecode.invalid" : origin;
      }
    };
    window.URL = class URL extends NativeURL {
      constructor(url, base) { super(url, rebase(url, base)); }
      static [Symbol.hasInstance](value) { return value instanceof NativeURL; }
    };
  }

  // --- streaming gate ---
  // main runs from the TOP of the document, before the whole file has finished downloading, so a
  // block a boot import needs may not have streamed in yet. __waitForId blocks until the block's
  // <script> is fully parsed (el.nextSibling is non-null only after its </scr\\ipt> is seen),
  // bounded by window.__lopeStreaming, which flips to false once the document is fully parsed (so a
  // genuinely-absent id resolves to a 404 rather than hanging).
  //
  // The wait is event-driven (MutationObserver + DOMContentLoaded/load), NOT a setTimeout poll:
  // Safari throttles timers in background/unfocused tabs, and a fork opens via window.open into a
  // tab that is often not foregrounded, so a poll loop stalls there (works in a foreground file://
  // download but hangs in a backgrounded blob: fork). MutationObserver fires on the parser's node
  // insertions regardless of timer throttling. The end-of-document sentinel stays as a redundant
  // fast-path; DOMContentLoaded/load clear the flag even if that inline script never runs.
  window.__lopeStreaming = true;
  function __endStreaming() { window.__lopeStreaming = false; }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __endStreaming, { once: true });
    window.addEventListener("load", __endStreaming, { once: true });
  } else {
    __endStreaming();
  }
  // A block that is still streaming is the last child of <body>, so anything boot appends there
  // becomes its nextSibling and a bare sibling test calls a half-written block complete (measured
  // 2026-08-13: a 36990 of 97815 char read of @tomlarkworthy/annotate, sibling div.lp2-menu, which
  // then failed to parse). Only the parser writes the end marker; appended nodes sit in between it
  // and the block, so scan forward. A block without a marker simply waits for end of stream.
  function __isComplete(el) {
    if (!el) return false;
    if (!window.__lopeStreaming) return true;
    for (var n = el.nextSibling; n; n = n.nextSibling)
      if (n.nodeType === 8 && n.data === "/") return true;
    return false;
  }
  function __waitForId(id) {
    if (__isComplete(document.getElementById(id)) || !window.__lopeStreaming) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        mo.disconnect();
        document.removeEventListener("DOMContentLoaded", onEnd);
        window.removeEventListener("load", onEnd);
        resolve();
      };
      const check = () => { if (__isComplete(document.getElementById(id)) || !window.__lopeStreaming) finish(); };
      const onEnd = () => { __endStreaming(); finish(); };
      const mo = new MutationObserver(check);
      mo.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener("DOMContentLoaded", onEnd);
      window.addEventListener("load", onEnd);
      check();
    });
  }

  const b64ToBytes = (b64) => {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  // Build a Response synchronously for esms.fetch
  function dvfResponseSync(id) {
    const el = document.getElementById(id);
    console.log("responding", id, el)
    if (!el) return new Response(null, { status: 404 });

    const mime = el.getAttribute("data-mime");
    if (!mime) return new Response(null, { status: 415 });

    const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
    const text = (el.textContent || "").trim();

    try {
      if (enc === "text") {
        const bytes = new TextEncoder().encode(text);
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": mime, "Content-Length": String(bytes.byteLength) }
        });
      }
      if (enc === "base64") {
        const bytes = b64ToBytes(text);
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": mime, "Content-Length": String(bytes.byteLength) }
        });
      }
      if (enc === "base64+gzip") {
        // Sync setup of streaming decompression
        const bytes = b64ToBytes(text);
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new Response(stream, { status: 200, headers: { "Content-Type": mime } });
      }
    } catch {
      return new Response(null, { status: enc.includes("gzip") ? 499 : 422 });
    }
    return new Response(null, { status: 422 });
  }

  // Async bytes for global fetch/XHR/blob URLs
  async function dvfBytes(id) {
    await __waitForId(id);
    const el = document.getElementById(id);
    if (!el) return { status: 404 };

    const mime = el.getAttribute("data-mime");
    if (!mime) return { status: 415 };

    const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
    const text = el.textContent || "";

    try {
      if (enc === "text") {
        const bytes = new TextEncoder().encode(text);
        return { status: 200, mime, bytes };
      }
      if (enc === "base64") {
        const bytes = b64ToBytes(text);
        return { status: 200, mime, bytes };
      }
      if (enc === "base64+gzip") {
        const bytes = b64ToBytes(text);
        // true async decompression to materialize bytes for blob URLs
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        const ab = await new Response(stream).arrayBuffer();
        return { status: 200, mime, bytes: new Uint8Array(ab) };
      }
    } catch {
      return { status: enc.includes("gzip") ? 499 : 422 };
    }
    return { status: 422 };
  }

  // --- es-module-shims hooks ---
  // fetch and source are async and wait for not-yet-streamed blocks (es-module-shims awaits both:
  // \`c = await fetchHook(...)\` and \`await (sourceHook||default)(...)\`). resolve is NOT awaited, so it
  // stays synchronous — it just routes a not-yet-present notebook id to file:// (where fetch/source
  // then wait) instead of rewriting it to the remote observablehq API.
  window.esmsInitOptions = {
    shimMode: true,
    resolve(id, parentUrl, defaultResolve) {
      id = normalize(resolveRelative(String(id), parentUrl));
      const el = document.getElementById(id);
      if (el) {
        if (el.src) return el.src;
        if (el.href) return el.href;
        return \`file://\${id}\`;
      }
      if (window.__lopeStreaming && isNotebook(id)) return \`file://\${id}\`;
      if (isNotebook(id)) id = \`https://api.observablehq.com/\${id}.js?v=4\`;
      return defaultResolve(id, parentUrl);
    },
    async source(url, fetchOpts, parent, defaultSourceHook) {
      if (url.startsWith("file://")) {
        const id = url.slice(7);
        await __waitForId(id);
        const el = document.getElementById(id);
        if (!el) return { type: "js", source: "throw new Error('DVF 404')" };
        const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
        const mime = el.getAttribute("data-mime");
        if (enc === "text" && mime === "application/javascript")
          return { type: "js", source: el.textContent || "" };
        if (enc === "text" && mime === "application/json")
          return { type: "json", source: el.textContent || "" };
        // base64 / gzip handled by fetch
      }
      return defaultSourceHook(url, fetchOpts, parent);
    },
    async fetch(url, options, parent) {
      if (typeof url !== "string" || !url.startsWith("file://")) {
        return fetch(url, options);
      }
      const id = url.slice(7);
      await __waitForId(id);
      return dvfResponseSync(id);
    }
  };

  // --- unify classic <script src>, XHR, and global fetch ---

  async function blobUrlForId(id) {
    const r = await dvfBytes(id);
    if (r.status !== 200) throw new Error("DVF " + r.status);
    return URL.createObjectURL(new Blob([r.bytes], { type: r.mime }));
  }

  // <script src="file://...">, img, etc.
  (function patchScriptSrc(){
    const _create = Document.prototype.createElement;
    Document.prototype.createElement = function(name, opts) {
      const el = _create.call(this, name, opts);
      const tag = String(name).toLowerCase();
      if (tag === "script") {
        if ( tag === "img") debugger;
        const d = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
        Object.defineProperty(el, "src", {
          configurable: true,
          get: () => d.get.call(el),
          set: (v) => {
            if (typeof v === "string") {
              if (v.startsWith("file://")) {
                v = v.slice(7);
              }
            }
            if (document.getElementById(v)) {
              blobUrlForId(v).then(u => d.set.call(el, u));
            } else {
              d.set.call(el, v);
            }
          }
        });
      }
      return el;
    };
  })();

  // XHR open("GET", "file://id", ...)
  (function patchXHR(){
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === "string" && url.startsWith("file://")) {
        blobUrlForId(url.slice(7)).then(u => _open.call(this, method, u, ...rest));
        return;
      }
      return _open.call(this, method, url, ...rest);
    };
  })();

  // Global fetch for app code
  (function patchFetch(){
    const _fetch = globalThis.fetch;
    globalThis.fetch = function(url, init) {
      if (typeof url === "string") {
        let id;
        if (url.startsWith("file://")) {
          id = url.slice(7);
        } else {
          id = normalize(url);
          if (!document.getElementById(id)) {
            id = null;
          }
        }
        if (id) {
          // reuse the same logic as esms, but async to materialize bytes for callers
          return dvfBytes(id).then(r => {
            if (r.status !== 200) return new Response(null, { status: r.status });
            return new Response(r.bytes, {
              status: 200,
              headers: { "Content-Type": r.mime, "Content-Length": String(r.bytes.byteLength) }
            });
          });
        }
      }
      return _fetch(url, init);
    };

    window.lopecode = {
      dvfBytes,
      contentSync: (id) => {
        const el = document.getElementById(id);
        if (!el) return { status: 404 };
    
        const mime = el.getAttribute("data-mime");
        if (!mime) return { status: 415 };
    
        const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
        const text = el.textContent || "";
    
        try {
          if (enc === "text") {
            const bytes = new TextEncoder().encode(text);
            return { status: 200, mime, bytes };
          }
          if (enc === "base64") {
            const bytes = b64ToBytes(text);
            return { status: 200, mime, bytes };
          }
        } catch {
          return { status: enc.includes("gzip") ? 499 : 422 };
        }
        return { status: 422 };
      }
    }
  })();`
)};
const _1gs4p60 = function _lopebook(agent_orientation,diskDataUrl,networking_script){return(
({blocks = '', cssUrls = [], bootloader = '@tomlarkworthy/bootloader', title = 'Lopecode notebook', description, image, metas = [], head, bodyPrepend = ''} = {}) => {
    const styleImports = cssUrls.map((url, i) => `  const style${ i } = await importShim(${ JSON.stringify(url) }, { with: { type: 'css' } });`).join('\n');
    const styleAdopt = cssUrls.map((_, i) => `style${ i }.default`).join(',');
    const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ogTags = [
      `<meta property="og:title" content="${ attr(title) }">`,
      `<meta property="og:type" content="website">`,
      description ? `<meta name="description" content="${ attr(description) }">` : '',
      description ? `<meta property="og:description" content="${ attr(description) }">` : '',
      image ? `<meta property="og:image" content="${ attr(image) }">` : '',
      // Preserved <meta> carried across re-export by exportToHTML's head scan.
      ...(metas || []).map(m => `<meta ${ m.isProperty ? 'property' : 'name' }="${ attr(m.key) }" content="${ attr(m.content) }">`)
    ].filter(Boolean).join('\n  ');
    return `<!DOCTYPE html>
${ agent_orientation }
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>${ title }</title>
  ${ ogTags }
  ${ head ? head : `<link rel="icon" href="${ diskDataUrl }">` }
</head>
<body>
${ bodyPrepend }
<script id="networking_script">${ networking_script }
</scr\ipt>

<script id="main">
(async () => {
  await window.esmsInitOptions.fetch("file://es-module-shims@2.6.2").then(r => r.text()).then(src => {
    const script = document.createElement('script');
    script.textContent = src;
    document.head.appendChild(script);
  });

${ styleImports }
  document.adoptedStyleSheets = [${ styleAdopt }];

  const { Runtime } = await importShim("@observablehq/runtime@6.0.0");
  const { Inspector } = await importShim("@observablehq/inspector@5.0.1");
  const notebook = document.querySelector("notebook");
  const runtime = new Runtime({__ojs_runtime: () => runtime, __ojs_observer: () => observer});
  const observer = Inspector.into(document.body);
  const {default: define} = await importShim(${ JSON.stringify(bootloader) });
  runtime.bootloader = runtime.module(define, () => ({}));
})().catch((e) => console.error("boot error", e));
</scr\ipt>

${ blocks }

<script id="streaming_sentinel">window.__lopeStreaming = false;</scr\ipt>
</body>
</html>`;
  }
)};
const _nr5nou = function _lopemodule(TRACE_MODULE,CSS,arrayBufferToBase64,inlineModule,escapeScriptTags){return(
async module => {
    if (module.url === TRACE_MODULE) {
      debugger;
    }
    const moduleId = module.url.replace(/^(d\/[a-f0-9]{16})@\d+$/, '$1');
    const files = module.fileAttachments ? await Promise.all([...module.fileAttachments.entries()].map(async ([name, attachment]) => {
      const url = attachment.url || attachment;
      const file_url = `${ moduleId }/${ encodeURIComponent(name) }`;
      // Get from local when possible
      const lopefile = !url.startsWith('blob:') && document.querySelector(`script[type=lope-file][module='${ CSS.escape(module.url) }'][file='${ CSS.escape(encodeURIComponent(name)) }']`);
      let data64, mime = undefined;
      if (!lopefile) {
        const response = await fetch(url);
        data64 = await response.arrayBuffer().then(arrayBufferToBase64);
        mime = response.headers.get('content-type');
      } else {
        data64 = lopefile.textContent;
        mime = lopefile.getAttribute('mime');
      }
      return `<script id="${ file_url }" 
  type="text/plain"
  data-encoding="base64"
  data-mime="${ mime }"
>
${ data64 }
</scr\ipt><!--/-->`;  // return `<script type="lope-file" module="${
              //   module.url
              // }" file="${encodeURIComponent(
              //   name
              // )}" mime="${mime}">${data64}</scr\ipt>\n`;
    })) : [];
    return `${ files.join('\n') }\n${ inlineModule(moduleId, escapeScriptTags(module.source)) }\n`;
  }
)};
const _19l1umr = function _escapeScriptTags(){return(
str => str.replaceAll('</scr\ipt', '</scr\\ipt')
)};
const _xpg7uv = function _arrayBufferToBase64(){return(
async function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((data, byte) => data + String.fromCharCode(byte), '');
  return btoa(binary);
}
)};
const _1iz5onh = function _81(md){return(
md`### Global Output`
)};
const _b9np5w = function _82(md){return(
md`## Utils`
)};
const _fw7q7v = function _getCompactISODate(){return(
function getCompactISODate() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${ year }${ month }${ day }T${ hours }${ minutes }${ seconds }Z`;
}
)};
const _7vqfq9 = function _84(md){return(
md`## Additional Tests`
)};
const _8765p8 = function _diskDataUrl(disk_svg){return(
`data:image/svg+xml;base64,${ btoa(disk_svg('white').outerHTML).replaceAll('<?xml version="1.0" ?>', '').replaceAll('\n', '') }`
)};
const _z4k2or = function _task(flowQueue){return(
flowQueue({ timeout_ms: 20000 })
)};
const _ngmf1x = (G, _) => G.input(_);
const _pfhond = function _output(Inputs){return(
Inputs.input(undefined)
)};
const _ei7ugd = (G, _) => G.input(_);
const _blfbdd = function _exporter_module(thisModule){return(
thisModule()
)};
const _1iao5e4 = (G, _) => G.input(_);
const _8yaom = function _test_lopebook_agent_orientation(lopebook,expect)
{
  const html = lopebook({
    blocks: '',
    cssUrls: [],
    bootloader: '@tomlarkworthy/bootloader',
    title: 't'
  });
  // an agent opening the raw file sees the orientation before any markup
  const idx = html.indexOf('LOPECODE NOTEBOOK');
  expect(idx).toBeGreaterThan(-1);
  expect(idx).toBeLessThan(html.indexOf('<html lang="en">'));
  // it leads with an unpack recipe, and the shell quoting survives this template literal:
  // the python program is wrapped in double quotes, so it must contain none of its own
  const cmd = html.slice(html.indexOf('python3 -c "'), html.indexOf('/tmp/unpacked') + 13);
  expect(cmd.includes('HTMLParser')).toBe(true);
  expect(cmd.split('"').length).toBe(3);
  // and it delegates the rest rather than restating it
  ['bootconf.json', 'markdown', '@tomlarkworthy/exporter-3', 'github.com/tomlarkworthy/lopecode-dev']
    .forEach(ptr => expect(html.includes(ptr)).toBe(true));
  return 'ok';
};
const _1k1sglz = function _agent_orientation(){return(
`<!--
LOPECODE NOTEBOOK — orientation for AI agents. A self-contained Observable-runtime notebook:
every JavaScript module, asset and config is a top-level <script type="text/plain" id="..."> block,
resolved at runtime. No build step and no server — edit a block, reload the file.

Do not read this file whole, it is megabytes, and do not grep it: block bodies contain source that
looks like block headers, so grep over-reports. Unpack it with an HTML parser, which tracks script
raw text correctly, and work from the extracted files:

  python3 -c "
  import sys, os, base64, gzip
  from html.parser import HTMLParser
  src, out = sys.argv[1], sys.argv[2]
  class P(HTMLParser):
      def __init__(self):
          super().__init__(convert_charrefs=False); self.a = None
      def handle_starttag(self, t, attrs):
          d = dict(attrs)
          self.a = d if t == 'script' and 'id' in d else None
      def handle_data(self, data):
          if not self.a: return
          enc, mime = self.a.get('data-encoding', 'text'), self.a.get('data-mime', '')
          b = data.encode() if enc == 'text' else base64.b64decode(data)
          if 'gzip' in enc: b = gzip.decompress(b)
          name = self.a['id'].replace('://', '_')
          if mime == 'application/javascript' and not name.endswith('.js'): name += '.js'
          p = os.path.join(out, name); os.makedirs(os.path.dirname(p), exist_ok=True)
          open(p, 'wb').write(b); print(len(b), mime, self.a['id'])
          self.a = None
  os.makedirs(out, exist_ok=True)
  P().feed(open(src, encoding='utf-8').read())" FILE /tmp/unpacked

Then read, in this order:
  /tmp/unpacked/bootconf.json — "mains" is which modules boot, "hash" is the default #view= layout.
    Only these matter for the notebook at hand; the rest of the blocks are their dependencies.
  the module named after this file — its own content, and where most edits belong
  any text/markdown blocks (@tomlarkworthy/markdown-wiki/*.md) — documentation carried in this file
  @tomlarkworthy/exporter-3.js — its markdown cells specify the packaging format, and it is the
    code that writes this file
  https://github.com/tomlarkworthy/lopecode-dev — long-form guides live in knowledge/

Edit blocks in place in the HTML; the unpacked copy is for reading.
-->`
)};
const _m5xgn5 = function _test_streaming_order_smallest_first(expect,streamingModuleOrder)
{
  const specByName = new Map([
    '@u/app',
    '@u/big',
    '@u/mid',
    '@u/small'
  ].map(n => [
    n,
    {
      url: n,
      imports: []
    }
  ]));
  const blocks = new Map([
    [
      '@u/app',
      'x'.repeat(10)
    ],
    [
      '@u/big',
      'x'.repeat(900)
    ],
    [
      '@u/mid',
      'x'.repeat(90)
    ],
    [
      '@u/small',
      'x'.repeat(9)
    ]
  ]);
  // main leads regardless of size, then ascending block size — the biggest lands last
  expect(streamingModuleOrder(['@u/app'], specByName, blocks).join(',')).toBe('@u/app,@u/small,@u/mid,@u/big');
  // an attachment-heavy module sorts by the whole block, not by its source
  const withFiles = new Map(blocks);
  withFiles.set('@u/small', 'x'.repeat(5000));
  expect(streamingModuleOrder(['@u/app'], specByName, withFiles).join(',')).toBe('@u/app,@u/mid,@u/big,@u/small');
  // no blocks: fall back to source length
  const sourced = new Map([
    [
      '@u/big',
      {
        url: '@u/big',
        source: 'x'.repeat(900)
      }
    ],
    [
      '@u/small',
      {
        url: '@u/small',
        source: 'x'.repeat(9)
      }
    ]
  ]);
  expect(streamingModuleOrder([], sourced).join(',')).toBe('@u/small,@u/big');
  // equal sizes tie-break alphabetically, so the order stays deterministic
  const tied = new Map([
    [
      '@u/b',
      'x'.repeat(10)
    ],
    [
      '@u/a',
      'x'.repeat(10)
    ]
  ]);
  const tiedSpecs = new Map([...tied.keys()].map(n => [
    n,
    { url: n }
  ]));
  expect(streamingModuleOrder([], tiedSpecs, tied).join(',')).toBe('@u/a,@u/b');
  return 'ok';
};

const _e3t00 = function _e3t00(md) {return (md`## Round-trip tests`);};
const _e3t01 = function _exporterRoundTrip(acorn,isModuleVar,isDynamicVar) {
  // the define function's text can also appear inside a cell (this module's own template does), so locate the real export
  const load = (source) => {
    const node = acorn.parse(source, {ecmaVersion: "latest", sourceType: "module"}).body.find(n => n.type === "ExportDefaultDeclaration");
    return new Function(source.slice(0, node.start) + "return " + source.slice(node.declaration.start))();
  };
  const moduleVariables = (runtime, module) => [...runtime._variables].filter(v => v._module === module && (v._type === 1 || isModuleVar(v)) && !isDynamicVar(v));
  // a module variable's definition is its loader, which a test replaces, so only its name is compared
  const fingerprint = (variables) => variables.map(v => ({
    name: v._name ?? null,
    pid: v.pid ?? null,
    inputs: v._inputs.map(i => i._name),
    definition: isModuleVar(v) ? null : String(v._definition)
  }));
  const namesOf = (entries) => () => new Map(entries.map(([module, name]) => [module, {name, module}]));
  return {load, moduleVariables, fingerprint, namesOf};
};
const _e3t02 = function _test_exportModuleJS_round_trip(exporterRoundTrip,Runtime,Generators,exportModuleJS,expect) {return (
(async () => {
  const {load, moduleVariables, fingerprint, namesOf} = exporterRoundTrip;
  // the classic stdlib's Mutable, which the fixture's `mutable m` glue reads; on Notebook Kit the page's own is a bare generator
  function ClassicMutable(value) {
    let change;
    Object.defineProperties(this, {
      generator: {value: Generators.observe(_ => void (change = _, value !== undefined && _(value)))},
      value: {get: () => value, set: x => void change(value = x)}
    });
  }
  // Runtime builtins are definitions, not values
  const builtins = {Generators: () => Generators, Mutable: () => ClassicMutable};
  const rt = new Runtime(builtins);
  try {
    const lib = rt.module();
    lib.variable(true).define("x", [], () => 1);
    const app = rt.module();
    app.variable(true).define("module @u/lib", [], () => lib);
    app.variable(true).define("y", ["module @u/lib", "@variable"], (_, v) => v.import("x", "y", _));
    app.variable(true).define("n", [], () => 41).pid = "_e3keep";
    app.variable(true).define(null, ["n"], (n) => n + 1);
    app.variable(true).define("viewof v", [], () => Object.assign(new EventTarget(), {value: 5}));
    app.variable(true).define("v", ["Generators", "viewof v"], (G, _) => G.input(_));
    app.variable(true).define("initial m", [], () => 3);
    app.variable(true).define("mutable m", ["Mutable", "initial m"], (M, _) => new M(_));
    app.variable(true).define("m", ["mutable m"], _ => _.generator);
    expect([await app.value("y"), await app.value("v"), await app.value("m")]).toEqual([1, 5, 3]);

    const {source} = await exportModuleJS("@u/app", {runtime: rt, moduleNamesFn: namesOf([[app, "@u/app"], [lib, "@u/lib"]])});
    expect(source).toContain(`$def("_e3keep", "n", [], _e3keep);`);
    expect(source).toContain(`main.define("y", ["module @u/lib", "@variable"], (_, v) => v.import("x", "y", _));`);

    const rt2 = new Runtime(builtins);
    try {
      const lib2 = rt2.module();
      lib2.variable(true).define("x", [], () => 1);
      const app2 = rt2.module(load(source), () => true);
      app2.redefine("module @u/lib", [], () => lib2);
      expect([await app2.value("y"), await app2.value("v"), await app2.value("m")]).toEqual([1, 5, 3]);
      expect(fingerprint(moduleVariables(rt2, app2))).toEqual(fingerprint(moduleVariables(rt, app)));
      const again = await exportModuleJS("@u/app", {runtime: rt2, moduleNamesFn: namesOf([[app2, "@u/app"], [lib2, "@u/lib"]])});
      expect(again.source).toBe(source);
      return `ok: ${moduleVariables(rt, app).length} variables, ${source.length} bytes, re-export identical`;
    } finally {
      rt2.dispose();
    }
  } finally {
    rt.dispose();
  }
})()
)};
const _e3t03 = function _test_exportModuleJS_lists_file_attachments(Runtime,exportModuleJS,expect) {return (
(async () => {
  const rt = new Runtime();
  try {
    const app = rt.module();
    const files = new Map([["data.csv", {url: "blob:null/none", mimeType: "text/csv"}]]);
    // getFileAttachments reads the map through the builtin alone; a cell calling it with a literal name would read to lope-preflight as a missing attachment of this module
    app.builtin("FileAttachment", (name) => files.get(name));
    const {source, fileAttachments} = await exportModuleJS("@u/files", {runtime: rt, moduleNamesFn: () => new Map([[app, {name: "@u/files", module: app}]])});
    expect([...fileAttachments.keys()]).toEqual(["data.csv"]);
    // spelled without the literal loader-map text, which lope-preflight's attachmentsOf would read as this module's own attachment list
    expect(source).toContain(`const fileAttachments = new Map(${JSON.stringify(["data.csv"])}.map(`);
    expect(source).toContain(`main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));`);
    return "ok";
  } finally {
    rt.dispose();
  }
})()
)};
const _e3t04 = function _test_exportModuleJS_every_page_module_loads(exporterRoundTrip,_runtime,buildModuleNames,exportModuleJS,acorn,isModuleVar,isImportBridged,isLiveImport,restoreCanonicalImports,deshadowImportShim,nkCellStates,nkImportOwners,displayStateOf,notebook_name,main,expect) {return (
(async () => {
  const {load, moduleVariables} = exporterRoundTrip;
  // on observablehq.com the viewed notebook is named as Fork names it
  const names = buildModuleNames(_runtime, {cache: notebook_name ? [[main, {name: notebook_name, module: main}]] : []});
  const toolchain = [...names].find(([, info]) => info.name === "@tomlarkworthy/js-toolchain")?.[0];
  // an exported file attachment map reads window.lopecode.contentSync, which only a lopecode page has
  const canReadAttachments = typeof window.lopecode?.contentSync === "function";
  // Notebook Kit cells: rebuilt from their variables where Observable defined them, js-toolchain's record where it did
  const statesOf = (variables) => {
    const states = nkCellStates(variables);
    for (const v of variables) if (displayStateOf(v)) states.set(v, displayStateOf(v));
    return states;
  };
  const compared = (runtime, module, restore) => {
    const variables = moduleVariables(runtime, module);
    const states = statesOf(variables);
    const inCell = new Set([...states.values()].flatMap(s => s.variables));
    // an import cell's outputs are aliases once it has run and projections before, so only their names are compared
    const owned = nkImportOwners(variables);
    const plain = variables.filter(v => !inCell.has(v) && !owned.has(v));
    return {
      cells: plain.filter(v => !isModuleVar(v) && !isImportBridged(v) && !isLiveImport(v))
        .map(v => ({name: v._name ?? null, pid: v.pid ?? null, inputs: v._inputs.map(i => i._name), definition: restore(String(v._definition))})),
      imports: plain.filter(v => isImportBridged(v)).map(v => v._name).sort(),
      notebookKitCells: [...states.values()].map(({definition: {body, ...definition}, variables}) => ({...definition, body: restore(String(body)), pids: variables.map(v => v.pid ?? null)})),
      importOutputs: [...owned.keys()].map(v => v._name).sort()
    };
  };
  const seen = new Set(), skipped = [], failures = [];
  let variables = 0;
  for (const [module, {name}] of names) {
    if (["builtin", "main", "unknown"].includes(name) || seen.has(name)) continue;
    seen.add(name);
    const rt2 = new _runtime.constructor();
    // the bootloader adds fileAttachments to the page's runtime instance, not to the class
    if (!rt2.fileAttachments) rt2.fileAttachments = _runtime.fileAttachments;
    try {
      const {source, fileAttachments} = await exportModuleJS(name, {runtime: _runtime, moduleNamesFn: () => names});
      acorn.parse(source, {ecmaVersion: "latest", sourceType: "module"});
      if (fileAttachments.size && !canReadAttachments) {
        skipped.push(name);
        continue;
      }
      const loaded = rt2.module(load(source));
      if (toolchain && loaded._scope.has("module @tomlarkworthy/js-toolchain")) loaded.redefine("module @tomlarkworthy/js-toolchain", [], () => toolchain);
      // each $nk head is a placeholder until js-toolchain has rebuilt the cell on it
      const unbuilt = () => moduleVariables(rt2, loaded).filter(v => v._shadow instanceof Map && !displayStateOf(v));
      for (let i = 0; i < 500 && unbuilt().length; i++) await new Promise(resolve => setTimeout(resolve, 10));
      if (unbuilt().length) throw new Error(`${unbuilt().length} Notebook Kit cells were not rebuilt by js-toolchain`);
      // the exported body is canonicalised then deshadowed, so the live side must be put through
      // both to be comparable -- the reloaded side is realized by new Function, which never applies
      // the es-module-shims rewrite that makes the deshadow necessary in the first place
      expect(compared(rt2, loaded, s => s)).toEqual(compared(_runtime, module, s => deshadowImportShim(restoreCanonicalImports(s))));
      variables += moduleVariables(_runtime, module).length;
    } catch (e) {
      failures.push(`${name}: ${String(e?.message ?? e).slice(0, 400)}`);
    } finally {
      rt2.dispose();
    }
  }
  // where modules go unnamed the loop exports nothing, so the notebook holding this test must be among those exported
  const own = [..._runtime._variables].find(v => v._name === "exportModuleJS" && v._value === exportModuleJS && !isImportBridged(v))?._module;
  if (!seen.has(names.get(own)?.name)) failures.push(`the module holding this test was not exported (named ${names.get(own)?.name})`);
  expect(failures).toEqual([]);
  return `ok: ${seen.size - skipped.length} modules, ${variables} variables` + (skipped.length ? `; not loaded, their file attachments need window.lopecode: ${skipped.join(", ")}` : "");
})()
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/observable-runtime-v6", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime-v6.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/dom-view", async () => runtime.module((await import("/@tomlarkworthy/dom-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("module @tomlarkworthy/themes", async () => runtime.module((await import("/@tomlarkworthy/themes.js?v=4")).default));  
  main.define("module @tomlarkworthy/js-toolchain", async () => runtime.module((await import("/@tomlarkworthy/js-toolchain.js?v=4")).default));  
  $def("_1noor04", null, ["md"], _1noor04);  
  $def("_vpmotg", null, ["exporter","viewof output","Event"], _vpmotg);  
  $def("_16yvadj", null, ["md","downloadAnchor","forkAnchor"], _16yvadj);  
  $def("_xnho81", null, ["md","forkAnchor","downloadAnchor"], _xnho81);  
  $def("_lv8hyy", null, ["md"], _lv8hyy);  
  $def("_1wae1tk", null, ["md"], _1wae1tk);  
  $def("_mob2ng", null, ["md"], _mob2ng);  
  $def("_1n6u02c", null, ["md"], _1n6u02c);  
  $def("_17bj13d", null, ["disk_svg"], _17bj13d);  
  $def("_fl78rz", "disk_svg", ["html"], _fl78rz);  
  $def("_ibwdcx", null, ["md"], _ibwdcx);  
  $def("_1p4bp3o", "exporter", ["actionHandler","css","keepalive","exporter_module","variable","domView","view","disk_svg","linkTo","Inputs","themes","viewof theme_assets"], _1p4bp3o);  
  $def("_14mjs7h", "copyTextToClipboard", ["globalThis"], _14mjs7h);  
  $def("_1sbph8c", "htmlToConsoleSnippet", ["utf8ToBase64"], _1sbph8c);  
  $def("_1w6fc3k", "exportAnchor", ["Node","notebook_name","main","_runtime","exportToHTML","location","getCompactISODate"], _1w6fc3k);  
  $def("_1u2ju69", "forkAnchor", ["exportAnchor"], _1u2ju69);  
  $def("_1a8n42w", "downloadAnchor", ["exportAnchor"], _1a8n42w);  
  $def("_4zsqot", "actionHandler", ["Inputs","getSourceModule","notebook_name","_runtime","exportToHTML","htmlToConsoleSnippet","copyTextToClipboard","view","linkTo","location","getCompactISODate","parseAdditionalMains"], _4zsqot);  
  $def("_lhn762", "exportToHTML", ["_runtime","cssForTheme","css","location","keepalive","exporter_module","viewof task","additionalMainUrl","resolveHeadless","defaultExportOptions","defaultViewHash","resolveExportHash","Runtime"], _lhn762);
  $def("_stub001", "stubModuleSlugs", ["isModuleVar","isDynamicVar"], _stub001);
  $def("_stub002", "test_stubModuleSlugs_names_a_module_with_no_cells", ["expect","stubModuleSlugs"], _stub002);
  $def("_stub003", "test_stubModuleSlugs_spares_a_name_whose_other_copy_has_cells", ["expect","stubModuleSlugs"], _stub003);
  $def("_stub004", "test_stubModuleSlugs_skips_a_name_it_cannot_fetch", ["expect","stubModuleSlugs"], _stub004);
  $def("_stub005", "test_stubModuleSlugs_leaves_a_live_authored_module_alone", ["expect","stubModuleSlugs"], _stub005);
  $def("_amurl1", "additionalMainUrl", [], _amurl1);
  $def("_dm1", "defaultExportOptions", [], _dm1);
  $def("_dm2", "test_defaultExportOptions_only_without_config", ["expect","defaultExportOptions"], _dm2);  
  $def("_dm3", "test_defaultExportOptions_supplies_frame_and_headless", ["expect","defaultExportOptions"], _dm3);  
  $def("_dm4", "test_defaultExportOptions_respects_what_the_caller_said", ["expect","defaultExportOptions"], _dm4);  
  $def("_dvh1", "defaultViewHash", [], _dvh1);
  $def("_dvh2", "test_defaultViewHash_names_the_exported_notebook", ["expect","defaultViewHash"], _dvh2);
  $def("_dvh3", "test_defaultViewHash_uses_the_round_tripping_spelling", ["expect","defaultViewHash"], _dvh3);
  $def("_dvh4", "test_defaultViewHash_has_nothing_to_name", ["expect","defaultViewHash"], _dvh4);
  $def("_reh1", "resolveExportHash", [], _reh1);
  $def("_reh2", "test_resolveExportHash_inherits_the_notebooks_own_hash", ["expect","resolveExportHash"], _reh2);
  $def("_reh3", "test_resolveExportHash_prefers_the_live_location", ["expect","resolveExportHash"], _reh3);
  $def("_reh4", "test_resolveExportHash_defaults_only_without_config", ["expect","resolveExportHash"], _reh4);
  $def("_rh1", "resolveHeadless", [], _rh1);
  $def("_rh2", "test_resolveHeadless_explicit_false_survives", ["expect","resolveHeadless"], _rh2);
  $def("_rh3", "test_resolveHeadless_absent_falls_back_to_bootconf", ["expect","resolveHeadless"], _rh3);
  $def("_rh4", "test_resolveHeadless_explicit_true_wins", ["expect","resolveHeadless"], _rh4);
  $def("_amain1", "parseAdditionalMains", [], _amain1);
  $def("_amain2", "test_parseAdditionalMains_splits_on_commas_and_spaces", ["expect","parseAdditionalMains"], _amain2);
  $def("_amain3", "test_parseAdditionalMains_empty_contributes_nothing", ["expect","parseAdditionalMains"], _amain3);
  $def("_amain4", "test_parseAdditionalMains_keeps_urls_intact", ["expect","parseAdditionalMains"], _amain4);
  $def("_amurl2", "test_additionalMainUrl_expands_a_slug", ["expect","additionalMainUrl"], _amurl2);
  $def("_amurl3", "test_additionalMainUrl_passes_a_url_through", ["expect","additionalMainUrl"], _amurl3);
  $def("_amurl4", "test_additionalMainUrl_leaves_no_resolutions_pin", ["expect","additionalMainUrl"], _amurl4);  
  $def("_43zr7", "getSourceModule", ["notebook_name","main","_runtime"], _43zr7);  
  $def("_tpv4tl", "createShowable", ["variable","view"], _tpv4tl);  
  $def("_rnq9mt", "reportValidity", [], _rnq9mt);  
  $def("_3vwqe7", "top120List", [], _3vwqe7);  
  $def("_yq61j2", "notebook_name", ["isOnObservableCom"], _yq61j2);  
  $def("_1pwnq79", "notebook_title", ["notebook_name","_runtime"], _1pwnq79);  
  $def("_433z46", "utf8ToBase64", [], _433z46);  
  $def("_14gyvdn", null, ["md"], _14gyvdn);  
  $def("_3dtu61", "TRACE_MODULE", [], _3dtu61);  
  $def("_g3fan0", null, ["task"], _g3fan0);  
  $def("_1km8e4e", "task_runtime", ["task"], _1km8e4e);  
  $def("_tdkfs5", "runtime_variables", ["task_runtime","variableToObject"], _tdkfs5);  
  $def("_qc5kek", "buildModuleNames", ["nkImportedModuleNames"], _qc5kek);  
  $def("_1pfdk6e", "isModuleVar", [], _1pfdk6e);  
  $def("_1vua7u7", "isDynamicVar", [], _1vua7u7);  
  $def("_e3nks", "nkShape", ["acorn"], _e3nks);  
  $def("_e3nkic", "isNkImportCell", ["nkShape"], _e3nkic);  
  $def("_e3nko", "nkImportOwners", ["isNkImportCell","nkShape"], _e3nko);  
  $def("_e3nkc", "nkCellStates", ["nkShape","displayStateOf"], _e3nkc);  
  $def("_e3nkn", "nkImportedModuleNames", ["isNkImportCell","nkShape"], _e3nkn);  
  $def("_e3rel", "resolveRelative", [], _e3rel);  
  $def("_e3trel", "test_resolveRelative", ["expect","resolveRelative"], _e3trel);  
  $def("_e3tnks", "test_nkShape_reads_import_cells", ["expect","nkShape"], _e3tnks);  
  $def("_9cxfm9", "isImportBridged", ["isNkImportCell"], _9cxfm9);  
  $def("_1omyant", "findImportedName3", [], _1omyant);  
  $def("_x9dxs8", "moduleNames", ["task","moduleMap","task_runtime","nkImportedModuleNames","stubModuleSlugs","additionalMainUrl"], _x9dxs8);
  $def("_2o6tia", null, ["resolve_modules"], _2o6tia);  
  $def("_dx8tp1", null, ["summary"], _dx8tp1);  
  $def("_ti9fu1", "excluded_module_names", [], _ti9fu1);  
  $def("_po3sop", "excluded_modules", ["moduleNames","excluded_module_names"], _po3sop);  
  $def("_16u7vne", "included_modules", ["moduleNames","excluded_module_names"], _16u7vne);  
  $def("_kxkh98", "module_specs", ["task","included_modules","TRACE_MODULE","task_runtime","isModuleVar","isDynamicVar","getFileAttachments","main","generate_module_source","moduleNames"], _kxkh98);  
  $def("_1r3eg9r", "findImports", [], _1r3eg9r);  
  $def("_15bukmh", "getFileAttachments", [], _15bukmh);  
  $def("_1omzjc4", "streamingModuleOrder", [], _1omzjc4);  
  $def("_111n4kn", "book", ["task","inlineModule","inlineGzipModule","es_module_shims","runtime_gz","inspector_gz","module_specs","lopemodule","streamingModuleOrder","lopebook"], _111n4kn);  
  $def("_tztkf6", null, ["Inputs","module_specs"], _tztkf6);  
  $def("_1razd4c", null, ["md"], _1razd4c);  
  $def("_avn3ei", "report", ["DOMParser","book"], _avn3ei);  
  $def("_186iat6", "tomlarkworthy_exporter_task", ["book","report","exporter_module","viewof task"], _186iat6);  
  $def("_9aqzbs", null, ["md"], _9aqzbs);  
  $def("_1h8zj4h", null, ["md"], _1h8zj4h);  
  $def("_1xx9ynh", "exportModuleJS", ["_runtime","buildModuleNames","isModuleVar","isDynamicVar","getFileAttachments","generate_module_source"], _1xx9ynh);  
  $def("_udwrns", "generate_module_source", ["generate_definitions","generate_define","nkCellStates","nkImportOwners","orderForEmission"], _udwrns);  
  $def("_e3ord", "orderForEmission", [], _e3ord);
  $def("_e3tord", "test_orderForEmission", ["expect","orderForEmission"], _e3tord);
  $def("_19ft5zb", "generate_definitions", ["variableToDefinition","nkExtras"], _19ft5zb);  
  $def("_u3aown", "generate_define", ["variableToDefine","nkExtras","displayStateOf","nkHelper"], _u3aown);  
  $def("_e4nkx", "nkExtras", ["displayStateOf"], _e4nkx);  
  $def("_e4nkh", "nkHelper", [], _e4nkh);  
  $def("_1hslsmt", "isLiveImport", [], _1hslsmt);  
  $def("_4i5mmq", "variableToDefinition", ["isModuleVar","isImportBridged","isLiveImport","isNkImportCell","isDynamicVar","pid","restoreCanonicalImports","restoreKitImportSpecifiers","deshadowImportShim","displayStateOf"], _4i5mmq);
  $def("_e3kis", "restoreKitImportSpecifiers", ["acorn","normalize"], _e3kis);
  $def("_79c94t", "restoreCanonicalImports", ["acorn"], _79c94t);
  $def("_e3dsh", "deshadowImportShim", ["acorn"], _e3dsh);
  $def("_e3tdsh", "test_deshadowImportShim", ["expect","deshadowImportShim"], _e3tdsh);
  $def("_e3msn", "moduleSlugOf", ["acorn","normalize"], _e3msn);
  $def("_e3tmsn", "test_moduleSlugOf", ["expect","moduleSlugOf"], _e3tmsn);
  $def("_1g13ozv", "variableToDefine", ["isLiveImport","isDynamicVar","isModuleVar","isImportBridged","findImportedName3","pid","displayStateOf","moduleSlugOf"], _1g13ozv);  
  $def("_8rymrb", null, ["md"], _8rymrb);  
  $def("_g33g3u", "es_module_shims", [], _g33g3u);  
  $def("_1na8qih", "inspector_gz", [], _1na8qih);  
  $def("_1w6i0s3", "inlineModule", [], _1w6i0s3);  
  $def("_br30i1", "inlineGzipModule", [], _br30i1);  
  $def("_bwex58", "normalize", [], _bwex58);  
  $def("_1vymoni", "test_normalize", ["expect","normalize"], _1vymoni);  
  $def("_158qnvp", "test_networking_script_is_streaming", ["networking_script","expect"], _158qnvp);  
  $def("_e3tnbf", "test_networking_script_resolves_in_a_blob_fork", ["networking_script","expect"], _e3tnbf);  
  $def("_1d9ux6v", "test_lopebook_main_at_top_with_sentinel", ["lopebook","expect"], _1d9ux6v);  
  $def("_1i253lz", "test_streaming_order_prioritizes_mains", ["expect","streamingModuleOrder"], _1i253lz);  
  $def("_8g15pf", "test_streaming_order_runtime", ["Runtime","streamingModuleOrder","expect"], _8g15pf);  
  $def("_1didxs7", "test_restoreCanonicalImports", ["restoreCanonicalImports","expect"], _1didxs7);  
  $def("_ogm44p", "test_restoreCanonicalImports_preserves_source", ["expect","restoreCanonicalImports"], _ogm44p);  
  $def("_e3tkis", "test_restoreKitImportSpecifiers", ["expect","restoreKitImportSpecifiers"], _e3tkis);  
  $def("_1vgrzwk", "isNotebook", [], _1vgrzwk);  
  $def("_yqhmq9", "networking_script", ["normalize","isNotebook","resolveRelative"], _yqhmq9);  
  $def("_1gs4p60", "lopebook", ["agent_orientation","diskDataUrl","networking_script"], _1gs4p60);  
  $def("_nr5nou", "lopemodule", ["TRACE_MODULE","CSS","arrayBufferToBase64","inlineModule","escapeScriptTags"], _nr5nou);  
  $def("_19l1umr", "escapeScriptTags", [], _19l1umr);  
  $def("_xpg7uv", "arrayBufferToBase64", [], _xpg7uv);  
  $def("_1iz5onh", null, ["md"], _1iz5onh);  
  $def("_b9np5w", null, ["md"], _b9np5w);  
  $def("_fw7q7v", "getCompactISODate", [], _fw7q7v);  
  $def("_7vqfq9", null, ["md"], _7vqfq9);  
  $def("_8765p8", "diskDataUrl", ["disk_svg"], _8765p8);  
  $def("_z4k2or", "viewof task", ["flowQueue"], _z4k2or);  
  $def("_ngmf1x", "task", ["Generators","viewof task"], _ngmf1x);  
  $def("_pfhond", "viewof output", ["Inputs"], _pfhond);  
  $def("_ei7ugd", "output", ["Generators","viewof output"], _ei7ugd);  
  $def("_blfbdd", "viewof exporter_module", ["thisModule"], _blfbdd);  
  $def("_1iao5e4", "exporter_module", ["Generators","viewof exporter_module"], _1iao5e4);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("runtime_gz", ["module @tomlarkworthy/observable-runtime-v6", "@variable"], (_, v) => v.import("source_gz", "runtime_gz", _));  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime-v6", "@variable"], (_, v) => v.import("Runtime", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("cellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("findModuleName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findModuleName", _));  
  main.define("findImportedName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findImportedName", _));  
  main.define("variableToObject", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("variableToObject", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  main.define("decompress_url", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompress_url", _));  
  main.define("acorn", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("acorn", _));  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("variable", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("variable", _));  
  main.define("bindOneWay", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("bindOneWay", _));  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  main.define("domView", ["module @tomlarkworthy/dom-view", "@variable"], (_, v) => v.import("domView", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("resolve_modules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("resolve_modules", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("summary", _));  
  main.define("forcePeek", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("forcePeek", _));  
  main.define("pid", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("persistentId", "pid", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("_runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", "_runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("id", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("id", _));  
  main.define("importShim", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("importShim", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  main.define("themes", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("themes", _));  
  main.define("extra_css", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("extra_css", _));  
  main.define("current_theme", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("current_theme", _));  
  main.define("viewof theme_assets", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("viewof theme_assets", _));  
  main.define("theme_assets", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("theme_assets", _));  
  main.define("css", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("css", _));  
  main.define("cssForTheme", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("cssForTheme", _));  
  main.define("displayStateOf", ["module @tomlarkworthy/js-toolchain", "@variable"], (_, v) => v.import("displayStateOf", _));  
  $def("_8yaom", "test_lopebook_agent_orientation", ["lopebook","expect"], _8yaom);  
  $def("_1k1sglz", "agent_orientation", [], _1k1sglz);  
  $def("_m5xgn5", "test_streaming_order_smallest_first", ["expect","streamingModuleOrder"], _m5xgn5);
  $def("_e3t00", null, ["md"], _e3t00);
  $def("_e3t01", "exporterRoundTrip", ["acorn","isModuleVar","isDynamicVar"], _e3t01);
  $def("_e3t02", "test_exportModuleJS_round_trip", ["exporterRoundTrip","Runtime","Generators","exportModuleJS","expect"], _e3t02);
  $def("_e3t03", "test_exportModuleJS_lists_file_attachments", ["Runtime","exportModuleJS","expect"], _e3t03);
  $def("_e3t04", "test_exportModuleJS_every_page_module_loads", ["exporterRoundTrip","_runtime","buildModuleNames","exportModuleJS","acorn","isModuleVar","isImportBridged","isLiveImport","restoreCanonicalImports","deshadowImportShim","nkCellStates","nkImportOwners","displayStateOf","notebook_name","main","expect"], _e3t04);
  return main;
}
