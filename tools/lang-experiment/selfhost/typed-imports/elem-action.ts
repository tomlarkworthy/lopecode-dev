// bun selfhost/typed-imports/elem-action.ts: what an importer's checked code can do with an Elem of @b whose onClick is @b's action
import { checkProgram } from "./ti-link.ts";
const B = "export const s = () => state(1);\nexport const btn = (s: State<number>) => <button onClick={action(() => s.set(1))}>x</button>;";
for (const a of ["const m = (btn) => btn.props;", "const m = (btn) => btn.onClick;", "const m = (btn) => <div>{btn}</div>;", "const n = () => state(0);\nconst m = (n: State<number>, btn) => action(() => n.set(btn ? 1 : 0));"]) {
  const P = checkProgram([{ name: "@b", cells: B, outside: [], imports: [] }, { name: "@a", cells: a, outside: [], imports: [{ local: "btn", imported: "btn", from: "@b", view: false }] }]);
  console.log(JSON.stringify(a), JSON.stringify(P.modules.get("@a")!.result.cells.map((c) => [c.name, c.status, c.errors.map((e) => e.rule + " " + e.msg)])));
}
