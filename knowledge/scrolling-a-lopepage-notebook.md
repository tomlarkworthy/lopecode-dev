---
scope: [local-development, in-notebook]
write-triggers:
  - "window\\.scroll(To|By)?\\("
  - "\\bscrollY\\b"
  - "\\bpageYOffset\\b"
  - "document\\.(documentElement|body|scrollingElement)\\.scroll(Top|To|By)\\b"
---

# Scrolling in a lopepage notebook

In a lopepage notebook the window does not scroll. Each module in the layout is shown in its own
pane, `<div class="lp2-pane" data-module="@user/name">`, and that pane is the scroll container.
`window.scrollTo(0, 0)` moves nothing (measured below). `window.scrollY` and
`document.documentElement.scrollTop` read the window, not a pane (inferred from the window not
being scrollable; not measured separately).

Measured 2026-09-29 (Playwright, 1280x800) on a robocoop-5 notebook saved with an agent's
"Scroll to top" palette command that ran `window.scrollTo({top: 0, behavior: 'smooth'})`:

```
panes scrollable: .lp2-pane 2179/776, .lp2-pane 2469/779      window: not scrollable
scrolled to bottom:       1403, 1690
after "Scroll to top":    1403, 1690      (window.scrollTo moved nothing)
pane.scrollTo({top: 0}):  0, 0            (instant and smooth both land)
```

The agent reported "Smoothly scrolls the page back to the top". It had checked that the palette
listed the command, not what the command did (run `20260929-0620-m45-before2`).

## Scroll the pane a cell is in

Copied from `@tomlarkworthy/lopecode-live-2026._cite`
(`lopebooks/notebooks/tomlarkworthy_lopecode-live-2026.html`), which also works outside lopepage:

```js
const scroller = (el) => el?.closest('.lp2-pane') ?? document.scrollingElement;
scroller(someElementInTheCell).scrollTop = 0;
```

## Scroll every pane (the whole page)

For a command that is not tied to one cell, such as a palette command or a keyboard shortcut:

```js
for (const pane of document.querySelectorAll('.lp2-pane')) pane.scrollTo({ top: 0, behavior: 'smooth' });
document.scrollingElement.scrollTo({ top: 0 }); // the notebook opened without lopepage
```

`document.querySelectorAll('.lp2-pane[data-module]')` is also how `@tomlarkworthy/robocoop-5-context`
finds the visible cells of each pane. To scroll to one cell rather than to the top,
`element.scrollIntoView()` scrolls whichever ancestor scrolls (browser behaviour; not measured
in a lopepage notebook).

## Check it

Test the command's effect, not only that it exists: scroll a pane down, run the command, read the
pane's `scrollTop`.

```js
const pane = document.querySelector('.lp2-pane[data-module="@user/name"]');
pane.scrollTop = pane.scrollHeight;   // then run the command, wait ~1 s for a smooth scroll
return pane.scrollTop;                // 0 when it worked
```

Not checked: lopepage-2's scroll anchoring (`lp2_installAnchor`) re-applies an anchor on resize.
A `scrollTop = 0` held for 1.5 s in the measurement above; a resize immediately after the scroll was
not tested.
