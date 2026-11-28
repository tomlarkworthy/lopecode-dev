// incr2: the stored memo of a built notebook, made from its page. build.ts calls pageStore when memo-store.json was
// made for another checker. It opens the page, checks every named module that holds SoundScript cells (ss_check) and
// reads each cell's entry off its compiled definition: {stamp: ss_memoStamp(), modules: {name: JSON with Maps and
// Sets tagged}, counts}.
import { chromium } from "../../../../node_modules/playwright/index.mjs";

export async function pageStore(html: string): Promise<{ stamp: string; modules: Record<string, string>; counts: string[] }> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto("file://" + html);
    return await page.evaluate(async () => {
      const until = async (f: () => unknown) => { while (!f()) await new Promise((x) => setTimeout(x, 50)); };
      const W = window as any;
      await until(() => W.__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-spec"));
      const rt = W.__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
      const cellsOf = await core.value("ss_moduleCells"), nameOf = await core.value("ss_moduleName"), check = await core.value("ss_check"), stampOf = await core.value("ss_memoStamp");
      const ENTRY = Symbol.for("soundscript.incr.entry");
      const enc = (_k: string, v: unknown) => (v instanceof Map ? { $map: [...v] } : v instanceof Set ? { $set: [...v] } : v);
      const modules: Record<string, string> = {}, counts: string[] = [];
      for (const m of new Set([...rt._variables].map((v: any) => v._module))) {
        const cells = cellsOf(m);
        // a module with no name of its own (ss_instance's test copies) is named anew on each load: nothing to store
        if (!cells.length || nameOf(m).startsWith("~")) continue;
        check(m);
        const got = cells.flatMap((c: any) => { const e = c.definition?.[ENTRY]; return e?.name === c.key ? [[c.key, e.entry]] : []; });
        modules[nameOf(m)] = JSON.stringify(got, enc);
        counts.push(`${nameOf(m).replace("@tomlarkworthy/", "")} ${got.length}/${cells.length}`);
      }
      return { stamp: stampOf(), modules, counts };
    });
  } finally { await browser.close(); }
}
