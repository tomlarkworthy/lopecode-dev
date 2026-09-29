// S96: claude-code-pairing's cc_find_module resolves through runtime.mains, never to a non-mains module module-map labels "main".
// Live session 2026-09-29: an unsaved robocoop-5 chat log (a module outside mains, which module-map names "main")
// was returned for module "main" and for no module, so pairing tools read and wrote the chat log.
// Checks: name "main" finds nothing while only a non-mains module carries that label; no name returns the first
// non-frame main; an explicit name returns its main; nameOf names a module that joined mains late (module-map says
// "main"), which cc_change_forwarder uses for cell_change's module attribute. No model calls.
// usage: node s96-….mjs [lopecode/notebooks/@tomlarkworthy_claude-code-pairing.html]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopecode/notebooks/@tomlarkworthy_claude-code-pairing.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "S100(@tomlarkworthy/claude-code-pairing)" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = window.__ojs_runtime;
  const pairing = rt.mains.get("@tomlarkworthy/claude-code-pairing");
  const val = async n => { try { return await Promise.race([pairing.value(n), sleep(15000).then(() => undefined)]); } catch (e) { return undefined; } };
  const find = await val("cc_find_module");
  const cm = await val("viewof currentModules");
  if (typeof find !== "function" || !cm) return { pass: false, why: "cc_find_module/currentModules not available" };
  const createModule = await val("createModule");
  const entry = mod => [...cm.value.values()].find(e => e && e.module === mod);
  const settle = async mod => { for (let i = 0; i < 60 && !entry(mod); i++) await sleep(250); };
  // the stub and the late module are named by module-map BEFORE any user main exists, as in the live session
  const stub = rt.module();
  stub.variable({}).define("chatlog", [], () => "chat");
  const late = rt.module();
  late.variable({}).define("l", [], () => 2);
  await settle(stub); await settle(late);
  rt.mains.set("@probe/late", late);
  const user = createModule("@probe/user", rt);
  user.variable({}).define("u", [], () => 1);
  await settle(user);
  const labels = { stub: entry(stub)?.name, user: entry(user)?.name, late: entry(late)?.name };
  const checks = {
    stubLabelledMain: labels.stub === "main",
    mainIsNotTheStub: find(rt, "main") !== stub,
    noNameIsNotTheStub: find(rt) !== stub,
    noNameIsAMain: [...rt.mains.values()].includes(find(rt)),
    explicitName: find(rt, "@probe/user") === user,
    nameOfLate: typeof find.nameOf === "function" && find.nameOf(rt, late) === "@probe/late",
    nameOfStubIsNotMain: typeof find.nameOf === "function" && find.nameOf(rt, stub) == null
  };
  return { labels, checks, pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
