// The cells of shape.ss.ts, linked for bun (link.ts) with the checker's show and subst, which they take; in the notebook
// they are compiled cells of @tomlarkworthy/soundscript-checker.
import * as cells from "./shape.ss.ts";
import { show, subst } from "./types.ts";
import { link } from "./link.ts";
import * as prelude from "../prelude.runtime.ts";
export type { TypeShape, ShapeErr, ShapeOr, Expansion } from "./shape.ss.ts";

// over: cells to put in place of the file's (shape.test.ts's controls)
export const linkShape = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...cells, ...over } as typeof cells, prelude, { show, subst });
export const { shapeAt, boundaryShapeAt } = linkShape();
