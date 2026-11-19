# Race-free metaprogramming: a note, not a plan (2026-11-19)

Tom, 2026-11-19: "Make a note about how we might make metaprogramming race free. It be a big win if we
can figure it out. But we also want simplicity so it might just be too hard, we need a nice way to do it
that does not result in lots of complexity, which may be impossible."

Nothing here is built. The observations are from this week's work; the options are untested ideas.

## What was observed

Two kinds of race made `verify.ts` intermittent between 2026-11-18 and 2026-11-19.

**1. An outside observer reads too early.** The Playwright script read the core's `soundscript` variable
before it had a value (`TypeError: Cannot read properties of undefined (reading '_value')`, 3 of 3 runs
before the fix, 0 of 20 after), and started checks while the spec tests were still running. No in-notebook
`test_*` cell failed this way: a cell that takes another cell runs when that cell has a value.

**2. A code change is seen late.** `test_spec_S6_11` deletes a state cell's variables with
`variable.delete()` and then reads the cell that held its `State<T>`. Probe
`lite/soundscript/.scratch/probes/s611-delete.ts`, 8 reads per row:

```
wait before the read    what the holder raises
none, or 0 ms           "viewof n is not defined"                    8 of 8
50 ms, or 300 ms        "[inject-unknown] parameter n names no cell" 8 of 8
```

Both answers are correct for their moment. The first is the Runtime's own error. The second appears after
`ss_lifecycle` learns of the deletion from `onCodeChange`, which diffs snapshots of the Runtime's
variables 60 to 600 ms later, and checks the module again. A reader between the two sees a module whose
check status does not match its variables.

## Why SoundScript does not cover the second kind today

For values, the language already forbids this shape: a write outside an action is `[state-write]`, and a
call's writes commit once, so a reader sees before or after (S6.5, S6.14). The delete is the same shape
one level up. The thing written is the Runtime's variable table, which is foreign and mutable, and the
checker has no say over it.

The editor-5 port (`port-editor5/`, 2026-11-17) found the same wall from the other side: about 4% of that
module was expressible, and "no Runtime writes" was one of the four blockers.

## Ideas, with what each costs

**A. Source as state.** A module's cell texts are one state cell (name to text). Edit and delete are
actions on it. The check result and the compiled definitions are cells derived from it. One cell at the
edge applies the compiled definitions to the Runtime.
- Gives: a code change commits once; the check and the definitions always agree; nothing polls.
- Costs: replaces `ss_lifecycle` and the editor's `apply`, the hardest code here. The edge cell still
  mutates the Runtime, so it is the one place the guarantee stops.
- Does not cover: any other code calling `variable.define` or `variable.delete` directly. The poll would
  have to stay, as a way to notice and report such a change, not as the way edits arrive.

**B. One door, no new model.** Keep the lifecycle as it is, and make raw Runtime writes to a SoundScript
module an error or a no-op, so `apply` is the only writer.
- Gives: removes the race in the table above, since no change can arrive unannounced.
- Costs: needs to intercept the Runtime's own methods on a module, which is a private surface.
- Unverified: whether the exporter, the pairing channel or cell-map write variables in ways this would break.

**C. Code changes as events.** Leave writers alone; deliver each change as a value of an events cell and
make the recompile an action, so it takes its turn in the one queue.
- Gives: ordering between edits and state writes.
- Does not give: a consistent view between the raw write and its event, which is the race observed.

**D. Do nothing in the language; write checks as cells.** Removes kind 1 only. Works in plain Observable.

## What is not known

- Whether A can be small. Tom's bar is simplicity; a version that needs its own scheduler, or a second
  copy of the module graph, fails that bar even if it is correct.
- Whether "source as state" composes with the Runtime's own `this` (a cell's last value), which state
  cells now rely on, when a definition is replaced.
- Whether the edge cell of A can be the standard `define` and nothing else. If it needs more than that,
  the idea is fighting the platform.

Smallest experiment that would tell: one module, option A, edit and delete only, with the `test_spec_S8_*`
edit tests run against it unchanged, and the line count of the lifecycle before and after.
