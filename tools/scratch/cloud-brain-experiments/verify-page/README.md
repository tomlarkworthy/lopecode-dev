# verify-page: one Worker's tests, alone, in the cluster's browser

A probe, 2026-10-10. `page.ts` makes one HTML file from what a Brain serves. It takes the page's
frame (the page with every module block and every block a module owns removed), then puts back the
module the Worker runs (`getSource`) and the modules it imports, each with its files ahead of it,
all ahead of the document's `<!-- Bootloader -->` marker. The boot list is that one module. A
script at the end runs the module's `test_` cells and leaves
`{ worker, module, hash, ok, tests, failed, … }` on `window.__verify`. Public reads, no key.

Blocks are found with `tools/lib/notebook-blocks.ts` and imports with `importsOf` of
`tools/channel/sync-module.ts`. The first version (commit `1a57a5bf`) scanned with regexes: it
matched script openers quoted inside module source, and kept 70 modules where the import cells
give 54. Tom, 2026-10-10: "you should never use cude regexes, we have many tools like sync-module
to do this properly. You would just have the frame and inject the modules you need to run the test."

```
bun page.ts https://cb4.endpointservices.workers.dev brain-x-issues issues.html
bun check.ts $PWD/issues.html "<path to a Chromium binary>"
```

| where | tests | boot | tests ran in | other modules' tests run | heap |
|---|---|---|---|---|---|
| local, HeadlessChrome 151, 22:35 CEST | 19 of 19 | 1032 ms | 816 ms | 0 | 64 MB |
| cb4's browser, HeadlessChrome 128, 22:35 CEST | 19 of 19 | 1086 ms | 3784 ms | 0 | 93 MB |

The same tests in the whole notebook in the same Chrome 128 at 22:11: 1 of 19 inside 60 s, heap
640 MB, because the notebook boots `@tomlarkworthy/tests` and 42 mains and every module's tests run.

In the cluster the file (4.9 MB, 54 modules) was written over `https://example.com/` with `browser.open` and
`browser.eval` (`document.write`), so nothing was hosted. Open, write and read took 9 s by `date`.

Not done: any Worker but `brain-x-issues`. 54 modules is what the tracker imports, most of them
through `brain-shell`; nothing was done to make that smaller.
