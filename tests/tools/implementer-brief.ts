// The implementer's brief as a test reads it. Since writer-brief-and-tool-output-smaller (2026-10-13) the brief is
// agents/implementer.md, what every task needs, and eleven pages beside it, agents/implementer/<page>.md, each read
// by a writer whose task is of its kind. `inFull()` is the pages joined in the order the brief had their text, so a
// test of a sentence or a step that moved to a page reads it there, between the anchors it had ("\n10. **", "## A
// post mortem"). `core()` is the file every writer reads. A test names one of the two.
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

export const AGENTS = resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents");
export const PAGES = ["start", "seed-tests", "ready-to-land", "landing", "submit-and-wait", "resumed-round", "post-mortem", "asking-and-waiting", "quick-win", "deploy-put-back", "tracker-calls"];
export const page = (name: string, agents = AGENTS) => readFileSync(join(agents, "implementer", name + ".md"), "utf8");
export const core = (agents = AGENTS) => readFileSync(join(agents, "implementer.md"), "utf8");
export const inFull = (agents = AGENTS) => PAGES.map((p) => page(p, agents)).join("");
