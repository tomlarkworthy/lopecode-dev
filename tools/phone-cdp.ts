// Attach to a Chrome tab on an Android phone and drive it over the DevTools
// protocol. This is the real protocol on the real device, so a frame budget
// measured here is the one the user sees -- not a desktop imitation of a phone
// and not a number relayed by hand.
//
// Raw CDP over the PAGE socket, deliberately not Playwright: connectOverCDP
// wants a browser-level endpoint and Android Chrome's fails the handshake
// ("ws://127.0.0.1:9222/devtools/browser 101 WebSocket Protocol Handshake").
// Every page target advertises its own webSocketDebuggerUrl, which works.
//
// The bridge must be established OUTSIDE this sandbox -- it reaches localhost
// and the internet but not USB and not the private address range:
//
//   adb kill-server; adb devices
//   adb forward tcp:9222 localabstract:chrome_devtools_remote
//
// Everything after that forward is localhost, so it works from in here.
//
//   bun tools/phone-cdp.ts list
//   bun tools/phone-cdp.ts stages --secs 10     # the rig's frame budget
//   bun tools/phone-cdp.ts eval 'location.href'
//   bun tools/phone-cdp.ts profile --secs 6     # main-thread sampling profile
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const cmd = argv[0] ?? "list";
const flag = (n: string, d: string) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 ? argv[i + 1] : d;
};
const PORT = +flag("port", "9222");
const MATCH = flag("match", "coded-landmark");
const SECS = +flag("secs", "8");

const targets = async () => {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(3000) });
    return r.ok ? await r.json() as any[] : null;
  } catch { return null; }
};

// EVERY adb subcommand starts a daemon if none is listening -- `adb forward`
// as much as `adb devices`. A daemon started in this sandbox can never see USB,
// and once it owns port 5037 the user's own adb silently reuses it and their
// phone stays invisible. That failure is indistinguishable from a dropped
// cable, and it cost four reconnects before it was spotted. So: touch adb only
// when someone else's daemon is already up, and never spawn one.
const daemonUp = await (async () => {
  try {
    const s = await Bun.connect({ hostname: "127.0.0.1", port: 5037,
      socket: { data() {}, open() {}, error() {} } });
    s.end();
    return true;
  } catch { return false; }
})();

let list = await targets();
if (!list && daemonUp) {
  // The forward drops whenever the device reattaches. Rebinding it is a
  // localhost conversation with a daemon that already exists, which is safe.
  spawnSync("adb", ["forward", `tcp:${PORT}`, "localabstract:chrome_devtools_remote"], { encoding: "utf8" });
  list = await targets();
}
if (!list) {
  console.error(
    `nothing answering on 127.0.0.1:${PORT}.\n\n` +
    `This sandbox reaches localhost and the internet but NOT USB and NOT the\n` +
    `private address range, so the phone has to be held by a daemon started\n` +
    `outside it. Run this there and leave it running:\n\n` +
    `  adb kill-server; adb devices\n` +
    `  adb forward tcp:${PORT} localabstract:chrome_devtools_remote\n\n` +
    `\`adb devices\` must show the phone as \`device\` first. Note that turning\n` +
    `on Wireless debugging switches USB debugging OFF on some builds.`);
  process.exit(2);
}

const pages = list.filter((t) => t.type === "page" && t.webSocketDebuggerUrl);
if (cmd === "list") {
  for (const t of list) console.log(`${String(t.type).padEnd(14)} ${t.title}\n${" ".repeat(15)}${t.url}`);
  process.exit(0);
}

const target = pages.find((t) => (t.url || "").includes(MATCH) || (t.title || "").includes(MATCH));
if (!target) {
  console.error(`no open tab matching "${MATCH}". Open it on the phone, or: phone-cdp.ts list`);
  process.exit(2);
}
console.error(`tab: ${target.title}\n     ${target.url}\n`);

// --- minimal CDP client -----------------------------------------------------
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise<void>((res, rej) => {
  ws.onopen = () => res();
  ws.onerror = (e: any) => rej(new Error("CDP socket: " + (e.message || "failed")));
});
let seq = 0;
const pending = new Map<number, (v: any) => void>();
ws.onmessage = (e: any) => {
  const m = JSON.parse(String(e.data));
  const s = pending.get(m.id);
  if (s) { pending.delete(m.id); s(m); }
};
const send = (method: string, params: any = {}) =>
  new Promise<any>((res) => {
    const id = ++seq;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });

// Returns the VALUE, and throws what the page threw rather than a shape.
const evaluate = async (expr: string) => {
  const r = await send("Runtime.evaluate", {
    expression: expr, awaitPromise: true, returnByValue: true, allowUnsafeEvalBlockedByCSP: true
  });
  if (r.error) throw new Error(r.error.message);
  const res = r.result;
  if (res.exceptionDetails)
    throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
  return res.result?.value;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The rig hangs its stage medians off the view node; hexRigView is the handle.
const STAGES_EXPR = `(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  if (!rt) return { err: "no runtime on this page" };
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return { err: "coded-landmark-tracking is not booted here" };
  const v = [...rt._variables].find(z => z._module === mod && z._name === "hexRigView");
  const view = v && v._value;
  if (!view) return { err: "hexRigView has no value yet" };
  if (!view.stages) return { err: "no view.stages() -- this build predates the instrumentation, hard reload" };
  return Object.assign(view.stages(), { hud: String(view.hud.textContent || "").slice(0, 200) });
})()`;

if (cmd === "reload") {
  // location.reload(true) has ignored its argument for years -- the page comes
  // back from cache and a just-published build is invisible. Only the protocol
  // can actually bypass it.
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Page.reload", { ignoreCache: true });
  console.error("hard reload sent; waiting for the notebook to boot");
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    try {
      const s: any = await evaluate(STAGES_EXPR);
      if (s && !s.err) { console.log(JSON.stringify(s)); break; }
      if (i % 5 === 4) console.error(`  ${(i + 1) * 2}s: ${s?.err ?? "no runtime yet"}`);
    } catch { /* navigating */ }
  }
  await send("Network.setCacheDisabled", { cacheDisabled: false });
} else if (cmd === "eval") {
  const js = argv[1];
  if (!js) { console.error("usage: phone-cdp.ts eval '<expression>'"); process.exit(2); }
  console.log(JSON.stringify(await evaluate(js), null, 1));
} else if (cmd === "stages") {
  // One sample a second. The rig's numbers are 20-frame medians already, so
  // sampling faster reports the same window twice rather than more detail.
  for (let i = 0; i < SECS; i++) {
    const s: any = await evaluate(STAGES_EXPR);
    if (s && s.err) { console.error(s.err); break; }
    console.log(JSON.stringify(s));
    await sleep(1000);
  }
} else if (cmd === "profile") {
  // Main thread only, by self time. Workers are separate targets and are NOT
  // in this profile -- the pool's own lastWorkerMs covers those, and mixing
  // the two would double-count the frame.
  await send("Profiler.enable");
  await send("Profiler.setSamplingInterval", { interval: 200 });
  await send("Profiler.start");
  console.error(`profiling ${SECS}s -- keep the camera on the sheet`);
  await sleep(SECS * 1000);
  const { result }: any = await send("Profiler.stop");
  const profile = result.profile;
  const byId = new Map<number, any>(profile.nodes.map((n: any) => [n.id, n]));
  const self = new Map<string, number>();
  const total = profile.samples.length;
  for (const id of profile.samples) {
    const n = byId.get(id);
    if (!n) continue;
    const f = n.callFrame;
    const where = f.url ? f.url.replace(/^.*\//, "").slice(0, 26) + ":" + (f.lineNumber + 1) : "";
    const key = `${f.functionName || "(anonymous)"}  ${where}`;
    self.set(key, (self.get(key) ?? 0) + 1);
  }
  const dur = (profile.endTime - profile.startTime) / 1000;
  console.log(`${total} samples over ${dur.toFixed(0)}ms of wall clock\n`);
  console.log("self%   ms    function");
  for (const [k, c] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25))
    console.log(`${((c / total) * 100).toFixed(1).padStart(5)}  ${((c / total) * dur).toFixed(0).padStart(5)}  ${k}`);
} else {
  console.error(`unknown command "${cmd}" -- list | stages | eval | profile`);
}
ws.close();
process.exit(0);
