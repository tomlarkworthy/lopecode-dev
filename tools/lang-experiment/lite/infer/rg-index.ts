// The registry cells (rg-*.ss.ts) for the tools that read them on their own: the file list, the cells, a linker with
// cells replaced (rg-diff.ts's controls), and the registry the checker builds from them (core.ts rgRegistry), which
// rg-diff.ts compares with registry.ts unit by unit. The checker links them in ../infer-ss.ts; the glue that makes
// them a Registry is in ../core.ts.
export { RG_FILES, RG_CELLS, linkRg } from "../infer-ss.ts";
export { rgRegistry, mdRegistry, runCheck, RG, GAP_RULE, type RgRegistry, type RgCells } from "../core.ts";
export { rgRegistryOf, declTreesOf } from "./rg-registry.ts";
import type { linkRg } from "../infer-ss.ts";
export type RgLinked = ReturnType<typeof linkRg>;
