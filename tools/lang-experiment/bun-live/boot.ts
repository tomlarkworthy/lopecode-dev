// Boots a notebook as bun-verify/run.ts does (lope-runtime.js loadNotebook with ../bun-verify/capabilities.ts), keeps it,
// and gives the module of each name. run.ts is a script with no exported boot, so its loadNotebook call is repeated here.
import { loadNotebook } from "../../lope-runtime.js";
import { ALL } from "../bun-verify/capabilities.ts";

export const OWN = /^@tomlarkworthy\/(soundscript(-[a-z]+)?|raw-cells)$/;

export type Booted = {
  ex: any;
  rt: any;
  bootMs: number;
  moduleNamed(name: string): any;
  nameOfModule(m: any): string;
  isMain(m: any): boolean;
  toggles: string[];
};

export async function boot(notebook: string, poll = 100): Promise<Booted> {
  const t0 = performance.now();
  for (const c of ALL) c.preBoot?.();
  const ex: any = await loadNotebook(notebook, {
    settleTimeout: 30000,
    pollInterval: poll,
    log: () => {},
    instrument: (runtime: any) => { for (const c of ALL) c.install((n: string) => runtime._global(n), runtime); },
  });
  const rt = ex.runtime;
  const names = () => {
    const m = new Map<any, string>();
    for (const v of rt._variables) if (typeof v._name === "string" && v._name.startsWith("module ") && v._value) m.set(v._value, v._name.slice(7));
    for (const [n, mod] of rt.mains ?? []) m.set(mod, n);
    return m;
  };
  const isMain = (m: any) => [...(rt.mains?.values() ?? [])].includes(m);
  // the "run the tests" toggles, turned on as a click does (run.ts)
  const toggles: string[] = [];
  for (const v of rt._variables) {
    if (!v._name?.startsWith?.("viewof ") || !v._value?.querySelector || !isMain(v._module)) continue;
    const box = v._value.querySelector("input[type=checkbox]");
    if (!box || v._value.querySelector("label")?.textContent?.trim() !== "run the tests") continue;
    box.checked = true;
    box.dispatchEvent(new ex.context.Event("input", { bubbles: true }));
    toggles.push(names().get(v._module) ?? "?");
  }
  return {
    ex, rt, bootMs: performance.now() - t0, toggles, isMain,
    moduleNamed: (n) => { for (const [m, x] of names()) if (x === n) return m; return null; },
    nameOfModule: (m) => names().get(m) ?? "?",
  };
}
