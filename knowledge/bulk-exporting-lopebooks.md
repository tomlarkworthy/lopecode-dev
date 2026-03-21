# Bulk Exporting Lopebooks

## Overview

The `lopebooks` repository contains ~21 notebooks that can be bulk-exported from Observable using `lope-bulk-jumpgate.js`. An `export_spec.json` in `lopebooks/` defines which notebooks to export.

## Quick Start

```bash
# Export all lopebooks notebooks
node tools/lope-bulk-jumpgate.js \
  --spec lopebooks/export_spec.json \
  --output tools/bulk-export-staging \
  --timeout 1800000

# Run QC comparison against existing notebooks
node tools/bulk-export-qc.js \
  --exported tools/bulk-export-staging \
  --reference lopebooks/notebooks \
  --spec lopebooks/export_spec.json

# Smoke test exported notebooks (Node.js, no browser)
node tools/bulk-smoke-test.js tools/bulk-export-staging --timeout 20000
```

## Export Spec Format

`lopebooks/export_spec.json`:
```json
{
  "additionalMains": ["@tomlarkworthy/lopepage"],
  "notebooks": [
    { "name": "@tomlarkworthy/cell-map" },
    { "name": "@spond/revised-sars-cov-2-analytics-page" }
  ]
}
```

All lopebooks currently use `@tomlarkworthy/lopepage` as their frame.

## Known Issues

### Export failures (2 of 21)

- **`@tomlarkworthy/circular-barcode-simulator`** — times out during export. Depends on `d/b2bbebd2f186ed03@1803` (Range Slider) which fails to resolve from the Observable API.
- **`@tomlarkworthy/opencode-agent`** — times out silently during export.

### Size changes after re-export

Older notebooks that used older module versions (exporter v1, editor-2/3/4) will grow 20-40% when re-exported because the bulk-jumpgate pulls latest module versions from Observable. This is expected — the notebooks pick up newer, larger modules (exporter-2, editor-5, etc.).

Notebooks that shrink significantly (e.g., `lopecode-vision` dropped 33%) may have lost an embedded file or dependency — worth investigating.

### Node.js smoke testing limitations

The `bulk-smoke-test.js` tool loads notebooks via `lope-runtime.js` (Node.js, no browser). This validates that notebooks boot and their runtime initializes, but many tests fail due to Node.js vm sandbox limitations, not notebook bugs:

| Error | Cause | Notebook bug? |
|-------|-------|--------------|
| `parser.parseCell is not a function` | Acorn parser dynamic import fails in vm | No |
| `Module status must not be unlinked or linking` | Node.js `vm.SourceTextModule` limitation | No |
| `observable.Runtime is not a constructor` | Runtime reference doesn't propagate through vm | No |

**5 of 19 notebooks crash at boot** with the vm.SourceTextModule error (editable-md, jumpgate, lopecode-vision, reactive-reflective-testing, unaggregating-cloudwatch-metrics). The remaining 14 load and run ~48-55 tests passing out of ~103-124.

**Key takeaway:** A notebook that loads and runs any tests in Node.js is very likely working correctly in the browser. The test failures are shim gaps, not export bugs.

### Runtime shims added (lope-runtime.js)

To support bulk testing, these shims were added:
- `fake-indexeddb` — full IDB implementation (Dexie requires it)
- `IDBKeyRange` and other IDB globals on the vm context
- `TextEncoderStream`, `TextDecoderStream` — stream APIs
- `crypto` — Web Crypto API

## QC Tool

`tools/bulk-export-qc.js` compares exported files against reference:
- Reports missing exports, size changes >20%, suspiciously small files
- Identifies orphan files (in reference but not in spec)
- Use `--json` for machine-readable output

## Workflow for Updating lopebooks

1. Edit notebook source on ObservableHQ.com
2. Run bulk export: `node tools/lope-bulk-jumpgate.js --spec lopebooks/export_spec.json --output tools/bulk-export-staging --timeout 1800000`
3. Run QC: `node tools/bulk-export-qc.js --exported tools/bulk-export-staging --reference lopebooks/notebooks --spec lopebooks/export_spec.json`
4. Optionally smoke test: `node tools/bulk-smoke-test.js tools/bulk-export-staging`
5. Review QC report, then copy successful exports: `cp tools/bulk-export-staging/*.html lopebooks/notebooks/`
6. Commit to lopebooks submodule
