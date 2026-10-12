# annotate: the home of a kind, pushed to observablehq.com

For the issue `annotate-home-not-on-observable` (event 907). Done 2026-10-12, 07:18 to 08:28 CEST.
The task is an act outside the cluster: two cells written to the owner's Observable notebook
`@tomlarkworthy/annotate`. No seed changed and nothing was deployed. No notebook of the corpus is
changed: `test-annotate.js` writes the data block of the file it tests back as it found it, it was
run once on the canonical notebook, and `git -C lopebooks status --short notebooks/@tomlarkworthy_annotate.html`
at 08:30 CEST printed nothing.

## What was asked

The change that lets a kind of note name a `home` module (lopebooks `34f43bde`, used by
`brain-feedback` on the Brain's page) was only in `lopebooks/notebooks/@tomlarkworthy_annotate.html`.
The module is published on observablehq.com, and a jumpgate down from there would have put back
`a2Store` without `home`. The owner was given three choices in comment 2725 and answered `A` at
event 3724: "A writer of the loop pushes the changed cells of annotate to Observable with the tool,
from cellwise-diff, and checks the published version."

## Before the push

`bun tools/triage/cellwise-diff.ts @tomlarkworthy/annotate lopebooks`, 07:18 CEST: 2 cells `DIFFER`,
none only on one side, no import differs.

| Cell | What differed | Where the local side is from |
|---|---|---|
| `a2Store` | `create` reads `(kind && kind.home)` before `anchor.module`; `patch` keeps a record of an unregistered kind where it is and otherwise reads the kind's `home`; one comment line | lopebooks `34f43bde`, the change of the issue |
| `demoSvg` | the background is `var(--theme-background-raised, var(--theme-background, #f4f4f4))` where Observable had `var(--theme-background-alt,#f4f4f4)` | lopebooks `6674050e`, "an annotate that reads on a dark theme". Not the change of the issue |

Both were pushed. A push of one of two differing cells leaves the mirror half-updated, and the
owner's choice names the changed cells as cellwise-diff gives them.

The document as read with the owner's saved login (`tools/.observable-cookies.json`, not printed)
before the push: id `a6914f0c8744cfc3`, `version` 603, `publish_version` 603, `edit_unpublished`
false, 57 nodes. That answer is kept in the session's scratchpad and not in the repository.

## The push

```
node --experimental-vm-modules tools/lope-push-ws.js lopebooks/notebooks/@tomlarkworthy_annotate.html \
  --module @tomlarkworthy/annotate --target https://observablehq.com/@tomlarkworthy/annotate \
  --cookies-file tools/.observable-cookies.json --cells a2Store,demoSvg
```

Run once from the main checkout, 07:38:14 to 07:38:54 CEST, after the same command with `--dry-run`
(52 variable groups read, 2 kept, 5 imports dropped as `--cells` does, no line about a `$def` that
could not be read). Its last lines:

```
Notebook a6914f0c8744cfc3: 57 existing cell(s), version 603
Replacing 2 cell(s): demoSvg, a2Store
  "demoSvg" (node 543) — updating...
  "a2Store" (node 562) — updating...
Push complete! Final version: 605
```

## Checked where it took effect

Each after the push.

| Check | Result |
|---|---|
| The document, with the login: `api.observablehq.com/document/@tomlarkworthy/annotate` | `version` 605, `publish_version` 605, `edit_unpublished` false, 57 nodes, `update_time` 2026-10-12T05:38:54.021Z. Against the answer kept before the push: the node ids are the same list, and the nodes whose value changed are 543 and 562 and no other |
| The same address with no login | `version` 605, `publish_version` 605 |
| Node 562 holds `(kind && kind.home)` and `kindOf(rec.kind)`; node 543 holds `theme-background-raised` | true, true, true |
| The published module, `api.observablehq.com/@tomlarkworthy/annotate.js?v=4&cb=<ms>` | holds `(kind && kind.home)` and `theme-background-raised`, at 07:39 CEST. The address with no `cb`, which `cellwise-diff` reads, had the change by 08:23 CEST: its diff of `a2Store` then had no line of the change (below) |
| `tools/probe-observable-annotate.mjs` (the published module in a bare Observable runtime), run from a copy with `executablePath` set to the installed `chromium_headless_shell-1234` (as written it asks for a build that is not installed) | `ok: 42`, `errors: 0`, `PASS` |
| `node tools/lope-jumpgate.js --source @tomlarkworthy/annotate --output <scratchpad>/annotate-from-observable.html --pid-ref lopebooks/notebooks/@tomlarkworthy_annotate.html`, 8 s | `Observable v605 @ 2026-10-12T05:38:54.021Z`, exit 0 |
| `ANNOTATE_NB=<a copy of the canonical notebook with its annotate block replaced by the jumpgated one> node tools/test-annotate.js` | **145 passed of 145**. The two home checks read `{"home":"@tomlarkworthy/annotate-data","inData":true,"inAnchor":false}` |
| The same test on `git -C lopebooks show 34f43bde^:notebooks/@tomlarkworthy_annotate.html`, the copy the issue names | 143 of 145, the two home checks failing with `inAnchor: true`, as the issue says |
| The same test on the canonical notebook as it is | 145 of 145 |

The count of the submit is the 145 of 145 on the module that came down from Observable: it is the
issue's own check, 143 of 145 on a copy without the change.

The test was not run on the jumpgated file itself. A jumpgate of the one source gives a notebook
with no `@tomlarkworthy/annotate-data` block, and `test-annotate.js` stops at its line 126 on such a
file before any check. So the jumpgated annotate block (104,759 bytes; the canonical's is 105,952)
was put into a copy of the canonical notebook, with `findSpan` and `rawBlock` of
`tools/lib/notebook-blocks.ts`, and the test run on that. Both files were in the scratchpad.

## cellwise-diff still names one cell

`cellwise-diff` after the push, 08:23 CEST: 1 `DIFFER`, `a2Store`. The two sides differ in the
numbers of two placeholders and in nothing else:

```
< async function _a2Store($0,runtime,importShim,compile,a2KindsRef,$1,onCodeChange,invalidation)
> async function _a2Store(runtime,$0,compile,importShim,onCodeChange,invalidation,$1,a2KindsRef)
<   const self = $0.value || await window.Promise.race([
>   const self = $1.value || await window.Promise.race([
```

Observable's compiled `a2Store` lists `viewof a2Self` first of its inputs and the local one lists
it seventh, so `viewof a2Self` is `$0` there and `$1` in the local copy, and `viewof annotations`
the other way. `sameDef` of
`tools/triage/cellwise.ts` compares the tokens of the body, where `$0` and `$1` are different
names. With each `$n.` replaced by the input it stands for: 41 cells on each side, 41 the same, 0 differ,
and the two input lists of `a2Store` are the same set. The script, run at 08:24 CEST as
`bun tools/scratch/_cw_named.ts` from the main checkout and then removed:

```ts
import { loadCanonical, upstreamFor } from "../lope-sync.ts";
import { contentOf, parseModule, sameDef } from "../triage/cellwise.ts";
const mod = "@tomlarkworthy/annotate";
const up: any = upstreamFor(mod);
const obs = parseModule(await (await fetch(`https://api.observablehq.com/${up.slug}.js?v=4&cb=${Date.now()}`)).text());
const loc = parseModule(contentOf((loadCanonical() as any)[mod].lopebooks, mod)!);
const named = (c: any) => {
  const params = c.def.slice(c.def.indexOf("(") + 1, c.def.indexOf(")")).split(",").map((s: string) => s.trim());
  let body = c.def.slice(c.def.indexOf(")") + 1);
  params.forEach((p: string, i: number) => { if (/^\$\d+$/.test(p)) body = body.split(p + ".").join(`<${c.inputs[i]}>.`); });
  return body;
};
let differ = 0, same = 0;
for (const [k, o] of obs.cells) { const l = loc.cells.get(k); if (!l) { differ++; continue; } (sameDef(l, o) || named(l) === named(o)) ? same++ : (differ++, console.log("DIFFER", k)); }
for (const k of loc.cells.keys()) if (!obs.cells.has(k)) { differ++; console.log("ONLY LOCAL", k); }
const o = obs.cells.get("a2Store")!, l = loc.cells.get("a2Store")!;
console.log(JSON.stringify({ cellsObservable: obs.cells.size, cellsLocal: loc.cells.size, same, differ, a2StoreSameBytes: sameDef(l, o), a2StoreSameNamed: named(l) === named(o), inputsSameSet: [...o.inputs].sort().join() === [...l.inputs].sort().join() }));
```

It printed `{"cellsObservable":41,"cellsLocal":41,"same":41,"differ":0,"a2StoreSameBytes":false,"a2StoreSameNamed":true,"inputsSameSet":true}`. The same cell differed this way before the
push too (the first diff has those lines beside the lines of the change), so for this module the
tool's 0 is not to be had while the two orders differ. Filed as
`seen-cellwise-placeholder-numbers`; not changed here.

## Not tried

- The page `observablehq.com/@tomlarkworthy/annotate` was not opened in a browser. What was run is
  the published module in a bare runtime and the module jumpgated into the canonical notebook.
- No notebook of the corpus was changed. `bun tools/lope-sync.ts audit --module @tomlarkworthy/annotate`
  at 08:28 CEST listed 28 copies: 3 of the canonical's version and six other versions in 25
  notebooks (12, 3, 3, 2, 4 and 1). Which of those six lack `home` was not read. A sync from one
  that lacks it still puts back an older `a2Store`; `CLAUDE.md` (tip 8) says `sync-module` refuses a
  source that is not the declared canonical, which was not run here. The issue's other route, a
  guard in `brain-feedback`, was not built: the owner chose the push.
- The canonical notebook was not replaced by the jumpgated one. Its annotate block and Observable's
  are the same cell for cell (above); the bytes differ as two compilers' output does.
- `tools/.observable-cookies.json` was last written 2026-10-04 and was accepted on 2026-10-12, for
  the REST calls and the WebSocket. How long it stays so was not looked at.

## For the overseer

`tools/cloud-brain/records/annotations-file-feedback.md`, "Not tried", last item ("The other
notebooks that embed annotate were not given the new copy…"), and the issue's quote of it, "annotate
was not pushed to observablehq.com": true when written. Since 2026-10-12 07:38 CEST the module on
Observable has the change. That record is another issue's and was left as it is.
