/**
 * One Worker's verify page, made from what the Brain serves: the page's shell, the module the Worker runs
 * (getSource) and the modules it imports. Boots that module alone, runs its test_ cells, leaves the result
 * on window.__verify. Public reads, no key.
 *   bun page.ts https://cb4.endpointservices.workers.dev brain-x-issues > issues.html
 */
const [kernel, worker] = process.argv.slice(2);
const X = "/xrpc/com.lopecode.brain.";
const deployer = kernel.replace(/^(https:\/\/[^/.]+)/, "$1-deployer");
const [html, src, listed] = await Promise.all([fetch(kernel + "/").then((r) => r.text()), fetch(kernel + X + "getSource?worker=" + worker).then((r) => r.json()), fetch(deployer + X + "infra.getModules").then((r) => r.json())]);
// A service's module is not in the page: the page loads it from its Worker. Here it is put in the file.
const served = new Map<string, string>(listed.modules.map((m: any) => [m.module, m.text]));
served.set(src.module, src.text);
const filesOf = new Map<string, Record<string, string>>(listed.modules.map((m: any) => [m.module, m.files || {}]));
const mimeOf = (n: string) => (n.endsWith(".js") ? "text/javascript" : n.endsWith(".json") ? "application/json" : "text/plain");
// Every <script id=…> block, with its span.
const blocks: { id: string; attrs: string; start: number; open: number; end: number }[] = [];
// Scripts in order, each closed before the next is looked for: a module's text may quote a <script> tag.
for (let at = 0; ; ) {
  const m = /<script\b([^>]*)>/g; m.lastIndex = at;
  const f = m.exec(html); if (!f) break;
  const open = f.index + f[0].length, close = html.indexOf("</script>", open);
  at = close + "</script>".length;
  const id = /^\s+id="([^"]+)"([\s\S]*)$/.exec(f[1]);
  if (id) blocks.push({ id: id[1], attrs: id[2], start: f.index, open, end: at });
}
const text = (b: (typeof blocks)[0]) => html.slice(b.open, b.end - "</script>".length);
const plain = (b: (typeof blocks)[0]) => /application\/javascript/.test(b.attrs) && !/data-encoding/.test(b.attrs) && b.id.startsWith("@") && b.id.split("/").length === 2;
const byId = new Map(blocks.filter(plain).map((b) => [b.id, b]));
// The modules the one under test reaches by import. Its own text is the Worker's.
const keep = new Set<string>(), todo = [src.module];
const source = (id: string) => served.get(id) ?? (byId.has(id) ? text(byId.get(id)!) : null);
while (todo.length) {
  const id = todo.pop()!;
  if (keep.has(id) || source(id) === null) continue;
  keep.add(id);
  for (const m of source(id)!.matchAll(/["'`](?:\/|https:\/\/api\.observablehq\.com\/)?(@[\w-]+\/[\w-]+|d\/[0-9a-f]+@\d+)(?:\.js)?(?:\?[^"'`]*)?["'`]/g)) todo.push(m[1]);
}
const runner = `<script>(async () => {
  const t0 = performance.now(), name = ${JSON.stringify(src.module)};
  let rt, mod;
  for (;;) { rt = window.__ojs_runtime; mod = rt && rt.mains && rt.mains.get(name); if (mod && [...rt._variables].some((v) => v._module === mod && /^test_/.test(v._name || ""))) break; await new Promise((r) => setTimeout(r, 50)); }
  const boot = Math.round(performance.now() - t0);
  const names = [...rt._variables].filter((v) => v._module === mod && /^test_/.test(v._name || "")).map((v) => v._name), failed = [];
  await Promise.all(names.map((n) => Promise.race([mod.value(n), new Promise((_, no) => setTimeout(() => no(new Error("no result in 30 s")), 30000))]).catch((e) => failed.push({ name: n, message: String((e && e.message) || e).slice(0, 300) }))));
  const other = [...rt._variables].filter((v) => v._module !== mod && /^test_/.test(v._name || "") && v._version > 0 && v._value !== undefined).length;
  window.__verify = { worker: ${JSON.stringify(worker)}, module: name, hash: ${JSON.stringify(src.hash)}, ok: !failed.length, tests: names.length, failed, bootMs: boot, testMs: Math.round(performance.now() - t0) - boot, otherTestsRan: other, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, ua: navigator.userAgent };
})();</scr` + `ipt>`;
let out = "", at = 0;
for (const b of blocks) {
  out += html.slice(at, b.start);
  at = b.end;
  if (b.id === "bootconf.json" && /text\/plain/.test(b.attrs) && text(b).length < 6000) out += `<script id="bootconf.json"${b.attrs}>\n${JSON.stringify({ ...JSON.parse(text(b)), mains: [src.module], hash: "" })}\n</script>`;
  else if (plain(b) && (!keep.has(b.id) || served.has(b.id))) continue;
  else out += html.slice(b.start, b.end);
}
out += html.slice(at);
// The served modules of the closure, as blocks ahead of the first module block of the page.
const tag = blocks.find(plain)!, added = [...keep].filter((id) => served.has(id)).map((id) => Object.entries(filesOf.get(id) || {}).map(([n, t]) => `<script id="${id}/${n}" type="text/plain" data-mime="${mimeOf(n)}">${t}</script>\n`).join("") + `<script id="${id}"${tag.attrs}>\n${served.get(id)}\n</script>\n`).join("");
const first = out.indexOf(`<script id="${blocks[0].id}"`);
out = out.slice(0, first) + added + out.slice(first);
out = out.includes("</body>") ? out.replace(/<\/body>(?![\s\S]*<\/body>)/, runner + "</body>") : out + runner;
console.error(JSON.stringify({ worker, module: src.module, hash: src.hash.slice(0, 12), modulesKept: keep.size, fromWorkers: [...keep].filter((id) => served.has(id)).length, pageModules: byId.size, bytes: out.length, from: html.length }));
process.stdout.write(out);
