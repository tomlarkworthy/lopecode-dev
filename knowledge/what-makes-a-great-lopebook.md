# What Makes a Great Lopebook

A lopebook is a self-contained, single-file HTML notebook built on the Observable runtime. Great lopebooks are reliable, portable, and teach effectively. This guide defines the quality bar for notebooks included in the lopebooks collection.

## Core Requirements

### 1. Runs Offline

A lopebook must work without an internet connection. All JavaScript dependencies should be vendored as `<script type="lope-file">` embedded files, not loaded from CDNs at runtime.

**Do:**
- Vendor libraries as FileAttachments during export
- Use the importmap/bootloader for dependency resolution

**Don't:**
- Import from `cdn.skypack.dev`, `esm.sh`, `unpkg.com`, or other CDNs at runtime
- Depend on external API calls for core functionality (data fetching for demos is acceptable if it degrades gracefully)

### 2. Zero Cell Errors

When a lopebook is opened in a browser, there should be no red `observablehq--error` cells visible. Every cell that computes should succeed.

**Acceptable exceptions:**
- Cells that intentionally error for testing/demonstration purposes (clearly labelled)
- Cells that depend on user input that hasn't been provided yet (should show a prompt, not an error)

**Not acceptable:**
- Broken CDN imports (`Unable to resolve specifier`)
- Undefined variables from missing dependencies
- Null reference errors from DOM queries on elements that don't exist

### 3. Opens on the Correct Page

The notebook's default hash URL should land the user on the intended content. In a lopepage multi-module layout, the hash URL controls which modules are visible and how they're arranged.

**Check:**
- The default view shows the notebook's primary content, not infrastructure modules
- Navigation between sections works
- The layout is sensible at common viewport sizes

### 4. Small File Size

Lopebooks are single HTML files. Smaller is better — it means faster loads and less bandwidth.

| Size | Rating |
|------|--------|
| < 2 MB | Excellent |
| 2–5 MB | Good |
| 5–15 MB | Acceptable if content justifies it (e.g., embedded datasets, images) |
| 15–50 MB | Needs justification — consider whether large assets can be reduced |
| > 50 MB | Too large — must be trimmed |

**Tips for reducing size:**
- Remove unused modules via module-selection
- Compress or downsample embedded images/data
- Don't vendor libraries you don't use
- Check if a lighter alternative exists for heavy dependencies

## Content Quality

### 5. Clear Literate Explanations

Lopebooks are literate programs — the prose matters as much as the code. Each notebook should explain what it does and why.

**Good literate style:**
- Open with a concise summary of what the notebook does and who it's for
- Explain concepts before showing code that uses them
- Use markdown cells to narrate the flow, not just as section headers
- Name cells descriptively — `populationByYear` not `data2`

### 6. Progressive Disclosure

Don't overwhelm the reader. Reveal complexity gradually.

**Structure content so that:**
- The first thing visible is the most important — the result, the demo, the key insight
- Implementation details come after the high-level explanation
- Advanced configuration and edge cases are deeper in the notebook
- Infrastructure modules (testing, exporter, etc.) are collapsed or in secondary panels

### 7. Link Difficult Topics

Not everything needs to be explained inline. For complex background topics, link to external resources rather than writing a textbook.

**Good linking practice:**
- Link to authoritative sources (MDN, Wikipedia, original papers)
- Briefly summarize what the link covers so readers can decide whether to follow it
- Don't link to ephemeral content (tweets, blog posts that may disappear) — prefer stable references

## Robustness

### 8. Idempotent Cells

Re-running cells shouldn't break state or produce different results. Avoid cells that append to arrays or mutate shared state without reset. Observable's dataflow model naturally encourages this — lean into it rather than fighting it with imperative mutation.

### 9. Graceful Degradation

If a notebook has features that need a server (auth, serverless cells, external APIs), the rest of the notebook should still work. Explain what's unavailable and why, rather than showing a wall of red errors.

## Content Hygiene

### 10. No Stale Content

Commented-out experiments, TODO cells, "test123" placeholders, and dead code shouldn't ship. A lopebook is a published artifact — clean it up before inclusion.

### 11. Self-Describing Title

The notebook name should tell you what it does without opening it. `@tomlarkworthy/dijkstra` is good. `@tomlarkworthy/e1` is not.

### 12. Meaningful Defaults

Interactive inputs should have sensible initial values so the notebook looks good on first load — not empty or blank until the user interacts. The reader should see a working example immediately.

## Validation Checklist

Before adding a notebook to lopebooks:

- [ ] Opens in browser with zero cell errors (`node tools/bulk-browser-validate.js`)
- [ ] Works offline (disconnect network and reload)
- [ ] Default hash URL shows the intended content
- [ ] File size is justified for the content
- [ ] Has explanatory prose, not just code
- [ ] Primary content is visible first (progressive disclosure)
- [ ] No broken external links in the visible content
- [ ] Cells are idempotent — no shared mutable state
- [ ] Degrades gracefully if server features are unavailable
- [ ] No stale/dead content (TODOs, commented-out experiments)
- [ ] Name is self-describing
- [ ] Interactive inputs have meaningful defaults
