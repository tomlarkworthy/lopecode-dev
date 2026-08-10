// Single browser-injectable bundle of everything the trace test needs, exposed
// on one global so a page.evaluate can reach it.
import { calib } from "./calib-core.ts";
import { makeMatTarget, matTargetSvg, matMarkPagePx } from "./mat-target.js";
import * as trace from "./trace-core.js";
globalThis.TRACE = { calib, makeMatTarget, matTargetSvg, matMarkPagePx, ...trace };
