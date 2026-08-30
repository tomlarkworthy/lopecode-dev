# Lopecode-tour remote load profile (2026-06-03)

Profiled the freshly-jumpgated tour from GitHub Pages vs local `file://`, using
`tools/lope-load-profiler.ts` (Playwright Chromium, in-page high-res console markers +
Navigation/Resource/Paint timing).

URL: `https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_lopecode-tour.html#view=S100(@tomlarkworthy/lopecode-tour)`
Build: commit `6452018` (lopecode), SHA-verified identical local vs deployed.

## Result: remote bottleneck is HTML transfer, not module_definition

| phase | LOCAL file:// | REMOTE github.io (3 runs) |
|---|---|---|
| connect (DNS+TCP+TLS) | 0ms | **510–550ms** (fixed) |
| TTFB (req→resp) | 0ms | 69–298ms |
| **HTML download (1.56MB gz / 3.0MB raw)** | 11ms | **3623–5792ms** |
| responseEnd @ | 11ms | 4208–6692ms |
| runtime work after bytes arrive (→submit_summary) | 147ms | **139–163ms** |
| FCP @ | 140ms | 4352–6832ms |
| TTI (submit_summary) @ | 158ms | 4371–6832ms |

Sub-resources: **1** (highlight.js 2.2KB from jsdelivr). No dependency-fetch waterfall —
everything is inline, so remote cost is pure payload bandwidth.

### Conclusion
The `module_definition` / flow-data work the earlier profiling optimized is **~150ms and
constant in both local and remote** — it is now ~2–4% of remote TTI. It is no longer the
bottleneck remotely. **80–90% of remote time-to-interactive is downloading the 1.56MB-gzipped
monolithic HTML** (plus a fixed ~530ms GitHub Pages TLS handshake). Further boot-CPU
optimization yields ~nothing on the wire; only shrinking the payload helps remote load.

## Payload breakdown (2.99MB raw → 1.56MB gzipped by Pages; 106 blocks)

Largest blocks:
- bootloader 324KB (raw JS, compresses well)
- codemirror_javascript 227KB (base64+gzip — barely recompresses)
- robocoop-3 191KB (raw JS)
- prosebundle 189KB (base64+gzip)
- **image-1 153KB + image 104KB = 257KB PNGs** (base64, already-compressed)
- jest-expect 114KB, observablejs-toolchain 106KB, exporter-3 102KB, isomorphic-git 100KB

### Reduction levers (remote-impacting)
1. Two tour PNGs = 257KB raw / ~257KB on wire (base64 PNG doesn't recompress). Downscale /
   WebP / lazy-load → biggest easy win.
2. base64-of-gzip blobs (codemirror, prosebundle, jest, isomorphic-git, golden-layout,
   runtime ≈ 750KB) don't recompress under Pages gzip; the base64 tax rides the wire.
3. Trim modules the tour doesn't strictly need at first paint (e.g. robocoop-2+3 ≈ 247KB,
   isomorphic-git, file-sync) — or split so first paint needs less than the full 3MB.

## Reproduce
```
bun tools/lope-load-profiler.ts "<file:// or https:// url>#view=S100(@tomlarkworthy/lopecode-tour)" \
  --runs 3 --json scratch/out.json
```
