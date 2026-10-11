// What a test of this directory reads from the checkout, for a checkout that lacks it.
// Issue tests-tools-fail-in-a-fresh-worktree; tools/cloud-brain/records/tests-tools-fail-in-a-fresh-worktree.md.
import { existsSync } from "node:fs";
import { test } from "bun:test";

export const BUILT = "tools/cloud-brain/.emitted/cloud-brain.html";
export const COMMITTED = "lopebooks/notebooks/@tomlarkworthy_cloud-brain.html";

// The notebook a test reads statements from: the one named, else a worktree's own build when it has one, else the committed one.
export const notebookOf = ({ named, worktree, built }: { named?: string; worktree: boolean; built: boolean }) =>
  named || (worktree && built ? BUILT : COMMITTED);

// `test` when every path is there. Otherwise test.skip, and one line that names the file and what it lacks.
export const testNeeding = (file: string, paths: string[]) => {
  const lacks = paths.filter((p) => !existsSync(p));
  if (!lacks.length) return test;
  console.log(`skipped: ${file}: no ${lacks.join(", ")}. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, git submodule update --init cloud-brain-dev lopebooks lopecode`);
  return test.skip;
};
