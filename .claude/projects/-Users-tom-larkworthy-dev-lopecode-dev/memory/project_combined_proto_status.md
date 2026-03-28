---
name: Combined prototype status
description: LinkeDOM + vm.Module prototype progress and remaining blockers
type: project
---

## Combined prototype: tools/prototypes/combined-proto.js

Working LinkeDOM + vm.Module prototype that mirrors the browser bootstrap exactly.

**What works:**
- Parses HTML, creates vm.Context with LinkeDOM document
- importModuleDynamically intercepts all import() calls (file://, blob:, Observable API URLs)
- Loads Runtime via importShim, creates Runtime instance
- Finds bootloader from main script tag, loads it via importShim
- `runtime.module(bootloaderDefine, observer)` — bootloader takes over naturally
- Bootloader reads bootconf.json, creates stdlib Library, patches builtins, loads mains
- All 9 tested notebooks boot successfully in ~1.5s, 0 compile failures
- Patched fetch serves file:// and normalized URLs from embedded script tags
- Blob URL tracking (URL.createObjectURL intercepted) for modules that decompress deps

**Current blocker: d3-require + AMD module loading**
- 37/45 builtins stay pending (md, htl, Inputs, d3, Plot, etc.)
- These builtins are lazy getters that call `require3(lib.resolve())`
- `require3` is d3-require, which loads AMD modules by creating `<script src="...">` elements
- LinkeDOM doesn't execute script tags, so AMD modules never load
- The networking_script patches `Document.prototype.createElement` to intercept `script.src` — we don't have that equivalent
- **Fix approach**: Need to provide a custom `require` that resolves from the virtual filesystem OR patch d3-require's script loading mechanism in the vm.Context

**Why:** Building toward a no-browser jumpgate and general-purpose notebook runner.

**How to apply:** The prototype is at tools/prototypes/combined-proto.js. Run with `node --experimental-vm-modules`. The d3-require blocker is the next thing to solve.
