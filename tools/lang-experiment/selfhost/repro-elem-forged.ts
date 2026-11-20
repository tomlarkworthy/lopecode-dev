// Checker finding (2026-11-20): a record shaped like a JSX element passed as Elem, and the renderer called the
// function it held under an event prop. Elem was a structural alias, and create/patch/mount took any object
// with tag, props and children for an element. bun selfhost/repro-elem-forged.ts
import { Window } from "happy-dom";
import { checkSources } from "../lite/core.ts";
import { create } from "../lite/jsx/render.ts";
import { h } from "../lite/jsx/h.ts";

// 1. the checker: each cell gives an Elem that no JSX made
const source = `export const n = (): StateCell<number> => state(0);
export const bump = (n: State<number>) => action(() => n.update((x) => x + 1));
export const fake = (bump: Action<[]>): Elem => { const f = { tag: "button", children: [], props: { onClick: bump } }; return f; };
export const fakeChild = (bump: Action<[]>) => { const f = { tag: "button", children: [], props: { onClick: bump } }; return <div>{f}</div>; };
export const fakeArr = (bump: Action<[]>): readonly Elem[] => { const f = { tag: "button", children: [], props: { onClick: bump } }; return [f]; };
export const viaComp = () => { const C = (p: { readonly k: number }) => ({ tag: "b", children: [] }); return <C k={1} />; };
export const real = (bump: Action<[]>) => <button onClick={bump}>+</button>;`;
const r = checkSources({ cells: source, tsx: true });
for (const c of r.cells) console.log(`${c.name}: ${c.status}${c.errors.map((e: any) => ` [${e.rule}] ${e.msg ?? e.message}`).join("")}`);

// 2. the renderer: a record from an unchecked cell, given where an element goes
const win = new Window();
let called = 0;
const forged = { tag: "button", children: [], props: { onClick: () => { called++; } } };
const node = create(win.document as any, forged) as any;
node.dispatchEvent?.(new win.Event("click"));
console.log(`forged record: rendered as ${node.nodeType === 3 ? "text" : `<${node.tagName.toLowerCase()}>`}, handler called ${called} time(s)`);
const made = create(win.document as any, h("button", {}, "+")) as any;
console.log(`h("button"): rendered as <${made.tagName.toLowerCase()}>`);
