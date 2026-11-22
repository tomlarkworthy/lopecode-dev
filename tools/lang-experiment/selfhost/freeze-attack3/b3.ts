// 5. publication paths: a promise among a published function's captures (keep mode: frozen in place when it settles,
// leaves not copied), a promise in a slot, rejection reasons, async IIFEs
import { C, L, W } from "./harness.ts";
const T = "const t = new Uint8Array(2); ";
export const cands = [
  C("hp-typed-iife", "const a = () => { " + T + "const p = (async () => t)(); " + L("t[0] = 1;") + "return () => p; };"),
  C("hp-typed-helper", "const a = () => { " + T + "const mk = async () => t; const p = mk(); " + L("t[0] = 1;") + "return () => p; };"),
  C("hp-rec-typed", "const a = () => { " + T + "const p = (async () => ({ t }))(); " + L("t[0] = 1;") + "return () => p; };"),
  C("hp-promise-resolve", "const a = () => { " + T + "const p = Promise.resolve(t); " + L("t[0] = 1;") + "return () => p; };"),
  C("hp-promise-all", "const a = () => { " + T + "const p = Promise.all([Promise.resolve(t)]); " + L("t[0] = 1;") + "return () => p; };"),
  C("hp-then", "const a = () => { " + T + "const p = Promise.resolve(0).then(() => t); " + L("t[0] = 1;") + "return () => p; };"),
  C("hp-native-map", "const a = () => { const m = structuredClone(new Map<string, number>()); const p = (async () => m)(); " + L("m.set(\"k\", 1);") + "return () => p; };"),
  C("hp-native-set", "const a = () => { const s = structuredClone(new Set<number>()); const p = (async () => s)(); " + L("s.add(1);") + "return () => p; };"),
  C("hp-native-map-rec", "const a = () => { const m = structuredClone(new Map<string, number>()); const p = (async () => ({ m }))(); " + L("m.set(\"k\", 1);") + "return () => p; };"),
  C("hp-array", "const a = () => { const xs = [0]; const p = (async () => xs)(); " + L("xs.push(1);") + "return () => p; };"),
  C("hp-in-rec-fn", "const a = () => { " + T + "const p = (async () => t)(); " + L("t[0] = 1;") + "return { g: () => p }; };"),
  C("hp-action", "const a = () => { " + T + "const p = (async () => t)(); " + L("t[0] = 1;") + "return action(() => { p.then(() => 0); }); };"),
  C("hp-consumer-awaits", "const a = () => { " + T + "const p = (async () => t)(); " + L("t[0] = 1;") + "return () => p; };\nconst obs = async function* (a: () => Promise<Uint8Array>) { const t = await a(); yield [t[0]]; " + W + W + "yield [t[0]]; };", { twice: ["obs"] }),
  C("hp-consumer-awaits-map", "const a = () => { const m = structuredClone(new Map<string, number>()); const p = (async () => m)(); " + L("m.set(\"k\", 1);") + "return () => p; };\nconst obs = async function* (a: () => Promise<Map<string, number>>) { const m = await a(); yield [m.size]; " + W + W + "yield [m.size]; };", { twice: ["obs"] }),
  C("hp-gen-yield-fn", "const a = function* () { " + T + "const p = (async () => t)(); yield () => p; t[0] = 1; yield 0; };"),
  // promise in a slot (replaced by p.then(deepFreeze)): controls of the same shapes
  C("ps-slot-typed", "const a = () => { " + T + "const p = (async () => t)(); " + L("t[0] = 1;") + "return { p }; };"),
  C("ps-slot-native-map", "const a = () => { const m = structuredClone(new Map<string, number>()); const p = (async () => m)(); " + L("m.set(\"k\", 1);") + "return { p }; };"),
  // rejection reasons are not frozen
  C("rej-error-message-slot", "const a = () => { const e = new Error(\"x\"); const p = (async (): Promise<number> => { throw e; })(); " + L("e.message = \"y\";") + "return { p }; };\nconst obs = async function* (a: { p: Promise<number> }) { try { await a.p; yield \"none\"; } catch (x) { yield messageOf(x); " + W + W + "yield messageOf(x); } };", { twice: ["obs"] }),
  C("rej-error-message-fn", "const a = () => { const e = new Error(\"x\"); const p = (async (): Promise<number> => { throw e; })(); " + L("e.message = \"y\";") + "return () => p; };\nconst obs = async function* (a: () => Promise<number>) { try { await a(); yield \"none\"; } catch (x) { yield messageOf(x); " + W + W + "yield messageOf(x); } };", { twice: ["obs"] }),
  C("rej-error-cell", "const a = async () => { const e = new Error(\"x\"); " + L("e.message = \"y\";") + "throw e; };"),
  C("rej-array-thrown", "const a = () => { const xs = [0]; const p = (async (): Promise<number> => { throw xs; })(); " + L("xs.push(1);") + "return { p }; };\nconst obs = async function* (a: { p: Promise<number> }) { try { await a.p; yield \"none\"; } catch (x) { yield JSON.stringify(x); " + W + W + "yield JSON.stringify(x); } };", { twice: ["obs"] }),
  C("rej-typed-thrown", "const a = () => { " + T + "const p = (async (): Promise<number> => { throw t; })(); " + L("t[0] = 1;") + "return { p }; };\nconst obs = async function* (a: { p: Promise<number> }) { try { await a.p; yield \"none\"; } catch (x) { yield String(x); " + W + W + "yield String(x); } };", { twice: ["obs"] }),
  C("rej-caught-published", "const a = () => { const e = new Error(\"x\"); const p = (async (): Promise<number> => { throw e; })(); " + L("e.message = \"y\";") + "return { p }; };\nconst b = async (a: { p: Promise<number> }) => { try { await a.p; return { e: \"none\" }; } catch (x) { return { e: x }; } };"),
];
