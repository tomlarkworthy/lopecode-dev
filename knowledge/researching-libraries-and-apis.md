---
scope: [local-development, in-notebook]
write-triggers:
  - "import\\(\\s*[\"'`]https?://(?!api\\.observablehq\\.com)"
  - "https?://(cdn\\.jsdelivr\\.net/npm|unpkg\\.com|esm\\.sh|esm\\.run|cdn\\.skypack\\.dev)/"
---

# Researching a library and its API before you call it

Read this when a task needs a third-party library: choosing one, pinning a version, and finding the
exact call signatures. Getting the bytes to load offline is a separate step, covered by
`vendoring-npm-dependencies.md`; do that after the library is chosen and a call works.

## What went wrong without it (2026-09-27, run `20260927-2340-w4-before`)

Prompt: *"Typeset 'Twinkle Twinkle Little Star' as sheet music in this notebook, and let me play it."*
The agent chose abcjs (a fair choice) and imported `https://esm.sh/abcjs@6.4.4` from memory. The
latest version that day was 6.7.1. It never fetched a README or type file. Rendering worked on the
first try. Playback did not, and each fix was a guess:

```
370s  Error: synth.startPlaying is not a function
427s  Error: Cannot read properties of undefined (reading 'swing')
449s  Error: Must pass in either a visualObj or a sequence
375-469s  8 eval_js calls listing Object.keys / fn.toString() of the minified bundle
507s  abcjs playback replaced by a hand-written OscillatorNode loop over a regex "parser"
```

The hand-written player skipped every lower-case (upper-octave) note and read the chord symbols
`"D"`, `"G"` as notes. The tool results said "all 4 cells compute with no runtime error" throughout.
The agent then hit the 41-step limit without a final reply.

The library ships its API as a file. `types/index.d.ts` in the abcjs 6.7.1 package declares the
signatures the agent was guessing:

```ts
export interface MidiBuffer {
    init(params?: MidiBufferOptions): Promise<MidiBufferPromise>   // MidiBufferOptions carries visualObj, audioContext
    prime(): Promise<{ status: string, duration: number}>
    start(): void
```

One `fetch` of that file answers all three errors above.

A second run the same day (eval `rc5t-library-api-from-docs`, before this page's `attach_file`
gate existed) vendored `abcjs@6.4.4/dist/abcjs-basic-min.js` with `attach_file` and repeated the
pattern: `abcjs.synth.init is not a function`, then `t.visualObj.setUpAudio is not a function`,
then `Object.keys` on a rendered tune. Vendoring first does not replace reading the API.

This page is enforced: an `attach_file` whose `url` is on a package CDN, or a module write
containing `import("https://…")` (other than an Observable notebook import), is refused until
this page has been read in the session.

## Where to read, from inside the notebook

The only web access is `fetch()` in `eval_js`, so an endpoint is usable only if it sends
`Access-Control-Allow-Origin`. Measured 2026-09-27 (headless Chromium from this notebook's page, and
`curl -H 'Origin: null'` for the header):

| need | URL | CORS |
|---|---|---|
| find candidate packages | `https://registry.npmjs.org/-/v1/search?text=<words>&size=10` | yes (Chromium) |
| find candidate repos | `https://api.github.com/search/repositories?q=<words>` (60 requests/hour unauthenticated) | yes |
| versions, `latest` tag | `https://data.jsdelivr.com/v1/packages/npm/<pkg>` | yes |
| file list of a version | `https://data.jsdelivr.com/v1/packages/npm/<pkg>@<ver>?structure=flat` | yes |
| README, type declarations, any shipped file | `https://cdn.jsdelivr.net/npm/<pkg>@<ver>/<path>` | yes |
| a single-file ESM build | `https://cdn.jsdelivr.net/npm/<pkg>@<ver>/+esm` | yes |
| project doc sites (`docs.abcjs.net`, …) | | **no** header, so `fetch` fails |
| `npmx.dev` JSON | | **no** |

A library's own docs site usually cannot be fetched. What it ships in the package can: `README.md`,
`types/index.d.ts` or `*.d.ts` (the `types`/`typings` field of `package.json` names it), and often
`docs/` or `examples/`. The file list tells you which exist.

```js
// eval_js — pick the version, then list what the package ships
const meta = await (await fetch("https://data.jsdelivr.com/v1/packages/npm/abcjs")).json();
const ver = meta.tags.latest;                                   // "6.7.1" on 2026-09-27
const files = await (await fetch(`https://data.jsdelivr.com/v1/packages/npm/abcjs@${ver}?structure=flat`)).json();
return { ver, docs: files.files.map(f => f.name).filter(n => /readme|\.d\.ts$|docs?\/|example/i.test(n)) };
```

## Order of work

1. **Search** when the prompt names no library: npm search, then compare 2–3 candidates on the
   README (does it do *both* things the prompt asks, here render and play?), weekly downloads and
   last publish date. Say which you chose and why.
2. **Pin** the `latest` tag from `data.jsdelivr.com`, not a version from memory.
3. **Read the API for the feature you are about to call** before writing the call: grep the
   `.d.ts` for the class or function (`grep`-style: `text.split("\n").filter(l => /init\(|start\(/.test(l))`),
   and the README for a usage example. Copy the example's call sequence.
4. **When a call throws, go back to the declaration**, not to `Object.keys(x)` or
   `fn.toString()` on a minified bundle. Minified source shows that a method exists, not what it
   takes or in which order methods must be called.
5. **Do not replace the library's feature with a hand-written one** because its API was hard to
   guess. If the declarations and README genuinely do not cover it, say so to the user.
6. **Vendor** it (`vendoring-npm-dependencies.md`): a cell that imports from a CDN at run time stops
   working offline.

## Not verified

- Whether a model that has read this page reads the `.d.ts` unprompted. Measured once, see the
  proposal for `rc5t-library-api-from-docs`.
- Packages that ship no types and a README without examples; the fallback there is the GitHub repo's
  `examples/` via `cdn.jsdelivr.net/gh/<owner>/<repo>@<tag>/<path>`, not measured.
