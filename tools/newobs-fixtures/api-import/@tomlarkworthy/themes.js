const _150 = function(md){return(
md`# Themes

This module provides theming for lopecode notebooks. It sources CSS from [Observable's notebook-kit](https://github.com/observablehq/notebook-kit) themes, which define CSS custom properties for colors, fonts, and syntax highlighting.

## Exports

| Export | Type | Description |
|--------|------|-------------|
| \`themes\` | \`Map<string, string[]>\` | Map of theme name → array of CSS URLs |
| \`viewof theme_assets\` | \`DOM\` | Theme selector dropdown |
| \`theme_assets\` | \`string[]\` | CSS URLs for the currently selected theme |
| \`theme_name\` | \`string\` | Currently selected theme name |
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

const _151 = function viewof$theme_assets(Inputs,themes,current_theme){return(
Inputs.select(themes, {
  label: 'Theme',
  value: current_theme || themes.get('near-midnight')
})
)};

const _152 = function theme_name(themes,theme_assets){return(
[...themes.entries()].find(([, assets]) => assets === theme_assets)?.[0] ?? 'unknown'
)};

const _153 = function apply_theme(css,themes,theme_assets,html)
{
  const view = document.defaultView;
  const sheets = [];
  for (const [url, text] of css) {
    if (typeof text !== 'string')
      continue;
    try {
      const sheet = new view.CSSStyleSheet();
      sheet.replaceSync(text);
      sheets.push(sheet);
    } catch (e) {
      console.warn('Could not adopt stylesheet', url, e);
    }
  }
  document.adoptedStyleSheets = sheets;
  // Sync embedded <script id="<url>" data-mime="text/css"> cache blocks so
  // current_theme (which sniffs by document.getElementById) and the next
  // export reflect the live selection. Only touches blocks that belong to
  // known theme URLs — leaves unrelated CSS asset blocks alone.
  const knownThemeUrls = new Set();
  for (const list of themes.values())
    for (const u of list)
      knownThemeUrls.add(u);
  for (const u of knownThemeUrls) {
    if (!theme_assets.includes(u))
      document.getElementById(u)?.remove();
  }
  for (const [url, text] of css) {
    if (!url || !url.startsWith('http'))
      continue;
    if (!theme_assets.includes(url))
      continue;
    let s = document.getElementById(url);
    if (!s) {
      s = document.createElement('script');
      s.id = url;
      s.type = 'text/plain';
      s.setAttribute('data-mime', 'text/css');
      document.head.appendChild(s);
    }
    // Always replace text so a freshly-fetched theme overwrites stale cache.
    if (!s.hasAttribute('data-encoding'))
      s.textContent = text;
  }
  return html`<div style="font:11px/1.4 var(--monospace, ui-monospace, monospace);color:var(--theme-foreground-muted);padding:6px 10px;border:1px solid var(--theme-foreground-faintest);border-radius:4px;display:inline-block">Applied ${ sheets.length } stylesheets to the page.</div>`;
}
;

const _154 = function inject(theme_properties,html,htl,theme_name){return(
(() => {
  const props = theme_properties;
  const get = (k) => props[k] || "";
  const groups = {
    Background: [
      "--theme-background",
      "--theme-background-a",
      "--theme-background-b",
      "--theme-background-raised"
    ],
    Foreground: [
      "--theme-foreground",
      "--theme-foreground-muted",
      "--theme-foreground-faint",
      "--theme-foreground-fainter",
      "--theme-foreground-faintest",
      "--theme-foreground-focus",
      "--theme-foreground-error"
    ],
    Syntax: [
      "--syntax-keyword",
      "--syntax-string",
      "--syntax-comment",
      "--syntax-literal",
      "--syntax-atom",
      "--syntax-variable",
      "--syntax-definition"
    ]
  };
  const fonts = [
    ["--serif", "Serif"],
    ["--sans-serif", "Sans-serif"],
    ["--monospace", "Monospace"]
  ].filter(([k]) => props[k]);
  const swatch = (key) => {
    const value = get(key);
    if (!value) return "";
    return html`<div style="display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:4px;font:12px/1.4 var(--monospace, ui-monospace, monospace)">
            <span style="width:28px;height:28px;border-radius:4px;border:1px solid var(--theme-foreground-faintest);background:var(${key});flex:none"></span>
            <div style="display:flex;flex-direction:column;min-width:0;flex:1">
                <code style="color:var(--theme-foreground)">${key}</code>
                <span style="color:var(--theme-foreground-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${value}</span>
            </div>
        </div>`;
  };
  const fontSample = ([key, label]) => {
    const family = get(key);
    const isMono = /mono/i.test(label) || /mono/i.test(key);
    return html`<div style="padding:10px 12px;border:1px solid var(--theme-foreground-faintest);border-radius:6px;background:var(--theme-background-a, var(--theme-background))">
            <div style="font:11px/1.2 var(--sans-serif, ui-sans-serif, system-ui);color:var(--theme-foreground-muted);margin-bottom:6px;letter-spacing:0.04em;text-transform:uppercase">${label}</div>
            <div style="font-family:${family};font-size:${
      isMono ? "14px" : "22px"
    };line-height:1.3;color:var(--theme-foreground)">
                ${
                  isMono
                    ? html`<code>const greeting = "Hello, world";</code>`
                    : "The quick brown fox jumps over the lazy dog"
                }
            </div>
            <div style="font:11px/1.4 var(--monospace, ui-monospace, monospace);color:var(--theme-foreground-faint);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${family}</div>
        </div>`;
  };
  const codeSample = html`<pre style="margin:0;padding:12px;border-radius:6px;background:var(--theme-background-a, var(--theme-background));border:1px solid var(--theme-foreground-faintest);font:13px/1.5 var(--monospace, ui-monospace, monospace);color:var(--theme-foreground);overflow-x:auto"><span style="color:var(--syntax-comment)">// fibonacci</span>
<span style="color:var(--syntax-keyword)">function</span> <span style="color:var(--syntax-definition)">fib</span>(<span style="color:var(--syntax-variable)">n</span>) {
  <span style="color:var(--syntax-keyword)">if</span> (n &lt; <span style="color:var(--syntax-literal)">2</span>) <span style="color:var(--syntax-keyword)">return</span> n;
  <span style="color:var(--syntax-keyword)">return</span> <span style="color:var(--syntax-string)">\`fib(\${n})\`</span>;
}
<span style="color:var(--syntax-keyword)">const</span> result = fib(<span style="color:var(--syntax-literal)">10</span>);
<span style="color:var(--syntax-keyword)">return</span> <span style="color:var(--syntax-atom)">null</span>;</pre>`;
  return htl.html`<div style="background:var(--theme-background);color:var(--theme-foreground);padding:16px;border-radius:8px;font-family:var(--serif, var(--sans-serif, ui-sans-serif, system-ui))">
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:14px">
            <h3 style="margin:0;font-family:var(--serif, var(--sans-serif, ui-sans-serif));color:var(--theme-foreground)">${theme_name}</h3>
            <span style="font:12px/1 var(--monospace, ui-monospace, monospace);color:var(--theme-foreground-muted)">theme preview</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:18px">
            ${fonts.map(fontSample)}
        </div>

        <h4 style="margin:18px 0 8px;font:13px/1 var(--sans-serif, ui-sans-serif, system-ui);letter-spacing:0.04em;text-transform:uppercase;color:var(--theme-foreground-muted)">Syntax</h4>
        ${codeSample}

        <h4 style="margin:18px 0 8px;font:13px/1 var(--sans-serif, ui-sans-serif, system-ui);letter-spacing:0.04em;text-transform:uppercase;color:var(--theme-foreground-muted)">Colors</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px">
            ${Object.entries(groups).map(
              ([title, keys]) => html`<div>
                <div style="font:11px/1.2 var(--sans-serif, ui-sans-serif, system-ui);color:var(--theme-foreground-muted);margin-bottom:6px;letter-spacing:0.04em;text-transform:uppercase">${title}</div>
                <div style="display:flex;flex-direction:column;gap:2px">
                    ${keys.map(swatch)}
                </div>
            </div>`
            )}
        </div>
    </div>`;
})()
)};

const _155 = function(md){return(
md`## All CSS variables

Every CSS custom property parsed from the active theme. \`theme_properties\` is exported as a plain JS object so other notebooks can consume theme values programmatically (canvas colors, chart palettes, inline styles) without parsing CSS.`
)};

const _156 = function(htl,theme_properties,html){return(
htl.html`<details style="background: var(--theme-background); color: var(--theme-foreground); padding: 12px; border-radius: 6px;">
<summary style="cursor:pointer;font-weight:600">Show all ${ Object.keys(theme_properties).length } properties</summary>

${ Object.entries(theme_properties).map(([key, value]) => {
  const isColor = /^(#|rgb|hsl|color-mix)/.test(value) || /^var\(--theme-(foreground|background|error)/.test(value);
  return html`<p style="margin:4px 0"><span style="width: 16px; height: 16px; border-radius: 3px; border: 1px solid var(--theme-foreground-faintest); background: ${ isColor ? 'var(' + key + ')' : 'transparent' }; display: inline-block; vertical-align: middle;"></span> <code>${ key }</code> <span style="color: var(--theme-foreground-muted)">${ value }</span></p>`;
}) }

</details>
`
)};

const _157 = function theme_properties(css){return(
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

const _158 = function(md){return(
md`## Implementation`
)};

const _159 = function themes()
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
}
;

const _160 = function cssForTheme(themes,extra_css){return(
async theme => [
  ...await Promise.all(themes.get(theme).map(async url => [
    url,
    await (await fetch(url)).text()
  ])),
  extra_css
]
)};

const _161 = async function css(theme_assets,extra_css){return(
[
  ...await Promise.all(theme_assets.map(async url => [
    url,
    await (await fetch(url)).text()
  ])),
  extra_css
]
)};

const _162 = function extra_css()
{
  // Only on ObservableHQ (the observableusercontent.com sandbox) do we bridge
  // the theme vars onto the underscore '--syntax_*' vars that Observable's
  // editor + inspector read. Off Observable we omit it so notebook authors use
  // the real --theme-* / --syntax-* vars, not these compatibility aliases.
  // Predicate mirrors @tomlarkworthy/runtime-sdk's isOnObservableCom.
  const onObservable = window.location.href.includes('observableusercontent.com') && !window.location.href.includes('blob:');
  const observableSyntaxBridge = onObservable ? `
:root {
  /* notebook-kit themes omit --syntax-normal (hyphen), so Observable's
     "next" inspector falls back to its hardcoded #1b1e23 on
     .observablehq--function/--gray/--expanded/etc. Alias just this one;
     the other --syntax-* hyphen vars are already theme-defined (don't
     re-alias them — that would self-reference). */
  --syntax-normal: var(--theme-foreground, #1b1e23);
  --syntax_normal: var(--theme-foreground, #1b1e23);
  --syntax_comment: var(--syntax-comment, #a9b0bc);
  --syntax_number: var(--syntax-literal, #20a5ba);
  --syntax_keyword: var(--syntax-keyword, #c30771);
  --syntax_atom: var(--syntax-atom, #10a778);
  --syntax_string: var(--syntax-string, #008ec4);
  --syntax_error: var(--syntax-invalid, var(--theme-foreground-error, #ffbedc));
  --syntax_unknown_variable: var(--syntax-variable, #838383);
  --syntax_known_variable: var(--syntax-definition, #005f87);
  --syntax_matchbracket: var(--syntax-keyword, #20bbfc);
  --syntax_key: var(--syntax-definition, #6636b4);
}
` : '';
  return [
    'file://syntax.css',
    observableSyntaxBridge + `
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
  ];
}
;

const _163 = function current_theme(themes){return(
[...themes.values()].find(assets => assets.every(url => document.getElementById(url)))
)};

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 150", ["md"], _150);
  main.define("viewof theme_assets", ["Inputs","themes","current_theme"], _151);
  main.define("theme_assets", ["Generators", "viewof theme_assets"], (G, _) => G.input(_));
  main.define("theme_name", ["themes","theme_assets"], _152);
  main.define("apply_theme", ["css","themes","theme_assets","html"], _153);
  main.define("inject", ["theme_properties","html","htl","theme_name"], _154);
  main.define("cell 155", ["md"], _155);
  main.define("cell 156", ["htl","theme_properties","html"], _156);
  main.define("theme_properties", ["css"], _157);
  main.define("cell 158", ["md"], _158);
  main.define("themes", [], _159);
  main.define("cssForTheme", ["themes","extra_css"], _160);
  main.define("css", ["theme_assets","extra_css"], _161);
  main.define("extra_css", [], _162);
  main.define("current_theme", ["themes"], _163);
  return main;
}
