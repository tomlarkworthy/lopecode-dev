# Tutorial prose: introduction and section leads

Written by the main session on 2026-11-14 for Phase 4. Use these texts as the `md` cells of
`tutorial.ojs`, one cell per `---` block, in this order. Do not paraphrase them. Where a text
names a number in `{braces}`, fill it from a measurement you ran and say in your report which
command produced it; if you cannot measure it, cut the sentence.

Rules for the rest of the page:

- The page order is: introduction, sections 1 to 9, "How it works", language reference,
  "How good is the checker", "Not built", tests, appendices.
- Everything the current section texts say about implementation (how JSX lowers, the renderer,
  `hold`/`release`, how a ref becomes two variables, the marker comments, why four sections are
  modules) moves to "How it works", one mechanism per cell, each with a heading. Keep the facts;
  cut nothing that is true and checked. The numbered sections keep only the lead below, the
  live cells, the table, and the "Try" cell.
- Do not cite repository paths a reader of the notebook cannot open (`tools/lang-experiment/…`,
  `plan/…`, `lite/…`). Name the cell or module in this notebook instead, or cut the pointer.
- Each "Try" cell is one instruction and what the reader will see.
- I wrote every "Try it" from reading the example sources, without running it. Run each one in
  the headless browser and add it to `verify.ts` as a check. Where the page does something
  different from what the text says, change the text to what happens and list the change in your
  report. Do not keep a "Try it" that is not covered by a check.
- No sentence may say a cell is "below" or "above" unless it is in the same module and adjacent.

---

# SoundScript

SoundScript is TypeScript with things taken out, for writing notebook cells. A checker reads each
cell and accepts it only if everything the cell depends on is in its parameter list. For an accepted
cell the notebook knows what can change its value, so it can skip it when nothing changed, run it on
another thread, and replay it in a test.

This page is the tutorial. Every example is a live cell of this notebook: open its editor, change
it, and press Shift-Enter. The first one is three lines down.

---

## A first cell

`width`, `height` and `area` are three cells. A cell is a function. Its parameter names are the
cells it reads, so `area` runs again when `width` or `height` changes.

(live cells: 01-cells.ts, then its table)

---

**Try it.** Open `width` and change it to `() => 800`, then press Shift-Enter. `area`, `aspect` and
`half` update. Now change it to `() => "800"`. The edit is refused, and the editor names the two
cells that would stop checking, `area` and `aspect`. `width` keeps its old value.

---

## Why take things out

An ordinary notebook cell can do anything JavaScript can. It can read `document`, call
`Math.random`, or change an object that another cell returned. The runtime cannot see any of that,
so it has to assume the worst: run every downstream cell again on every change, never reuse a
result, and keep everything on the main thread.

In the lopecode notebooks this is common. Of 8,650 cells counted on 2026-11-08, 941 read a browser
global that is not one of their inputs; `document` appears in 347 cells and `window` in 291.

SoundScript removes the constructs that hide a dependency or an effect. What is left is still
TypeScript, and an editor highlights it as TypeScript.

---

## The four rules

1. **Inputs are parameters.** A cell body may use its parameters, its own locals and a fixed list
   of built-ins. There are no globals.
2. **Effects are parameters.** The clock, randomness, the network and logging are *capabilities*:
   reserved parameter names (`now`, `random`, `fetch`, `log`) that the notebook supplies. A cell
   that can give two answers for the same inputs says so in its signature.
3. **Values do not change after they are returned.** A cell may build a value with local writes;
   once returned, it is read-only everywhere.
4. **State changes only in actions.** State is a `ref` cell. A write to it must be inside
   `action(...)`, and a cell never calls an action. The page calls it, when a button is clicked or
   a frame arrives.

Sections 1 to 5 teach these rules. Sections 6 to 9 show what they pay for.

---

## 1. Cells and their inputs

The cells you just edited, in full. A parameter may leave out its type; it then has the type of the
cell it names. A cell whose value is a function is written as two arrows, as `scale` is. A cell
named `test_…` is a test: it passes if it does not throw.

The table lists each cell with the type the checker inferred and its current value.

---

## 2. What the checker rejects

Five cells, each breaking one rule. They are shown in a box and checked as you type; they are not
run. Each message starts with the name of the rule in brackets.

(box and its verdicts)

---

`jittered` is how `jitter` should be written. It takes `random` as a parameter, so the dependency
graph shows that this cell can differ between two runs.

**Try it.** In the box, change `label: number` to `label: string` in `doubled`. The message changes
from an input type error to a type error on `label * 2`.

---

## 3. Local writes: `mut` and `freeze`

Building an array or a typed array one element at a time is ordinary and fast, and rule 3 does not
forbid it. `mut(...)` marks a value this cell made as writable. `freeze(...)` ends the writes and
returns the plain value. Between the two, the value may not leave the cell.

`leak` returns a writable value and `late` writes after `freeze`. Both are rejected. They are live
here so that you can fix them.

---

**Try it.** Open `leak` and change `return xs` to `return freeze(xs)`. The edit is accepted, and
`leak`'s row in the table turns from rejected to ok.

---

## 4. State and views

State is a cell that returns `ref(initial)`. Other cells use it in two ways. A parameter named
`count` gets the current value and runs again when it changes. A parameter typed `Ref<number>` gets
the reference, which can be written and cannot be read.

A write must be inside `action(...)`. `increment` and `clear` are actions. A cell cannot call them;
the page does, when a button is clicked.

The view is a cell too. `app` returns JSX: a description of the page that is built again whenever
`count` changes. An event attribute such as `onClick` must be given an action.

---

**Try it.** Press **add one**. Then open `app` and change `onClick={increment}` to
`onClick={count}`. The edit is refused: a number is not an action.

---

## 5. One function for every change

When state has several fields, separate actions that each change one field can leave it
inconsistent. Here every action is the same line, `state.update(s => step(s, event))`, so one
function, `step`, decides every transition. `step` is a plain function, and `test_undo` tests it
without a page.

---

**Try it.** Open the reducer module from the link under the table. In `step`, change `- last` to
`+ last`. The edit is accepted, because the types still agree, and `test_undo` fails. The checker
proves that a cell depends only on its inputs. It does not prove that the cell is right.

---

## 6. Skipping cells that did not change

A cell that depends only on its inputs, and whose inputs are the same values as last time, would
return the same value. So the notebook does not run it. The table counts how many times each cell
body has run.

---

**Try it.** Press **bump** and read the **runs** column. `doubled` runs again, because `count`
changed. `stamped` takes the clock, `now`, so it is never skipped. The cells that do not read
`count` keep their old count.

---

## 7. Running cells on other threads

A cell that touches nothing but its inputs can run anywhere. `compile` takes a group of cells and
returns an ordinary async function; with a worker pool it runs them off the main thread. The type
of that function is worked out from the cells it names.

This Mandelbrot set is computed in bands by a pool of workers. Move the slider to change the
iteration count.

---

**Try it.** Press **measure again**. The table times the same cells on the main thread and in the
pool, and checks that both produce the same bytes.

---

## 8. Mistakes in a view

JSX is checked like the rest of a cell: each attribute against the attributes its tag declares,
and each event handler against the action it is given. Eleven cells, one mistake each. They are
live, so each can be fixed in place.

---

## 9. A game

Breakout, written with the pieces from the earlier sections. `step(world, event)` is the whole
game, as in section 5. The world is one `ref`. The view is JSX, split into cells so that the
bricks are not rebuilt while only the ball moves, as in section 6.

One piece is new. A game needs a clock, and a cell cannot call an action. `ticks` is a generator
cell that yields the time since the last frame. `on(ticks, tick)` describes a *subscription*:
"deliver each value of `ticks` to the action `tick`". The cell `subscriptions` returns that
description while the game is playing and an empty list otherwise, and the notebook starts and
stops the clock to match.

---

**Try it.** Press **play** and move the pointer over the board. Then open the breakout module and,
in `step`, change the paddle width. The game keeps its score, because the world is state and
`step` is only the rule for changing it.

---

`test_replay` plays 600 frames twice, with no browser and no clock, and checks that both runs end
with the same score and ball position. A recorded list of events always replays to the same game,
because `step` depends only on its arguments.

---

## How it works

(the relocated implementation cells go here: what a cell compiles to; ref cells as two variables;
capabilities as core cells; `compile` and its island; subscriptions and the reconciler; the
renderer; how the typed source is kept in the saved notebook; the editor's rule for refusing an
edit; why four sections are modules)

---

## What is guaranteed

For a cell the checker accepts: it reads only its parameters and the allowed built-ins; while it
runs it writes only values it made; a `ref` changes only when the page calls an action; and every
effect is a named parameter. A cell with no capability parameter returns the same value for the
same inputs.

Not guaranteed:

- The checker is a prototype. (keep the existing measured sentence on agreement with the reference
  checker, with its date)
- A rejected cell still runs. The verdict keeps it from being skipped or sent to a worker, and the
  editor will not save an edit that leaves a cell rejected.
- A cell may take `now` or `random` and be accepted. It is then not repeatable, and its signature
  shows it.

---

# Core module README (`core.ojs`), added 2026-11-14 after the Phase 4 screenshots

Replace `readme_title` with the text below. The four example cells must be shown as source cards
(source, verdict, type, value), the same cards the tutorial uses, so the card renderer has to live
in the core and the tutorial imports it. The counter view comes straight after the cards.

# SoundScript

This module is the SoundScript language: the checker, the compiler from a checked cell to runtime
variables, the library those variables call, and the editor support. It does not need the tutorial
module; a notebook can keep this one and drop the other.

Four SoundScript cells and a view that uses them:

(cards for `tally`, `bump`, `reset`, `doubled`, then `example_view`)

`tally` is state. `bump` and `reset` are actions, the only places it is written. `doubled` reads
it. Open any of them with its **edit** bar; a change is applied only if the whole module still
checks.

Then keep `readme_use` and the rest as they are, with these changes:

- `readme_use`: start with "To write SoundScript cells in another module of this notebook, import
  `ss` and each capability your cells name:" and keep the code block.
- `readme_storage`, `readme_memo`, `readme_editing`: one mechanism each already; split any
  sentence that carries two facts, and keep the facts.
- `readme_limits`: unchanged.
