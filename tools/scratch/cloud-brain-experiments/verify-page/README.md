# verify-page: one Worker's tests, alone, in the cluster's browser

A probe, 2026-10-10. `page.ts` makes one HTML file from what a Brain serves: the page's shell, the
module the Worker runs (`getSource`), the service modules it imports with their files
(`infra.getModules`), and a boot list of that one module. A script at the end runs the module's
`test_` cells and leaves `{ worker, module, hash, ok, tests, failed, … }` on `window.__verify`.
Public reads, no key.

```
bun page.ts https://cb4.endpointservices.workers.dev brain-x-issues > issues.html
bun check.ts $PWD/issues.html "<path to a Chromium binary>"
```

| where | tests | boot | tests ran in | other modules' tests run | heap |
|---|---|---|---|---|---|
| local, HeadlessChrome 151, 22:31 CEST | 19 of 19 | 56 ms | 849 ms | 0 | 64 MB |
| cb4's browser, HeadlessChrome 128, 22:33 CEST | 19 of 19 | 286 ms | 3977 ms | 0 | 98 MB |

The same tests in the whole notebook in the same Chrome 128 at 22:11: 1 of 19 inside 60 s, heap
640 MB, because the notebook boots `@tomlarkworthy/tests` and 42 mains and every module's tests run.

In the cluster the file (6.4 MB) was written over `https://example.com/` with `browser.open` and
`browser.eval` (`document.write`), so nothing was hosted. Open, write and read took 8 s by `date`.

Not done: any Worker but `brain-x-issues`; the import closure is a text match and keeps 70 of 76
page modules; a module block must be ahead of the bootloader's first read of it (the service
blocks are put ahead of the page's first block; Tom, 2026-10-10: "simplest though it put the
bootloader last").
