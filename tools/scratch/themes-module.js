const _xfyyu1 = function _1(md){return(
md`# Themes

This module provides theming for lopecode notebooks. It sources CSS from [Observable's notebook-kit](https://github.com/observablehq/notebook-kit) themes, which define CSS custom properties for colors, fonts, and syntax highlighting.

## Exports

| Export | Type | Description |
|--------|------|-------------|
| \`themes\` | \`Map<string, string[]>\` | Map of theme name → array of CSS URLs |
| \`viewof theme_assets\` | \`DOM\` | Theme selector dropdown |
| \`theme_assets\` | \`string[]\` | CSS URLs for the currently selected theme |
| \`current_theme\` | \`string[]\` | Auto-detected currently active theme URLs |
| \`css\` | \`[url, text][]\` | Fetched CSS text pairs for current theme |
| \`cssForTheme\` | \`(name) → [url, text][]\` | Function to fetch CSS for any theme by name |
| \`extra_css\` | \`[url, text]\` | Additional CSS (syntax colors, layout) |
| \`theme_properties\` | \`Object\` | All CSS custom property values for the current theme as a JS object |

## Usage from other notebooks
\`\`\`js
import {themes, theme_properties, css} from "@tomlarkworthy/themes"
\`\`\`
`
)};
const _i1kq4s = function _2(md){return(
md`## Theme Selector

Choose a theme below. The selected theme's CSS is loaded and applied. All downstream cells — \`css\`, \`theme_properties\`, and the property preview — reactively update when the selection changes.`
)};
const _1fzvdss = function _theme_assets(Inputs,themes,current_theme){return(
Inputs.select(themes, { value: current_theme || themes.get('near-midnight') })
)};
const _2dvbva = function _4(md){return(
md`## Theme Properties

The \`theme_properties\` cell extracts all CSS custom properties (\`--theme-*\`, \`--syntax-*\`, fonts, etc.) from the currently selected theme's CSS into a plain JavaScript object. This lets other notebooks consume theme values programmatically — for example, to set canvas colors, configure chart palettes, or generate inline styles — without parsing CSS.`
)};
const _1k4keny = function _theme_properties(css){return(
(() => {
    const props = {};
    for (const [url, text] of css) {
        if (typeof text !== 'string')
            continue;
        for (const match of text.matchAll(/^\s+(--[a-z0-9-]+)\s*:\s*([^;]+);/gm)) {
            props[match[1]] = match[2].trim();
        }
    }
    return props;
})()
)};
const _1u7rv6o = function _6(htl,theme_properties,html){return(
htl.html`<div style="background: var(--theme-background); color: var(--theme-foreground);">
<h4 style="background: var(--theme-background); color: var(--theme-foreground);">CSS variables</h4>

${ Object.entries(theme_properties).map(([key, value]) => {
    const isColor = /^(#|rgb|hsl|color-mix)/.test(value) || /^var\(--theme-(foreground|background|error)/.test(value);
    return html`<p><span style="width: 16px; height: 16px; border-radius: 3px; border: 1px solid var(--theme-foreground-faintest); background: ${ isColor ? 'var(' + key + ')' : 'transparent' }; display: inline-block; vertical-align: middle;"></span> <code>${ key }</code> <span style="color: var(--theme-foreground-muted)">${ value }</span></p>`;
}) }

</div>
`
)};
const _1x7s9wa = function _7(md){return(
md`## Implementation`
)};
const _vhnhz5 = function _themes()
{
    const baseURL = 'https://raw.githubusercontent.com/observablehq/notebook-kit/6c2ec69e1ac30dd329789524a849578b2df17945/src/styles/';
    return new Map(Object.entries({
        air: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-air.css',
            baseURL + 'abstract-light.css',
            baseURL + 'syntax-light.css'
        ],
        coffee: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-coffee.css',
            baseURL + 'abstract-dark.css',
            baseURL + 'syntax-dark.css'
        ],
        cotton: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-cotton.css',
            baseURL + 'abstract-light.css',
            baseURL + 'syntax-light.css'
        ],
        'deep-space': [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-deep-space.css',
            baseURL + 'syntax-dark.css'
        ],
        glacier: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-glacier.css',
            baseURL + 'abstract-light.css',
            baseURL + 'syntax-light.css'
        ],
        ink: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-ink.css',
            baseURL + 'abstract-dark.css',
            baseURL + 'syntax-dark.css'
        ],
        midnight: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-midnight.css',
            baseURL + 'abstract-dark.css',
            baseURL + 'syntax-dark.css'
        ],
        'near-midnight': [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-near-midnight.css',
            baseURL + 'abstract-dark.css',
            baseURL + 'syntax-dark.css'
        ],
        'ocean-floor': [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-ocean-floor.css',
            baseURL + 'abstract-dark.css',
            baseURL + 'syntax-dark.css'
        ],
        parchment: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-parchment.css',
            baseURL + 'abstract-light.css',
            baseURL + 'syntax-light.css'
        ],
        slate: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-slate.css',
            baseURL + 'abstract-dark.css',
            baseURL + 'syntax-dark.css'
        ],
        stark: [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-stark.css',
            baseURL + 'syntax-dark.css'
        ],
        'sun-faded': [
            baseURL + 'global.css',
            baseURL + 'inspector.css',
            baseURL + 'highlight.css',
            baseURL + 'plot.css',
            baseURL + 'index.css',
            baseURL + 'theme-sun-faded.css',
            baseURL + 'abstract-dark.css',
            baseURL + 'syntax-dark.css'
        ]
    }));
};
const _iq48k6 = function _cssForTheme(themes,extra_css){return(
async theme => [
    ...await Promise.all(themes.get(theme).map(async url => [
        url,
        await (await fetch(url)).text()
    ])),
    extra_css
]
)};
const _e3ckjw = async function _css(theme_assets,extra_css){return(
[
    ...await Promise.all(theme_assets.map(async url => [
        url,
        await (await fetch(url)).text()
    ])),
    extra_css
]
)};
const _d7mxvx = function _extra_css(){return(
[
    'file://syntax.css',
    `
/* Center page */
.lopecode-visualizer {
    max-width: 1200px;
    margin: auto;
}

/* highlight.js token colors */
.hljs-comment {
  color: var(--syntax-comment);
}

.hljs-params,
.hljs-built_in {
  color: var(--syntax-variable);
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-section,
.hljs-doctag,
.hljs-type,
.hljs-tag,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class,
.hljs-strong {
  color: var(--syntax-keyword);
}

.hljs-attr {
  color: var(--syntax-definition);
}


.hljs-deletion,
.hljs-variable {
  color: #e377c2;
}

.hljs-literal {
  color: var(--syntax-atom);
}

.hljs-number,
.hljs-regexp,
.hljs-bullet,
.hljs-link {
  color: var(--syntax-literal);
}

.hljs-string,
.hljs-meta,
.hljs-symbol,
.hljs-template-tag,
.hljs-template-variable,
.hljs-addition {
  color: var(--syntax-string);
}`
]
)};
const _rijq1n = function _current_theme(themes){return(
[...themes.values()].find(assets => assets.every(url => document.getElementById(url)))
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map([].map((name) => {
    const module_name = "@tomlarkworthy/themes";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  $def("_xfyyu1", null, ["md"], _xfyyu1);  
  $def("_i1kq4s", null, ["md"], _i1kq4s);  
  $def("_1fzvdss", "viewof theme_assets", ["Inputs","themes","current_theme"], _1fzvdss);  
  main.variable(observer("theme_assets")).define("theme_assets", ["Generators", "viewof theme_assets"], (G, _) => G.input(_));  
  $def("_2dvbva", null, ["md"], _2dvbva);  
  $def("_1k4keny", "theme_properties", ["css"], _1k4keny);  
  $def("_1u7rv6o", null, ["htl","theme_properties","html"], _1u7rv6o);  
  $def("_1x7s9wa", null, ["md"], _1x7s9wa);  
  $def("_vhnhz5", "themes", [], _vhnhz5);  
  $def("_iq48k6", "cssForTheme", ["themes","extra_css"], _iq48k6);  
  $def("_e3ckjw", "css", ["theme_assets","extra_css"], _e3ckjw);  
  $def("_d7mxvx", "extra_css", [], _d7mxvx);  
  $def("_rijq1n", "current_theme", ["themes"], _rijq1n);
  return main;
}
