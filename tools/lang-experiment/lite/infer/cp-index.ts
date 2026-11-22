// The completion and facts cells (cp-*.ss.ts) for the tools that read them on their own: the file list, the cells and
// a linker with cells replaced (cp-diff.ts's controls). The checker links them in ../infer-ss.ts; the glue that runs
// them is ../complete.ts and ../facts.ts, which take a linked copy as their record of cells.
export { CP_FILES, CP_CELLS, linkCp } from "../infer-ss.ts";
import type { linkCp } from "../infer-ss.ts";
export type CpLinked = ReturnType<typeof linkCp>;
