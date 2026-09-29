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
away from the page. The target is a cell **name**. Most md cells are anonymous (`$def("_x", null, …)`),
and so is a cell the user adds later, so linkTo suits a contents list written for named cells. For
anonymous headings, or a list that must follow new headings, see "A contents list that stays up to
date" below; do not rename the user's cells to make linkTo work.

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

## A contents list that stays up to date

A list typed from today's headings (a string, an array of titles, or linkTo lines) is correct when
written and misses every heading added afterwards. When the user wants the list to follow their
headings, build it from the headings rendered in the module's pane: the pane is
`nav.closest(".lp2-pane")`, and a `MutationObserver` on it rebuilds the list when a heading is added,
removed or re-rendered. The observer sees every mutation in the pane, including each frame of an
animating cell, so it first checks whether the mutation touches an `h1`–`h3` (a cost proportional to
the mutation, not the pane) and coalesces rebuilds to one per animation frame. Calling `build` on
every record would re-query the whole pane per frame (not measured here; the annotate module paid
48.6% of the main thread for the same pattern, 2026-08-08). Each entry is `href="#"` with an `onclick` that calls `preventDefault()` and
`scrollIntoView` on the heading. The pane scrolls (see scrolling-a-lopepage-notebook.md) and the layout
hash is untouched.

The link form is copied from `@tomlarkworthy/lopecode-live-2026.ref`
(lopebooks/notebooks/tomlarkworthy_lopecode-newsletter-002.html). No corpus notebook builds a contents list from
rendered headings (`querySelectorAll('h1,h2…')` occurs in 0 files, 2026-09-29), so the idiom has no
precedent; `@tomlarkworthy/view.toc` fetches `@nebrius/indented-toc` from api.observablehq.com at run
time and does not work offline. The cell below was checked by rc5t-toc-live (2026-09-29): a heading cell added after
the turn is listed within 3 s, clicks bring the heading into its pane, and the list survives save and
reopen.

```js
const _toc = function _toc(htl,invalidation){return(
(() => {
  const nav = htl.html`<nav><strong>Contents</strong><div></div></nav>`;
  const list = nav.lastElementChild;
  let pane = null, seen = "";
  const headings = () => [...pane.querySelectorAll("h1,h2,h3")]
    .filter(h => !nav.contains(h) && (nav.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING));
  const build = () => {
    const hs = headings();
    const key = hs.map(h => h.tagName + h.textContent).join("\n");
    if (key === seen) return; // the rebuild mutates nav; without this the observer loops
    seen = key;
    list.replaceChildren(...hs.map(h => {
      const text = h.textContent.trim(), level = +h.tagName[1];
      return htl.html`<a href="#" style="display:block; padding-left:${(level - 1) * 1.2}em" onclick=${e => {
        e.preventDefault();
        headings().find(x => x.textContent.trim() === text)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}>${text}</a>`;
    }));
  };
  // Rebuild only for a mutation that adds, removes or edits a heading, and at most once a frame.
  const H = "h1,h2,h3";
  const hasHeading = n => n.nodeType === 1 && (n.matches(H) || n.querySelector(H) !== null);
  const touchesHeading = r => r.type === "characterData"
    ? !!r.target.parentElement?.closest(H)
    : !!r.target.closest(H) || [...r.addedNodes, ...r.removedNodes].some(hasHeading);
  let queued = false;
  const observer = new MutationObserver(records => {
    if (queued || !records.some(touchesHeading)) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; build(); });
  });
  const attach = () => {
    if (!nav.isConnected) return requestAnimationFrame(attach);
    pane = nav.closest(".lp2-pane") || document.body;
    observer.observe(pane, { childList: true, subtree: true, characterData: true });
    build();
  };
  attach();
  invalidation.then(() => observer.disconnect());
  return nav;
})()
)};
```

Define it right after the title cell so it renders at the top: `$def("_toc", "toc", ["htl","invalidation"], _toc);`.
The click handler looks the heading up again at click time because a re-rendered md cell replaces its
heading element. To check it, add a cell with `eval_js` the way the editor does
(`const v = module.variable({}); v.define(["md"], md => md\`## New section\`)`), confirm the list gains
the entry, then delete that variable.

## Before you change a table of contents

- Read the module first. If it already has a Contents cell built with `linkTo`, it works; extend it
  for sections it misses rather than rewriting it, unless the user asked for a list that follows new
  headings.
- Check the result by clicking a link, not by reading the rendered text. The module must be open in
  a pane for its links to render (w18's fixed run clicked nothing because it was not). In `eval_js`, `.click()` one
  link of the rendered cell and read `location.hash` and the target heading's
  `getBoundingClientRect().top`: the hash must still contain `view=` and the heading must be near the
  top of the viewport.
