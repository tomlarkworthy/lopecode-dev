// soundscript-acorn linked for bun as a notebook would run it: the module's checked cells (ss/acorn-kids.ss.ts,
// ss/acorn.ss.ts) and the consumer (ss/consumer.ss.ts), with the shell cell acornParse taken through FN CROSSING: the
// rule copy's cross() with the shape the rule copy's checker gives parse's parameter. The checked cells are linked as
// ../nested-ast/diff.ts links them (lite/link.ts: each cell's text evaluated in a scope holding the prelude).
import { readFileSync } from "node:fs";
import { join } from "node:path";
// the checker copy: rule (recursive copy walk, record-depth limit) or live (lite/boundary.ts's iterative walk of
// 2026-11-21T11:03Z with the same rule applied); SSA_COPY=live selects it
export const COPY = process.env.SSA_COPY ?? "rule";
const { link } = await import(`./${COPY}/lite/link.ts`);
const rtCells = await import(`./${COPY}/lite/runtime.ss.ts`);
import * as msgCells from "../nested-ast/orig/lite/messages.ss.ts";
import * as kidsCells from "./ss/acorn-kids.ss.ts";
import * as modCells from "./ss/acorn.ss.ts";
import * as conCells from "./ss/consumer.ss.ts";
import { acornParse } from "./shell/acorn-shell.ts";
const { cross, checkShape } = await import(`./${COPY}/lite/boundary.ts`);
const { checkSources } = await import(`./${COPY}/lite/core.ts`);

const HERE = import.meta.dir;
const src = ["ss/acorn-types.ss.ts", "ss/acorn-kids.ss.ts", "ss/acorn.ss.ts"].map((f) => readFileSync(join(HERE, f), "utf8")).join("\n");
const checked = checkSources({ cells: src, tsx: false, outside: [{ name: "acornParse" }] });
export const FN_SHAPE: any = checked.facts!.get("parse")!.params[0]!.boundary!.shape;
export const PARSE_SHAPE: any = FN_SHAPE.ret;
export const wrapped = cross(acornParse, FN_SHAPE, "parse.acornParse") as (text: string, jsx: boolean) => any;
(globalThis as any).__ssAcornParse = wrapped;
const prelude = { mut: rtCells.mut(), freeze: rtCells.freeze() };
export const linkM = (over: Record<string, any> = {}) => link({ ...msgCells, ...kidsCells, ...modCells, ...conCells, acornParse: () => (globalThis as any).__ssAcornParse, ...over } as any, prelude) as any;
export const M = linkM();
export { acornParse, cross, checkShape };
