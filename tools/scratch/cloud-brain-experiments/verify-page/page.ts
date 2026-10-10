/**
 * One Worker's verify page, made from what the Brain serves: the page's frame with every module taken out, then
 * the module the Worker runs (getSource) and the modules it imports put back in. Boots that module alone, runs
 * its test_ cells, leaves the result on window.__verify. Public reads, no key.
 *   bun page.ts https://cb4.endpointservices.workers.dev brain-x-issues issues.html
 */
import { writeFileSync } from "node:fs";
import { blocks, insideABlock } from "../../../lib/notebook-blocks.ts";
import { buildScriptBlock, importsOf } from "../../../channel/sync-module.ts";

const [kernel, worker, to] = process.argv.slice(2);
const X = "/xrpc/com.lopecode.brain.", deployer = kernel.replace(/^(https:\/\/[^/.]+)/, "$1-deployer");
const [html, src, listed] = await Promise.all([fetch(kernel + "/").then((r) => r.text()), fetch(kernel + X + "getSource?worker=" + worker).then((r) => r.json()), fetch(deployer + X + "infra.getModules").then((r) => r.json())]);

const all = blocks(html);
const isModule = (b: { id: string; attrs: string }) => b.attrs.includes('data-mime="application/javascript"') && !b.attrs.includes("data-encoding") && /^(@[^/]+\/[^/]+|d\/[^/]+)$/.test(b.id);
const pageModules = new Set(all.filter(isModule).map((b) => b.id));
const ownerOf = (id: string) => [...pageModules].find((m) => id.startsWith(m + "/")) || null;

// Each module: its block, and the blocks it owns (its files), which go ahead of it.
type Mod = { block: string; owned: { id: string; block: string }[] };
const mods = new Map<string, Mod & { text: string }>();
for (const b of all.filter(isModule)) mods.set(b.id, { text: b.content, block: html.slice(b.start, b.end), owned: [] });
for (const b of all) { const o = !isModule(b) && ownerOf(b.id); if (o) mods.get(o)!.owned.push({ id: b.id, block: html.slice(b.start, b.end) }); }
// A service's module is not in the page: the page loads it from its Worker. What the Worker runs wins.
const mime = (n: string) => (n.endsWith(".js") ? "text/javascript" : n.endsWith(".json") ? "application/json" : "text/plain");
const served = (id: string, text: string, files: Record<string, string> = {}) =>
  mods.set(id, { text, block: buildScriptBlock(id, text), owned: Object.entries(files).map(([n, t]) => ({ id: id + "/" + n, block: `<script id="${id}/${n}" \n  type="text/plain"\n  data-mime="${mime(n)}"\n>${t}</script>` })) });
for (const m of listed.modules) served(m.module, m.text, m.files || {});
served(src.module, src.text, (listed.modules.find((m: any) => m.module === src.module) || {}).files || {});

// The modules the one under test imports, by the import cells of each (importsOf, as sync-module resolves them).
const keep: string[] = [], todo = [src.module];
while (todo.length) {
  const id = todo.pop()!;
  if (keep.includes(id)) continue;
  if (!mods.has(id)) throw new Error(`${id} is imported and is neither in the page nor a service's module`);
  keep.push(id);
  todo.push(...importsOf(mods.get(id)!.text));
}

// The frame: the page with no module and no block a module owns. Then the kept ones, ahead of the bootloader.
let frame = "", at = 0;
for (const b of all) {
  if (!isModule(b) && !ownerOf(b.id)) continue;
  frame += html.slice(at, b.start);
  at = b.end;
}
frame += html.slice(at);
const marker = "<!-- Bootloader -->";
let boot = -1;
for (let from = 0; boot < 0; ) { const i = frame.indexOf(marker, from); if (i < 0) throw new Error("no document-level " + marker); if (!insideABlock(frame, i)) boot = i; from = i + marker.length; }
const put = keep.map((id) => [...mods.get(id)!.owned.map((o) => o.block), mods.get(id)!.block].join("\n\n")).join("\n\n");
let out = frame.slice(0, boot) + put + "\n\n" + frame.slice(boot);
// The boot list is the one module.
const conf = blocks(out).filter((b) => b.id === "bootconf.json").map((b) => { try { return { b, conf: JSON.parse(b.content) }; } catch { return null; } }).filter(Boolean).at(-1)!;
out = out.slice(0, conf.b.start) + `<script id="bootconf.json"${conf.b.attrs}>\n${JSON.stringify({ ...conf.conf, mains: [src.module], hash: "" }, null, 2)}\n</script>` + out.slice(conf.b.end);

const runner = `<script>(async () => {
  const t0 = performance.now(), name = ${JSON.stringify(src.module)};
  let rt, mod;
  for (;;) { rt = window.__ojs_runtime; mod = rt && rt.mains && rt.mains.get(name); if (mod && [...rt._variables].some((v) => v._module === mod && /^test_/.test(v._name || ""))) break; await new Promise((r) => setTimeout(r, 50)); }
  const boot = Math.round(performance.now() - t0);
  const names = [...rt._variables].filter((v) => v._module === mod && /^test_/.test(v._name || "")).map((v) => v._name), failed = [];
  await Promise.all(names.map((n) => Promise.race([mod.value(n), new Promise((_, no) => setTimeout(() => no(new Error("no result in 30 s")), 30000))]).catch((e) => failed.push({ name: n, message: String((e && e.message) || e).slice(0, 300) }))));
  const other = [...rt._variables].filter((v) => v._module !== mod && /^test_/.test(v._name || "") && v._version > 0 && v._value !== undefined).length;
  window.__verify = { worker: ${JSON.stringify(worker)}, module: name, hash: ${JSON.stringify(src.hash)}, ok: !failed.length, tests: names.length, failed, bootMs: boot, testMs: Math.round(performance.now() - t0) - boot, otherTestsRan: other, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, ua: navigator.userAgent };
})();</scr` + `ipt>\n`;
writeFileSync(to, out + runner);
console.log(JSON.stringify({ worker, module: src.module, hash: src.hash.slice(0, 12), modules: keep.length, pageModules: pageModules.size, bytes: out.length, page: html.length }));
