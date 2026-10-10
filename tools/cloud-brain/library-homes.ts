#!/usr/bin/env bun
// Makes the library's notebooks that are pushed to a public repo public, and puts each module's card at its home.
//   BRAIN_BASE=cb4 bun tools/cloud-brain/library-homes.ts plan | run | check
// A notebook qualifies when the file the library keeps is, byte for byte, the blob at origin/main of lopecode or
// lopebooks (run `git fetch` in both first). One that is tracked but kept in another version is put again from the blob.
// The home of a module is modules/canonical.json's lopecode notebook, else its lopebooks one, else any qualifying
// notebook that has it (lopecode first). `library.index` writes every card of a notebook, so homes are indexed in an
// order that leaves each module with the notebook indexed last among those that have it.
import { readFileSync, appendFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { importNotebookModule } from "../notebook-import.ts";
import { loadCanonical } from "../lope-sync.ts";

const root = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const base = process.env.BRAIN_BASE || "";
if (!base) throw new Error("BRAIN_BASE");
const cmd = process.argv[2] || "plan";
const out = join(root, "tools/cloud-brain/.emitted");
const logPath = join(out, base + "-library-homes.jsonl");
mkdirSync(join(out, "homes-tmp"), { recursive: true });
const NS = "/xrpc/com.lopecode.brain.";
const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const git = (repo: string, ...a: string[]) => Bun.spawnSync(["git", "-C", join(root, repo), ...a], { maxBuffer: 1 << 28 }).stdout;
const brain = async (path: string, ...curl: string[]) => {
  const p = Bun.spawn(["bun", join(root, "tools/cloud-brain/brain.ts"), "curl", NS + path, "--owner", "-S", "--retry", "2", "-m", "300", ...curl], { stdout: "pipe", stderr: "pipe", env: process.env });
  const text = (await new Response(p.stdout).text()).trim();
  await p.exited;
  const m = /^([\s\S]*) \[(\d+)\]$/.exec(text) || [null, text, "0"];
  let body: any = null; try { body = JSON.parse(m[1]!); } catch { body = { raw: String(m[1]).slice(0, 300) }; }
  return { status: Number(m[2]), body };
};
const post = (path: string, body: unknown) => brain(path, "-X", "POST", "-H", "content-type: application/json", "-d", JSON.stringify(body));
const log = (row: any) => { appendFileSync(logPath, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n"); return row; };

// The library's name for a repo file, as library-backfill.ts chose it.
const tracked = (repo: string) => new Set(String(git(repo, "ls-tree", "-r", "--name-only", "origin/main", "notebooks/")).split("\n").filter((f) => f.endsWith(".html")));
const T: Record<string, Set<string>> = { lopecode: tracked("lopecode"), lopebooks: tracked("lopebooks") };
const candidates = (name: string): [string, string][] =>
  name === "cloud-brain" ? [["lopebooks", "notebooks/@tomlarkworthy_cloud-brain.html"]]
  : name.endsWith(".staging") ? [["lopebooks", `notebooks/${name.slice(0, -8)}.html`]]
  : [["lopecode", `notebooks/${name}.html`], ["lopebooks", `notebooks/${name}.html`]];

const library: any[] = (await brain("library.list")).body.notebooks;
const notebooks = library.map((n) => {
  const from = candidates(n.name).filter(([repo, path]) => T[repo].has(path));
  const blobs = from.map(([repo, path]) => ({ repo, path, bytes: git(repo, "show", `origin/main:${path}`) }));
  const same = blobs.find((b) => sha(b.bytes) === n.sha256);
  // Tracked, but the library keeps another version: the pushed blob is put in its place. lopecode first.
  const use = same || blobs[0] || null;
  return { name: n.name, public: !!n.public, kept: n.sha256, repo: use?.repo || null, path: use?.path || null, same: !!same, html: use ? new TextDecoder().decode(use.bytes) : null, bytes: use?.bytes };
});
const open = notebooks.filter((n) => n.repo);
// The cards of each notebook are libraryCards' own reading: the cell is taken from the built notebook, not copied here.
const libJs = join(out, "homes-tmp", "brain-library.js");
writeFileSync(libJs, Bun.spawnSync(["bun", join(root, "tools/lope-reader.ts"), join(root, "lopebooks/notebooks/@tomlarkworthy_cloud-brain.html"), "--get-module", "@tomlarkworthy/brain-library"], { maxBuffer: 1 << 26 }).stdout);
const libraryCards = await (await importNotebookModule(libJs, { overrides: { sha256: async (t: string) => sha(t) } })).value("libraryCards");
const host = (process.env.BRAIN_HOST || `${base}.endpointservices.workers.dev`);
const cardsOf = new Map<string, any[]>();
for (const n of open) cardsOf.set(n.name, await libraryCards(n.html!, { name: n.name, file: `library/${n.name}/${sha(n.bytes!).slice(0, 16)}.html`, host, open: true }));
// A card's title opens with its module's name; canonical.json is keyed by that.
const moduleOf = (c: any) => String(c.title).split(":")[0];
const has = new Map<string, string[]>([...cardsOf].map(([n, cs]) => [n, cs.map(moduleOf)]));
const cardId = (module: string) => { for (const cs of cardsOf.values()) { const c = cs.find((c) => moduleOf(c) === module); if (c) return c.id; } return ""; };
const byName = new Map(open.map((n) => [n.name, n]));
const nameOf = (repoPath: string) => {
  const [repo, , file] = repoPath.split("/"), stem = file.slice(0, -5);
  if (repo === "lopecode") return stem;
  if (stem === "@tomlarkworthy_cloud-brain") return "cloud-brain";
  // A staging file with a published namesake is under that name when it is the same file, else beside it.
  return byName.has(stem + ".staging") ? stem + ".staging" : stem;
};
const canonical = loadCanonical() as Record<string, any>;
const holders = new Map<string, string[]>();
for (const [n, mods] of has) for (const m of mods) holders.set(m, [...(holders.get(m) || []), n]);
const home = new Map<string, { name: string; declared: boolean }>();
const declaredOf = (m: string, hs: string[]) => [canonical[m]?.lopecode, canonical[m]?.lopebooks].filter((p) => typeof p === "string").map(nameOf).find((n) => hs.includes(n));
const declaredHomes = new Set([...holders].map(([m, hs]) => declaredOf(m, hs)).filter(Boolean));
for (const [m, hs] of holders) {
  const declared = declaredOf(m, hs);
  // No declared home: a notebook that is already some module's home, lopecode first, so fewer notebooks are indexed.
  const rank = (n: string) => Number(!declaredHomes.has(n)) * 2 + Number(byName.get(n)!.repo !== "lopecode");
  const fallback = [...hs].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0];
  home.set(m, { name: declared || fallback, declared: !!declared });
}
// N goes before H when N has a module whose home is H. A cycle is cut where it is found; those modules end elsewhere.
const homes = [...new Set([...home.values()].map((h) => h.name))].sort();
const after = new Map(homes.map((h) => [h, new Set(has.get(h)!.map((m) => home.get(m)!.name).filter((x) => x !== h))]));
const order: string[] = [], state = new Map<string, number>();
// Post-order over "is indexed after me": what must come later is placed first, then the list is reversed.
const visit = (n: string) => { if (state.get(n)) return; state.set(n, 1); for (const later of after.get(n)!) visit(later); state.set(n, 2); order.push(n); };
for (const h of homes) visit(h);
order.reverse();
const last = new Map<string, string>();
for (const n of order) for (const m of has.get(n)!) last.set(m, n);
const missed = [...home].filter(([m, h]) => last.get(m) !== h.name).map(([m, h]) => ({ module: m, home: h.name, gets: last.get(m), declared: h.declared }));
const plan = {
  library: library.length, qualify: open.length, alreadyPublic: open.filter((n) => n.public).length, toSetPublic: open.filter((n) => !n.public).map((n) => n.name).length,
  rePut: open.filter((n) => !n.same).map((n) => [n.name, n.repo]),
  stayAsTheyAre: notebooks.filter((n) => !n.repo).map((n) => [n.name, n.public ? "public" : "private"]),
  modules: holders.size, declaredHome: [...home.values()].filter((h) => h.declared).length, indexCalls: order.length, cycleMisses: missed
};
writeFileSync(join(out, base + "-library-homes-plan.json"), JSON.stringify({ ...plan, order, home: Object.fromEntries(home) }, null, 1));
// How many cards an index pass in this order writes with other words than the card had: each is one embedding.
const said = new Map<string, string>(); let flips = 0, writes = 0;
for (const n of order) for (const c of cardsOf.get(n)!) { writes++; const t = c.title + "\n" + c.text; if (said.has(c.id) && said.get(c.id) !== t) flips++; said.set(c.id, t); }
Object.assign(plan, { indexWrites: writes, textChangesAfterFirst: flips });
if (cmd === "plan") { console.log(JSON.stringify(plan, null, 1)); process.exit(0); }

const cards = async () => {
  const all: any[] = [];
  for (let cursor: string | undefined, i = 0; i < 50; i++) {
    const r = await brain(`knowledge.list?kind=module&limit=50${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`);
    all.push(...r.body.entries); cursor = r.body.cursor;
    if (!cursor) break;
  }
  return all;
};
const check = async () => {
  const all = await cards(), of = new Map(all.map((c) => [c.id, c]));
  const names = new Set(library.map((n) => n.name)), isPublic = new Map((await brain("library.list")).body.notebooks.map((n: any) => [n.name, !!n.public]));
  const at = (c: any) => decodeURIComponent(String(c.url).split("/library/")[1] || "");
  const declared = [...home].filter(([, h]) => h.declared);
  return {
    cards: all.length, public: all.filter((c) => c.public).length, private: all.filter((c) => !c.public).length, stale: all.filter((c) => c.staleSince).length,
    publicCardAtPrivateNotebook: all.filter((c) => c.public && names.has(at(c)) && !isPublic.get(at(c))).map((c) => c.id),
    declaredHome: declared.length, atDeclaredHome: declared.filter(([m, h]) => of.get(cardId(m)) && at(of.get(cardId(m))) === h.name).length,
    atPlannedHome: [...home].filter(([m, h]) => of.get(cardId(m)) && at(of.get(cardId(m))) === h.name).length, planned: home.size,
    noCard: [...home.keys()].filter((m) => !of.get(cardId(m)))
  };
};
if (cmd === "check") { console.log(JSON.stringify(await check(), null, 1)); process.exit(0); }
if (cmd !== "run") throw new Error("plan | run | check");

console.log("before", JSON.stringify(log({ step: "before", ...(await check()) })));
for (const n of open.filter((n) => !n.same)) {
  const file = join(out, "homes-tmp", n.name + ".html");
  writeFileSync(file, n.bytes!);
  const r = await brain(`library.put?name=${encodeURIComponent(n.name)}&public=true`, "-X", "POST", "-H", "content-type: text/html", "--data-binary", "@" + file);
  console.log("put", r.status, n.name, JSON.stringify(log({ step: "put", name: n.name, repo: n.repo, status: r.status, sha256: r.body.sha256, cards: r.body.cards, stale: r.body.stale, error: r.body.error })));
  if (r.status !== 200) process.exit(1);
}
for (const n of open.filter((n) => n.same && !n.public)) {
  const r = await post("library.setPublic", { name: n.name, public: true });
  log({ step: "setPublic", name: n.name, status: r.status, error: r.body.error });
  if (r.status !== 200) { console.log("setPublic failed", n.name, r.status, JSON.stringify(r.body)); process.exit(1); }
}
console.log("public set");
for (const name of order) {
  const t0 = Date.now(), r = await post("library.index", { name });
  log({ step: "index", name, status: r.status, cards: r.body.cards, stale: r.body.stale, ms: Date.now() - t0, error: r.body.error, message: r.body.message });
  console.log(new Date().toISOString().slice(11, 19), r.status, String(Date.now() - t0).padStart(6), String(r.body.cards ?? "-").padStart(4), name, r.body.error || "");
}
// What an order could not give: two homes that each have the other's module. The owner puts the home's card itself.
{
  const of = new Map((await cards()).map((c) => [c.id, c]));
  const want = [...home].map(([m, h]) => cardsOf.get(h.name)!.find((c) => moduleOf(c) === m)).filter((c) => of.get(c.id) && of.get(c.id).url !== c.url);
  for (let i = 0; i < want.length; i += 50) {
    const r = await post("knowledge.put", { entries: want.slice(i, i + 50).map((c) => ({ ...c, staleSince: 0 })) });
    console.log("placed by the owner", r.status, JSON.stringify(log({ step: "place", status: r.status, ids: want.slice(i, i + 50).map((c) => c.id), answer: { changed: r.body.changed, vectors: r.body.vectors, error: r.body.error, message: r.body.message } })).slice(0, 300));
  }
}
console.log("after", JSON.stringify(log({ step: "after", ...(await check()) })));
