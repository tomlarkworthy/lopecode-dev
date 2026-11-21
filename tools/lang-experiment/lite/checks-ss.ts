// checks.ss.ts's cells linked for stdlib/runtime.ts; mut and freeze from the prelude
import * as cells from "./checks.ss.ts";
import { link } from "./link.ts";
import * as prelude from "../prelude.runtime.ts";
export type { CheckOutside, CellText, StoodIn, CellVerdict } from "./checks.ss.ts";
export const { checkKey, lruTouch, standIns, refusedCells, islandKey } = link(cells, prelude);
