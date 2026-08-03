// Attach to a Chrome tab on a USB-connected Android phone and drive it the way
// Playwright drives a local page. This is the real DevTools protocol on the
// real device -- not a simulation of a phone, and not a number read back over
// a chat -- so a frame budget measured here is the one the user sees.
//
// Setup, once:
//   brew install android-platform-tools
//   phone: Settings > About phone > tap "Build number" 7x
//          Settings > System > Developer options > USB debugging ON
//   plug in, then `adb devices` and approve the fingerprint prompt on the phone
//
// Then:
//   bun tools/phone-cdp.ts list                   # what tabs are open
//   bun tools/phone-cdp.ts stages --secs 10       # poll the rig's frame budget
//   bun tools/phone-cdp.ts eval 'location.href'
//   bun tools/phone-cdp.ts profile --secs 6       # main-thread sampling profile
//
// --match <substr> picks the tab (default: the coded-landmark-tracking page).
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const argv = process.argv.slice(2);
const cmd = argv[0] ?? "list";
const flag = (n: string, d: string) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 ? argv[i + 1] : d;
};
const PORT = +flag("port", "9222");
const MATCH = flag("match", "coded-landmark");
const SECS = +flag("secs", "8");

// adb insists on a writable ~/.android for its RSA key, and this process runs
// sandboxed out of the real home. Point HOME at /tmp instead of failing --
// see CLAUDE.md tip 12. The phone re-prompts once for the new key.
const ADB_HOME = "/tmp/lopecode-android";
const adb = (...a: string[]) => {
  const r = spawnSync("adb", a, { encoding: "utf8", env: { ...process.env, HOME: ADB_HOME } });
  if (r.error) {
    console.error("adb not found. brew install android-platform-tools");
    process.exit(2);
  }
  return (r.stdout || "") + (r.stderr || "");
};

// The phone exposes DevTools on an abstract unix socket, not a TCP port, so
// there is nothing to connect to until adb bridges it. Re-running is harmless.
mkdirSync(ADB_HOME, { recursive: true });
const devices = adb("devices").trim().split("\n").slice(1)
  .filter((l) => l.trim() && !/^\*/.test(l));
if (!devices.length) {
  console.error("no device. Plug the phone in, enable USB debugging, and approve the\n" +
                "fingerprint prompt on the phone. `adb devices` should list it as `device`.");
  process.exit(2);
}
if (devices.some((l) => /unauthorized/.test(l))) {
  console.error("device is UNAUTHORIZED -- unlock the phone and tap 'Allow USB debugging'.");
  process.exit(2);
}
console.error("device: " + devices.join(" | "));
adb("forward", `tcp:${PORT}`, "localabstract:chrome_devtools_remote");

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() as any[];
const pages = list.filter((t) => t.type === "page");
if (cmd === "list") {
  for (const t of list) console.log(`${String(t.type).padEnd(14)} ${t.title}\n${" ".repeat(15)}${t.url}`);
  process.exit(0);
}

const target = pages.find((t) => (t.url || "").includes(MATCH) || (t.title || "").includes(MATCH));
if (!target) {
  console.error(`no open tab matching "${MATCH}". Open the notebook on the phone, or:\n` +
                `  bun tools/phone-cdp.ts list`);
  process.exit(2);
}
console.error(`tab: ${target.title}\n     ${target.url}\n`);

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url() === target.url) ?? ctx.pages()[0];

const rigStages = async () => await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime ||
    ((window as any).lopecode && (window as any).lopecode.runtime);
  if (!rt) return { err: "no runtime on this page" };
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return { err: "coded-landmark-tracking is not booted here" };
  const v = [...rt._variables].find((z: any) => z._module === mod && z._name === "hexRigView");
  const view: any = v && v._value;
  if (!view || !view.stages) return { err: "hexRigView has no stages() -- notebook predates the instrumentation" };
  return { ...view.stages(), hud: String(view.hud.textContent || "").slice(0, 160) };
});

if (cmd === "eval") {
  const js = argv[1];
  if (!js) { console.error("usage: phone-cdp.ts eval '<expression>'"); process.exit(2); }
  console.log(JSON.stringify(await page.evaluate(js), null, 1));
} else if (cmd === "stages") {
  // One sample a second. The rig's own numbers are 20-frame medians already,
  // so sampling faster reports the same window twice rather than more detail.
  for (let i = 0; i < SECS; i++) {
    const s: any = await rigStages();
    if (s.err) { console.error(s.err); break; }
    console.log(JSON.stringify(s));
    await page.waitForTimeout(1000);
  }
} else if (cmd === "profile") {
  // Where the main thread goes, by self time. Workers are separate targets and
  // are NOT in this profile -- the pool's own lastWorkerMs covers those, and
  // mixing the two would double-count the frame.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
  await cdp.send("Profiler.start");
  console.error(`profiling ${SECS}s -- keep the camera on the sheet`);
  await page.waitForTimeout(SECS * 1000);
  const { profile }: any = await cdp.send("Profiler.stop");
  const byId = new Map<number, any>(profile.nodes.map((n: any) => [n.id, n]));
  const self = new Map<string, number>();
  const total = profile.samples.length;
  for (const id of profile.samples) {
    const n = byId.get(id);
    if (!n) continue;
    const f = n.callFrame;
    const where = f.url ? f.url.replace(/^.*\//, "").slice(0, 28) + ":" + (f.lineNumber + 1) : "";
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
await browser.close();
