# playwright-headed-chromium-1200

## Round 1, 2026-10-11

Every `chromium.launch` from `tools/` failed on this machine, headed and headless. Eight named
launchers now take their Chromium from `tools/lib/playwright-chrome.js`, which names the newest
complete build of Playwright's cache when the one Playwright asks for is not there. No seed
changed and nothing was deployed.

### What was wrong

`tools/node_modules/playwright-core` is 1.57.0 and names build 1200. Run in `tools/` of the main
checkout on 2026-10-11, before any change:

```
headless=true  FAIL browserType.launch: Executable doesn't exist at …/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-mac-arm64/chrome-headless-shell
headless=false FAIL browserType.launch: Executable doesn't exist at …/ms-playwright/chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing
```

The issue's title says headed, and its "not tried" says the shell of 1200 is there. It is a
directory with `ABOUT` and a licence and no `INSTALLATION_COMPLETE`, so headless failed too.
`ls ~/Library/Caches/ms-playwright`: `chromium-1169`, `chromium-1234`,
`chromium_headless_shell-1169`, `-1200`, `-1234`. `bun tools/lope-browser-runner.ts
lopecode/notebooks/quick_start.html --list-cells` in the main checkout threw at its launch line.

`tools/cloud-brain/verify-run.ts` already had the answer for the headless shell alone
(`chromeFor`, `records/dv-1-verify-run-tool.md`). No other tool used it.

### What changed

`tools/lib/playwright-chrome.js`, plain JS so that the `node` tools import it too:

```js
import { chromeOptions } from "./lib/playwright-chrome.js";
const browser = await chromium.launch({
  headless,
  ...chromeOptions(chromium, { headless }), // {} when Playwright's own build is installed
});
```

- `chromeFor(own, env, { headless })`: `CHROME`, then the build Playwright names, then the newest
  `chromium-N` (headed) or `chromium_headless_shell-N` (headless) that has
  `INSTALLATION_COMPLETE` and an executable. With none it throws one line:
  `no complete chromium in <cache> (Playwright names build 1200); run: cd tools && npx playwright install chromium, or set CHROME=path`.
- `chromeOptions` returns `{}` when the named build is there, so a machine that has it launches as
  before. Otherwise `{ executablePath }` and one line on stderr.
- `verify-run.ts` keeps its `chromeFor(own, env)` and calls the shared one. Its own finder matched
  a `chrome-headless-shell-*` directory only; the shared one also finds `chrome-mac/headless_shell`,
  the layout of build 1169.

Used by: `test-annotate.js`, `lope-browser-runner.ts`, `lope-jumpgate.js`, `lope-bulk-jumpgate.js`,
`headless-pairing-host.ts`, `lope-load-profiler.ts` (not when `--channel` is given),
`lope-push-ws.js` (both `launchPersistentContext` calls), `cloud-brain/verify-run.ts`.

The other side, in the triage reason of event 979, was to install build 1200 under the home
directory. It was not done: it fixes one machine until the next Playwright bump.

### Checked

After the change, in the worktree's `tools/`, the same two launches:

```
playwright: build 1200 of chromium_headless_shell is not installed; using build 1234 ("cd tools && npx playwright install chromium" installs 1200)
headless=true ok 151.0.7922.34
playwright: build 1200 of chromium is not installed; using build 1234 ("cd tools && npx playwright install chromium" installs 1200)
headless=false ok 151.0.7922.34
```

`bun tools/lope-browser-runner.ts lopecode/notebooks/quick_start.html --list-cells` in the worktree
printed the same stderr line, then `Variables: 4075`.
`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-logs --times 1` there: `passed` 1 of 1.

| command, in the worktree | result |
|---|---|
| `bun test ./tests/tools/playwright-chrome.test.ts` | 5 pass, 0 fail |
| the same with the helper and the tool edits taken out | 0 pass, 1 fail (the module is not found) |
| the same with the helper back and the tools as on `main` | 4 pass, 1 fail (the launchers' test) |
| `bun test ./tests/tools` | 152 pass, 0 fail, 18 files |

### Not tried

- The other launchers. `git grep -c "chromium.launch" -- tools ':!tools/scratch' | wc -l` gives
  381 files; eight were changed. A probe that fails says which path it wanted; the import above
  is the fix.
- `test-annotate.js`, `lope-jumpgate.js`, `lope-bulk-jumpgate.js`, `headless-pairing-host.ts`,
  `lope-load-profiler.ts` and `lope-push-ws.js` were not run after the edit. Their launch lines are
  read by the test, and `lope-browser-runner.ts` and the two bare launches were run.
- `lope-push-ws.js` against Observable with build 1234 in place of 1200, and whether a profile
  made by one build opens in another.
- Linux and Windows layouts on a real cache: the test makes them in a temp directory.
- A headless launch with a headed build when no shell is complete. It throws the install line.
- The channel's `qa_open_notebook`. `lopecode-plugin/node_modules/playwright-core` is 1.62.1, which
  names build 1234, the one installed; the channel is not the loop's to change.

## Round 2, 2026-10-11

The review of event 1044 found two things. Both were true.

**1. A cache directory that does not exist threw ENOENT.** Round 1's "With none it throws one line"
held for an empty cache and not for an absent one, which is a machine where Playwright never
downloaded a browser. Before this round, with the new assertion in place:

```
Received message: "ENOENT: no such file or directory, scandir '…/playwright-chrome-SOr6NY/absent'"
```

`chromeFor` now reads an absent cache as no builds (`existsSync(cache) ? readdirSync(cache) : []`).
The reviewer's command, in the worktree after the change:

```
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/claude-502/nonexistent-cache bun tools/lope-browser-runner.ts lopecode/notebooks/quick_start.html --list-cells
error: no complete chromium_headless_shell in /private/tmp/claude-502/nonexistent-cache (Playwright names build 1200); run: cd tools && npx playwright install chromium, or set CHROME=path
```

**2. No doc named the helper.** `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` has a
section "A Playwright script in `tools/`" with the import. That guide, because a hook makes every
agent of the loop read it before `brain.ts`, `build.ts` or an edit under `tools/cloud-brain/`, and
the three reports of the issue were agents of the loop. `CLAUDE.md` was the reviewer's other place;
it was left as it is, an agent's message being no leave to change it. An agent that writes a probe
without reading that guide still meets Playwright's own text.

| command, in the worktree | result |
|---|---|
| `bun test ./tests/tools/playwright-chrome.test.ts`, the two new tests and round 1's helper and guide | 5 pass, 2 fail |
| the same after the change | 7 pass, 0 fail |
| `bun test ./tests/tools` | 175 pass, 0 fail, 20 files |
| `bash scripts/check-learnings-triggers.sh` | 0 error(s) |

Not tried this round: anything in round 1's list; a real machine with no cache (the test and the
reviewer's command name a path that does not exist).
