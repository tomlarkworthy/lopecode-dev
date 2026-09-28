---
scope: [local-development, in-notebook]
write-triggers:
  - "\\]\\(#(?!(open|view|close|focus)=)[A-Za-z_$]"
  - "<a\\b[^>]*\\bhref=[\"']?#(?!(open|view|close|focus)=)[A-Za-z_$]"
---

# Links to cells and sections in a lopepage notebook (tables of contents)

In a lopepage notebook the URL hash holds the pane layout: `#view=R100(S60(@a/doc),S40(@a/other))`.
A plain fragment link such as `[radio](#radio_docs)` or `<a href="#radio_docs">` replaces that whole
hash. The layout is lost from the URL and nothing scrolls, because no element has the id
`radio_docs`.

Measured on `@tomlarkworthy/inputs-reference` (Playwright, 2026-09-28), clicking the `radio` link of
its table of contents:

| link | hash after the click | `Inputs.radio` heading top |
|---|---|---|
| `[radio](#radio_docs)` | `#radio_docs` | 1049px (did not move) |
| `linkTo('@tomlarkworthy/inputs-reference#radio_docs', …)` | `#view=R100(S70(@tomlarkworthy/inputs-reference#radio_docs),…)` | 24px |

## Use linkTo from @tomlarkworthy/lopepage-urls

`linkTo('<module>#<cellName>')` returns an intent href (`#open=@a/doc#cellName`). Lopepage merges it
into the live layout, keeps the other panes, and scrolls the pane to that cell. It does not navigate
away from the page. The target is a cell **name**, so each section heading must be a named cell.

Copied from `@tomlarkworthy/inputs-reference.contents_docs`
(lopebooks/notebooks/@tomlarkworthy_robocoop-5.html); `@tomlarkworthy/observablejs-reference` uses the
same form:

```js
const _111coap = function _contents_docs(md,linkTo){return(
md`## Contents

**Choice** &nbsp; [\`radio\`](${ linkTo('@tomlarkworthy/inputs-reference#radio_docs', { onObservable: false }) }) · [\`checkbox\`](${ linkTo('@tomlarkworthy/inputs-reference#checkbox_docs', { onObservable: false }) })
`
)};
```

and in `define`:

```js
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));
  $def("_111coap", "contents_docs", ["md","linkTo"], _111coap);
```

A click handler that writes the hash must not assign `location.hash` either; `navigate(href)` from the
same module does it (it also works in a forked notebook on `blob:`).

## Before you change a table of contents

- Read the module first. If it already has a Contents cell built with `linkTo`, it works; extend it
  for sections it misses rather than rewriting it.
- Check the result by clicking a link, not by reading the rendered text. The module must be open in
  a pane for its links to render (w18's fixed run clicked nothing because it was not). In `eval_js`, `.click()` one
  link of the rendered cell and read `location.hash` and the target heading's
  `getBoundingClientRect().top`: the hash must still contain `view=` and the heading must be near the
  top of the viewport.
