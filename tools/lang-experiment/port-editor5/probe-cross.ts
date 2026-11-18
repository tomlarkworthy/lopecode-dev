// S11.4/S11.5 at run time: a record annotation given a class instance (an EditorView stand-in) and a
// Variable stand-in, as editor-5 would hand them over.
import { cross } from "../lite/boundary.ts";
class EditorView { state = { doc: "x = 1" }; dispatch() {} }
class Variable { _name = "x"; _inputs = []; _definition = () => 1; }
const rec = { k: "rec", props: [["state", { k: "rec", props: [["doc", { k: "str" }, false]] }, false]] } as const;
const vrec = { k: "rec", props: [["_name", { k: "str" }, false]] } as const;
for (const [what, v, s] of [["EditorView as {state:{doc:string}}", new EditorView(), rec], ["Variable as {_name:string}", new Variable(), vrec], ["plain {_name, _definition: fn} as {_name:string}", { _name: "x", _definition: () => 1 }, vrec]] as const) {
  try { console.log(`${what}: accepted ${JSON.stringify(cross(v, s as any, "p"))}`); } catch (e) { console.log(`${what}: ${(e as Error).message}`); }
}
