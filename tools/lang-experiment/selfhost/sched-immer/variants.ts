// Step implementations with the interface shell.ts takes: { init, step, hidAt, candidates, liveEvents, running, pulling }.
// copy: ../sched/step.ss.ts linked unchanged. inplace-*: the state is mutated and returned. immer-*: produce() over
// three shapes of `hs`: map (Map<hid, Hs>), obj (Record<hid, Hs>), bucket (Map<hid >> 6, Map<hid, Hs>>).
import { Immer, enableMapSet, enableArrayMethods, isDraft, current } from "immer";
import { mut, freeze } from "../../lite/runtime-ss.ts";
import { link } from "../../lite/link.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as stepCells from "../sched/step.ss.ts";
import { apply, type Hs, type Tab, type View, type Ev, type Fx } from "./core.ts";

enableMapSet();
if (process.env.IMMER_ARRAY_METHODS === "1") enableArrayMethods();
export const B = 6; // bucket = hid >> B, 64 hids per bucket

type Shape = "map" | "obj" | "bucket";
const tabOf = (shape: Shape, hs: any): Tab<number, Hs> => {
  if (shape === "map") return hs;
  if (shape === "obj") return {
    get: (k) => hs[k], set: (k, v) => (hs[k] = v), delete: (k) => delete hs[k],
    *entries() { for (const k in hs) yield [+k, hs[k]]; },
  };
  return {
    get: (k) => hs.get(k >> B)?.get(k),
    set: (k, v) => { const b = hs.get(k >> B); if (b === undefined) hs.set(k >> B, new Map([[k, v]])); else b.set(k, v); },
    delete: (k) => { const b = hs.get(k >> B); if (b !== undefined) { b.delete(k); if (b.size === 0) hs.delete(k >> B); } },
    *entries() { for (const b of hs.values()) yield* b.entries(); },
  };
};
const emptyHs = (shape: Shape) => (shape === "obj" ? {} : new Map());
const viewOf = (shape: Shape, d: any): View => ({
  hs: tabOf(shape, d.hs),
  get at() { return d.at; }, get ls() { return d.ls; }, get lat() { return d.lat; }, get born() { return d.born; },
  get placer() { return d.placer; }, set placer(x: boolean) { d.placer = x; },
  get generation() { return d.generation; }, set generation(x: number) { d.generation = x; },
});
const queries = (shape: Shape) => {
  const getH = (st: any, hid: number) => tabOf(shape, st.hs).get(hid);
  return {
    hidAt: (st: any, key: string): number | null => st.at.get(key) ?? null,
    candidates: (st: any) => ({ lids: [...st.lat.values()] as number[], hids: [...st.at.values()] as number[] }),
    liveEvents: (st: any): number => st.at.size,
    running: (st: any, of: readonly number[] | null): number =>
      of === null ? st.lat.size : [...st.lat.values()].filter((lid: number) => { const l = st.ls.get(lid); return l !== undefined && of.includes(l.hid); }).length,
    pulling: (st: any, of: readonly number[] | null): number =>
      [...st.at.values()].filter((hid: number) => { const h = getH(st, hid); return h !== undefined && (of === null || of.includes(hid)) && h.gen && !h.done && h.listeners.length > 0; }).length,
  };
};
const initOf = (shape: Shape) => ({ hs: emptyHs(shape), at: new Map(), ls: new Map(), lat: new Map(), born: new Map(), placer: false, generation: 0 });

export type Impl = { init: any; step: (st: any, ev: Ev) => { state: any; effects: readonly Fx[] } } & ReturnType<typeof queries>;

export const copy = (): Impl => link({ ...rtCells, ...stepCells }, { mut, freeze }) as any;

export const inplace = (patchRecord: boolean): Impl => ({
  ...queries("map"),
  init: initOf("map"),
  step: (st, ev) => { const fx: Fx[] = []; apply(viewOf("map", st), ev, fx, (x) => x, patchRecord); return { state: st, effects: fx }; },
});

const plain = <T,>(x: T): T => (isDraft(x) ? current(x as any) : x);
export const immer = (shape: Shape, autoFreeze: boolean): Impl => {
  const im = new Immer({ autoFreeze });
  return {
    ...queries(shape),
    init: initOf(shape),
    step: (st, ev) => {
      const fx: Fx[] = [];
      const state = im.produce(st, (d: any) => { apply(viewOf(shape, d), ev, fx, plain, true); });
      return { state, effects: fx };
    },
  };
};

export const pick = (name: string): Impl => {
  if (name === "copy") return copy();
  if (name === "inplace-patch") return inplace(true);
  if (name === "inplace-replace") return inplace(false);
  const m = /^immer-(map|obj|bucket)-(freeze|nofreeze)$/.exec(name);
  if (m) return immer(m[1] as Shape, m[2] === "freeze");
  throw new Error(`unknown variant ${name}`);
};
export const NAMES = ["copy", "inplace-patch", "inplace-replace",
  ...(["map", "obj", "bucket"] as const).flatMap((s) => [`immer-${s}-freeze`, `immer-${s}-nofreeze`])];
