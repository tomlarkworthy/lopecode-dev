const _17hago = function _page(isOnObservableCom,htl){return(
htl.html`<div style="height: ${isOnObservableCom() ? '800px' : '100vh'}">
  <h1 style="display:none;">Moldable Webpage (prototype II)</h1>
</div>`
)};
const _1fgi7xd = function _page_style_css(htl){return(
htl.html`<style>
  @import url('https://fonts.googleapis.com/css2?family=Gloria+Hallelujah&family=Patrick+Hand&display=swap');
  
  :root {
    --system-ui: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    --hand-written: "Patrick Hand";
  }
  body {
    max-width: none;
  }
  html {
    font-family: var(--system-ui);
  } 
  h1, h2 {
    font-family: var(--hand-written);
    font-weight: bold;
    color: #84DCCF;
  }
  h1 {
    font-size: 2rem;
  }
  pre, code, tt {
    color: white;
    background-color: black;
  }
  /* Hide the section deliminators */
  .lope-viz .observablehq:last-child {
    display: none;
  }
  .sidebar .minicell {
    font-family: --monospace-font;
    margin-left: 1rem;
  }
  .minimap {
    border: 1px solid #84DCCF;
  }
  .lope-viz {
    padding-right: 0.25rem;
    padding-left: 0.25rem;
  }
  .lope-viz .observablehq {
    margin: 0.5rem
  }
  /* Bug fix: invisible lm_close_tab even with showCloseIcon: false was closing tabs */
  .lm_close_tab, .lm_close { 
    display: none
  }
  .fire_text {
    background: linear-gradient(-45deg, #fa0000, #d3dd46, #f47f1f, #d561ff);
    background-size: 400% 400%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient 1s ease infinite;
  }
  @keyframes gradient {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 50% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  
</style>`
)};
const _pa9sfk = function _lopeviz_handle_css_ref(lopeviz_handle_css){return(
lopeviz_handle_css
)};
const _1r9jtde = function _minicellStyle_ref(minicellStyle){return(
minicellStyle
)};
const _1g9p5oo = function _base_css_ref(base_css){return(
base_css
)};
const _1bn7g52 = function _light_theme_css_ref(light_theme_css){return(
light_theme_css
)};
const _vx2w2o = function _default_mobile(){return(
{
  settings: {
    showMaximiseIcon: false,
    showPopoutIcon: false,
    showCloseIcon: true,
    hasHeaders: true
  },
  content: [
    {
      type: "column",
      content: [
        {
          type: "stack",
          content: [
            {
              type: "component",
              title: "title",
              componentName: "panel",
              componentState: { label: "header" }
            },
            {
              type: "component",
              title: "nav",
              componentName: "panel",
              componentState: { label: "left_sidebar" }
            },
            {
              type: "component",
              title: "edit",
              componentName: "panel",
              componentState: { label: "right_sidebar" }
            }
          ],
          height: 10
        },
        {
          type: "row",
          content: [
            {
              type: "component",
              title: "content",
              componentName: "panel",
              componentState: { label: "content" }
            }
          ]
        }
      ]
    }
  ]
}
)};
const _1ck7p4y = function _default_desktop(){return(
{
  settings: {
    showMaximiseIcon: false,
    showPopoutIcon: false,
    showCloseIcon: true,
    hasHeaders: true
  },
  content: [
    {
      type: "column",
      content: [
        {
          type: "component",
          title: "title",
          componentName: "panel",
          componentState: { label: "header" },
          height: 5
        },
        {
          type: "row",
          content: [
            {
              type: "component",
              title: "nav",
              componentName: "panel",
              componentState: { label: "left_sidebar" },
              width: 15
            },
            {
              title: "content",
              type: "component",
              componentName: "panel",
              componentState: { label: "content" },
              width: 60
            },
            {
              type: "component",
              title: "edit",
              componentName: "panel",
              componentState: { label: "right_sidebar" },
              width: 25
            }
          ]
        }
      ]
    }
  ]
}
)};
const _1do1a3 = function _config(is_mobile,default_mobile,default_desktop){return(
is_mobile ? default_mobile : default_desktop
)};
const _15lk82w = (M, _) => new M(_);
const _1bki6eh = _ => _.generator;
const _lp1ggk = function _is_mobile(width){return(
width < 800
)};
const _1i1sdev = function _layout_state(layout,$0,gl){return(
layout.on(
  "stateChanged",
  () => ($0.value = gl.LayoutConfig.fromResolved(layout.toConfig()))
)
)};
const _i1vgj3 = function _layout(gl,$0,page,panel,invalidation)
{
  const layout = new gl.GoldenLayout($0.value, page);
  layout.registerComponent("panel", panel);
  layout.init();
  invalidation.then(() => layout.destroy()); // avoid layouts stacking up
  return layout;
};
const _jjkr3u = function _panel(header,content,left_sidebar,right_sidebar){return(
function (container, component) {
  let node = undefined;
  if (component.label == "header") {
    node = header;
  } else if (component.label == "content") {
    node = content;
  } else if (component.label == "left_sidebar") {
    node = left_sidebar;
  } else if (component.label == "right_sidebar") {
    node = right_sidebar;
  } else if (component.label == "footer") {
    //node = footer;
  }

  // maintain scroll position in the state
  const c_element = container.getElement();
  const element = c_element.appendChild(node);
  debugger;
  container.on("open", () => {
    // Ugly this requires 2 animation frames to settle :/
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // actually needs 3 for mobile :s
          if (component.scrollTop) c_element.scrollTop = component.scrollTop;
          if (component.scrollLeft) c_element.scrollLeft = component.scrollLeft;
        });
      });
    });
  });
  c_element.addEventListener("scroll", (event) => {
    container.extendState({
      scrollTop: c_element.scrollTop,
      scrollLeft: c_element.scrollLeft
    });
  });
}
)};
const _1vg209t = function _isOnObservableCom(location){return(
() => location.href.includes("observableusercontent.com") &&
    !location.href.includes("blob:")
)};
const _haat14 = function _apply_layout(isOnObservableCom,base_css,light_theme_css,page_style_css,lopeviz_handle_css,minicellStyle,page)
{
  console.log("apply_layout");
  if (isOnObservableCom())
    return "Layout not applied when hosted on Observable";

  document.body.appendChild(base_css);
  document.body.appendChild(light_theme_css);
  document.body.appendChild(page_style_css);
  document.body.appendChild(lopeviz_handle_css);
  document.body.appendChild(minicellStyle);
  document.body.appendChild(page);
};
const _1wv6939 = function _headerStartDelimiter(){return(
Symbol()
)};
const _1egsm44 = function _header(visualizer,runtime,Inspector,invalidation,between,headerStartDelimiter,headerEndDelimiter){return(
visualizer(runtime, {
  inspector: Inspector.into,
  invalidation,
  detachNodes: true,
  filter: between(headerStartDelimiter, headerEndDelimiter),
  classList: "header"
})
)};
const _c5b5qc = function _title(md){return(
md`# Moldable Webfile (prototype II)`
)};
const _1lbdu4d = function _headerEndDelimiter(){return(
Symbol()
)};
const _6qi7dk = function _left_sidebar(visualizer,runtime,Inspector,invalidation,between,headerEndDelimiter,leftSidebarEndDelimiter){return(
visualizer(runtime, {
  inspector: Inspector.into,
  invalidation,
  detachNodes: true,
  filter: between(headerEndDelimiter, leftSidebarEndDelimiter),
  classList: "sidebar left"
})
)};
const _1l19trx = function _sidebar(md){return(
md`## Links`
)};
const _zrq6bq = function _links_list(md){return(
md`source on [observablehq.com](https://observablehq.com/@tomlarkworthy/moldable-webpage)

replicated to [Github](https://github.com/tomlarkworthy/lopecode)

hosted on [Moldable.app](https://tomlarkworthy.moldable.app/webpage.html)

🦋 [@larkworthy.bsky.social](https://bsky.app/profile/larkworthy.bsky.social)`
)};
const _1l1de0c = function _links_description(md){return(
md`## Main cells

includes all cells in the main module including those not in page panels.`
)};
const _2ojhc8 = function _minimap(visualizer,runtime,minicellInto,invalidation){return(
visualizer(runtime, {
  inspector: minicellInto,
  invalidation,
  detachNodes: false,
  classList: "minimap"
})
)};
const _9zagq5 = function _leftSidebarEndDelimiter(){return(
Symbol()
)};
const _18mza55 = function _right_sidebar(visualizer,runtime,Inspector,invalidation,between,leftSidebarEndDelimiter,rightSidebarEndDelimiter){return(
visualizer(runtime, {
  inspector: Inspector.into,
  invalidation,
  detachNodes: true,
  filter: between(leftSidebarEndDelimiter, rightSidebarEndDelimiter),
  classList: "sidebar right"
})
)};
const _j04bwn = function _exporter_header(md){return(
md`## [Export](https://observablehq.com/@tomlarkworthy/exporter)`
)};
const _19hiip4 = function _exporter_ref(exporter){return(
exporter({ headless: true })
)};
const _r3bub6 = function _editor_header(md){return(
md`## [Edit](https://observablehq.com/@tomlarkworthy/cell-editor)`
)};
const _ykisbk = function _editor_view($0){return(
$0
)};
const _1px74o1 = function _rightSidebarEndDelimiter(){return(
Symbol()
)};
const _pha4ka = function _content(visualizer,runtime,Inspector,invalidation,between,rightSidebarEndDelimiter,contentEndDelimiter){return(
visualizer(runtime, {
  inspector: Inspector.into,
  invalidation,
  detachNodes: true,
  filter: between(rightSidebarEndDelimiter, contentEndDelimiter),
  classList: "content"
})
)};
const _13zik0n = function _intro(md){return(
md`# Decentralised Webfile Development

⚠️ This is out-of-date and half broken. The latest iteration is the [moldable-index](https://observablehq.com/@tomlarkworthy/moldable-index)

This webpage looks kinda vanilla but it is <span class="fire_text">**different**</span>.

First, it contains a live coding runtime, something analogous to a spreadsheet (the [observablehq/runtime](https://github.com/observablehq/runtime)). When the code changes, it updates instantly. 

Second, it bundles its own code editor, so you can change the page from within. 

Third, the page can serialize itself _and_ all its dependancies into a single HTML that can be run from the local filesystem. Its truly serverless in the sense of not requiring a webserver (not even a local one). Its offline-first in the sense you don't need an internet connection to run the file (which is a simple double click from your filesystem).

The reactive runtime has the concept of modules, the software architecture is modular and assembled in userspace from orthogonal tools. [Editor](https://observablehq.com/@tomlarkworthy/editor) the cell editor. [Exporter](https://observablehq.com/@tomlarkworthy/exporter) the page serializer and [Visualizer](https://observablehq.com/@tomlarkworthy/visualizer) the cell renderer. You can add more tooling with importing from the [Observbalehq.com](https://observablehq.com/) ecosystem. There is actually an [AI](https://observablehq.com/@tomlarkworthy/robocoop) too, which helped write the complicated part, the ObservableJS compiler/decompiler [toolchain](https://observablehq.com/@tomlarkworthy/observablejs-toolchain).

Amazingly this is around 1MB in size, for an entirely self-hosted, self-sustainable, recursively exportable, offline-first, file-first, hermetic, web-based programming substrate.

This notebook is uploaded to [Github](https://github.com/tomlarkworthy/lopecode/blob/main/webpage.html) where it can be [served](https://tomlarkworthy.github.io/lopecode/webpage.html) directly using pages _without_ a build configuration.

I made this to see if it was possible to have a zero tooling rapid development platform. This is probably not that *yet*, this is a proof-of-concept. There are some userspace parts missing, for example, static file upload (Serializer can serialize FileAttachments, but there is no way in userspace to upload them yet - you have to do that on [observablehq.com](https://observablehq.com/)).`
)};
const _18bdz1k = function _34(md){return(
md`# <span class="fire_text">[HYTRADBOI 2025?](https://www.hytradboi.com/2025)</span>

🤞 this is accepted for the online conference "Have You Tried Rubbing a Database On It" as an interesting programming language topic`
)};
const _11u1ih7 = function _instructions(md){return(
md`## How to use

You can drag cells around the page using the dotted square handle.

You can click a cell to get make it editable in the editor, or click it on the minimap on the left.

At the bottom of the editors cells chooser drop down is \`<new cell>\`. This will add a new cell underneath the last click one.

The header/sidepanel/content panels are resizable and dockable.

The exporter has a "preview" button which exports the page to an ephemeral tab, and a "download" which copies the whole thing including the latest modifications to an offline-file.

The editing experience is not there yet. Probably wiser to fork the [original Observable](https://observablehq.com/@tomlarkworthy/moldable-webpage) notebook if you seriously want to create a webpage.

Observable is a single linear list of cells, we map those to different panel sections using \`delimiter\` cells. It is possible to create cells outside those delimiters, and then they will not appear in a panel. The left sidepanel has a complete list of cells which are also draggable and clickable.`
)};
const _18i7c0q = function _todo(md){return(
md`## TODO
- On mobile clicking the apply button loses the editor focus. We should refocus it automatically (editor)
- Editor does not load on safari :(`
)};
const _1nyd7t9 = function _contentEndDelimiter(){return(
Symbol()
)};
const _ykw1r1 = function _footerEndDelimiter(){return(
Symbol()
)};
const _x0n4wx = function _between(){return(
(symbolStart, symbolEnd) => (variable, index, state) => {
  if (variable._value === symbolStart) {
    state.between = true;
  } else if (variable._value === symbolEnd) {
    state.between = undefined;
  } else {
    return state.between;
  }
}
)};
const _1n78po6 = function _imports(md){return(
md`## Imports`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["graph (4).svg"].map((name) => {
    const module_name = "@tomlarkworthy/moldable-webpage";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/golden-layout-2-6-0", async () => runtime.module((await import("/@tomlarkworthy/golden-layout-2-6-0.js?v=4")).default));  
  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter", async () => runtime.module((await import("/@tomlarkworthy/exporter.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor", async () => runtime.module((await import("/@tomlarkworthy/editor.js?v=4")).default));  
  main.define("module d/e1c39d41e8e944b0@939", async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4")).default));  
  main.define("module @tomlarkworthy/minicell", async () => runtime.module((await import("/@tomlarkworthy/minicell.js?v=4")).default));  
  $def("_17hago", "page", ["isOnObservableCom","htl"], _17hago);  
  $def("_1fgi7xd", "page_style_css", ["htl"], _1fgi7xd);  
  $def("_pa9sfk", "lopeviz_handle_css_ref", ["lopeviz_handle_css"], _pa9sfk);  
  $def("_1r9jtde", "minicellStyle_ref", ["minicellStyle"], _1r9jtde);  
  $def("_1g9p5oo", "base_css_ref", ["base_css"], _1g9p5oo);  
  $def("_1bn7g52", "light_theme_css_ref", ["light_theme_css"], _1bn7g52);  
  $def("_vx2w2o", "default_mobile", [], _vx2w2o);  
  $def("_1ck7p4y", "default_desktop", [], _1ck7p4y);  
  $def("_1do1a3", "initial config", ["is_mobile","default_mobile","default_desktop"], _1do1a3);  
  $def("_15lk82w", "mutable config", ["Mutable","initial config"], _15lk82w);  
  $def("_1bki6eh", "config", ["mutable config"], _1bki6eh);  
  $def("_lp1ggk", "is_mobile", ["width"], _lp1ggk);  
  $def("_1i1sdev", "layout_state", ["layout","mutable config","gl"], _1i1sdev);  
  $def("_i1vgj3", "layout", ["gl","mutable config","page","panel","invalidation"], _i1vgj3);  
  $def("_jjkr3u", "panel", ["header","content","left_sidebar","right_sidebar"], _jjkr3u);  
  $def("_1vg209t", "isOnObservableCom", ["location"], _1vg209t);  
  $def("_haat14", "apply_layout", ["isOnObservableCom","base_css","light_theme_css","page_style_css","lopeviz_handle_css","minicellStyle","page"], _haat14);  
  $def("_1wv6939", "headerStartDelimiter", [], _1wv6939);  
  $def("_1egsm44", "header", ["visualizer","runtime","Inspector","invalidation","between","headerStartDelimiter","headerEndDelimiter"], _1egsm44);  
  $def("_c5b5qc", "title", ["md"], _c5b5qc);  
  $def("_1lbdu4d", "headerEndDelimiter", [], _1lbdu4d);  
  $def("_6qi7dk", "left_sidebar", ["visualizer","runtime","Inspector","invalidation","between","headerEndDelimiter","leftSidebarEndDelimiter"], _6qi7dk);  
  $def("_1l19trx", "sidebar", ["md"], _1l19trx);  
  $def("_zrq6bq", "links_list", ["md"], _zrq6bq);  
  $def("_1l1de0c", "links_description", ["md"], _1l1de0c);  
  $def("_2ojhc8", "minimap", ["visualizer","runtime","minicellInto","invalidation"], _2ojhc8);  
  $def("_9zagq5", "leftSidebarEndDelimiter", [], _9zagq5);  
  $def("_18mza55", "right_sidebar", ["visualizer","runtime","Inspector","invalidation","between","leftSidebarEndDelimiter","rightSidebarEndDelimiter"], _18mza55);  
  $def("_j04bwn", "exporter_header", ["md"], _j04bwn);  
  $def("_19hiip4", "exporter_ref", ["exporter"], _19hiip4);  
  $def("_r3bub6", "editor_header", ["md"], _r3bub6);  
  $def("_ykisbk", "editor_view", ["viewof editor"], _ykisbk);  
  $def("_1px74o1", "rightSidebarEndDelimiter", [], _1px74o1);  
  $def("_pha4ka", "content", ["visualizer","runtime","Inspector","invalidation","between","rightSidebarEndDelimiter","contentEndDelimiter"], _pha4ka);  
  $def("_13zik0n", "intro", ["md"], _13zik0n);  
  $def("_18bdz1k", null, ["md"], _18bdz1k);  
  $def("_11u1ih7", "instructions", ["md"], _11u1ih7);  
  $def("_18i7c0q", "todo", ["md"], _18i7c0q);  
  $def("_1nyd7t9", "contentEndDelimiter", [], _1nyd7t9);  
  $def("_ykw1r1", "footerEndDelimiter", [], _ykw1r1);  
  $def("_x0n4wx", "between", [], _x0n4wx);  
  $def("_1n78po6", "imports", ["md"], _1n78po6);  
  main.define("gl", ["module @tomlarkworthy/golden-layout-2-6-0", "@variable"], (_, v) => v.import("gl", _));  
  main.define("base_css", ["module @tomlarkworthy/golden-layout-2-6-0", "@variable"], (_, v) => v.import("base_css", _));  
  main.define("light_theme_css", ["module @tomlarkworthy/golden-layout-2-6-0", "@variable"], (_, v) => v.import("light_theme_css", _));  
  main.define("visualizer", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("visualizer", _));  
  main.define("Inspector", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("allVariables", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("allVariables", _));  
  main.define("cellMaps", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("cellMaps", _));  
  main.define("lopeviz_handle_css", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("lopeviz_handle_css", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("viewof editor", ["module @tomlarkworthy/editor", "@variable"], (_, v) => v.import("viewof editor", _));  
  main.define("editor", ["module @tomlarkworthy/editor", "@variable"], (_, v) => v.import("editor", _));  
  main.define("runtime", ["module d/e1c39d41e8e944b0@939", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module d/e1c39d41e8e944b0@939", "@variable"], (_, v) => v.import("main", _));  
  main.define("minicellInto", ["module @tomlarkworthy/minicell", "@variable"], (_, v) => v.import("into", "minicellInto", _));  
  main.define("minicellStyle", ["module @tomlarkworthy/minicell", "@variable"], (_, v) => v.import("style", "minicellStyle", _));
  return main;
}