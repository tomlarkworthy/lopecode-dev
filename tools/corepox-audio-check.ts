// The audio half. Two things are worth gating and neither is "it did not throw":
//
//   1. every recipe in the bank renders a NON-SILENT buffer. A mis-scheduled envelope
//      (an exponential ramp from 0, a stop before the start) produces exact silence
//      and no error, so peak amplitude is the only honest check. Rendered through
//      OfflineAudioContext, which is why sfxKit's helpers are bound to a graph rather
//      than to the live context.
//   2. a running duel actually drains World.snd through the renderer, rather than
//      filling the ring while nothing plays.
//
// It does NOT check that anything sounds right. There is no reference audio in the
// repo to check against -- see the module header.
//
//   bun tools/corepox-audio-check.ts
import {chromium} from "playwright";

const b = await chromium.launch({args: ["--autoplay-policy=no-user-gesture-required"]});
const p = await b.newPage({viewport: {width: 1200, height: 800}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};

await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-audio))");
await p.waitForSelector(".cpx-sfx button", {timeout: 60000});

// A view-only module is not in runtime.mains, so the mounted board node is the
// handle -- the same idiom as .cpx-spoils in tools/corepox-spoils-scroll.ts.
console.log("bank: " + (await p.evaluate(() =>
  (document.querySelector(".cpx-sfx") as any).qa.names.join(", "))) + "\n");

// --- every recipe makes a sound ------------------------------------------------------
const rendered: any = await p.evaluate(async () => {
  const qa: any = (document.querySelector(".cpx-sfx") as any).qa;
  const kit = qa.kit, SFX = qa.SFX;
  const out: any[] = [];
  for (const [name, spec] of Object.entries<any>(SFX)) {
    const buf: any = await kit.render(spec, 1);
    const d = buf.getChannelData(0);
    let peak = 0, sum = 0, firstAt = -1, lastAt = -1;
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
      sum += a * a;
      if (a > 0.001) { if (firstAt < 0) firstAt = i; lastAt = i; }
    }
    out.push({name, from: spec.from, len: spec.len, n: spec.n, cap: spec.cap, swell: !!spec.swell,
              peak: +peak.toFixed(4), rms: +Math.sqrt(sum / d.length).toFixed(4),
              start: firstAt < 0 ? null : +(firstAt / buf.sampleRate).toFixed(3),
              tail: lastAt < 0 ? null : +(lastAt / buf.sampleRate).toFixed(3),
              dur: +(buf.length / buf.sampleRate).toFixed(2)});
  }
  return out;
});

console.log("event                  peak     rms   start    tail   len  n cap  source");
for (const r of rendered)
  console.log(`${r.name.padEnd(20)} ${String(r.peak).padStart(6)}  ${String(r.rms).padStart(6)}` +
              `  ${String(r.start).padStart(5)}   ${String(r.tail).padStart(5)}  ${String(r.len).padStart(4)}` +
              ` ${String(r.n).padStart(2)} ${String(r.cap).padStart(3)}  ${r.from ?? "(none — invented)"}`);
console.log("");
ok(rendered.length === 20, "the bank has 20 events", `${rendered.length}`);
const silent = rendered.filter((r: any) => r.peak < 0.02).map((r: any) => r.name);
ok(silent.length === 0, "every recipe renders a non-silent buffer", silent.join(",") || "none silent");
const clipped = rendered.filter((r: any) => r.peak > 1.0).map((r: any) => `${r.name} ${r.peak}`);
ok(clipped.length === 0, "and none clips before the mixer", clipped.join(", ") || "peak <= 1.0");
// A percussive event that does not start promptly is a scheduling bug. BOOT is the
// one deliberate swell, and says so.
const late = rendered.filter((r: any) => !r.swell && (r.start === null || r.start > 0.05))
                     .map((r: any) => r.name);
ok(late.length === 0, "and each percussive event starts within 50ms of the trigger",
   late.join(",") || `all prompt (${rendered.filter((r: any) => r.swell).length} declared swell)`);
const attested = rendered.filter((r: any) => r.from).length;
console.log(`  note  ${attested}/${rendered.length} events are matched to a filename group; ` +
            `only LAZER_FIRE has a surviving event definition`);

// --- the trigger and the mixer --------------------------------------------------------
const live: any = await p.evaluate(async () => {
  const qa: any = (document.querySelector(".cpx-sfx") as any).qa;
  const sfx = qa.sfx, kit = qa.kit;
  const played = sfx("EXPLOSION");
  const unknown = sfx("NO_SUCH_EVENT");
  const alias = sfx("Select_Component");        // the C# name with no GUID
  sfx.mute(true); const muted = sfx("EXPLOSION"); sfx.mute(false);
  // fire the whole bank at once: the voice caps are the only thing between a duel and
  // an unbounded node graph
  for (let i = 0; i < 60; i++) sfx("LAZER_FIRE");
  await new Promise(r => setTimeout(r, 250));
  return {played, unknown, alias, muted, state: kit.ready()?.state ?? null,
          names: sfx.names.length};
});
console.log("");
ok(live.played === true, "sfx('EXPLOSION') plays");
ok(live.unknown === false, "an unknown event is a silent false, not a throw");
ok(live.alias === true, "the C# spelling Select_Component aliases to Component_Selected");
ok(live.muted === false, "muted plays nothing");
ok(live.state === "running", "the context is running", String(live.state));
ok(live.names === 20, "sfx.names lists the bank", `${live.names}`);

// --- a duel drains the queue -----------------------------------------------------------
// --- a running duel, in and out of the sound region -------------------------------------
// Sound is opt-in by region: a battlefield plays only inside [data-cpx-sound]. This is
// the differential -- the SAME duel runs with the marker off and then on, so a pass
// cannot come from the duel simply being quiet. Four of the six battlefield call sites
// are demo cells that run forever, and before the region rule they played over the app
// from panes nobody had open.
//
// Polling World.snd from a second rAF reads zero whichever way the wiring goes -- the
// battlefield's draw drains it inside the duel's own frame, which was registered
// first. So count at the drain itself, and count the pushes independently: what the
// engine queued must equal what the renderer played plus what is still in the ring.
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel))");
await p.waitForFunction(() => !!(window as any).__ojs_runtime, {timeout: 60000});
await p.waitForTimeout(1500);
await p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-duel");
  const cell = (k: string) => { for (const [n, v] of m._scope) if (n === k) return (v as any)._value; };
  const duelView = cell("duelView"), roster = cell("duelRoster");
  const rank = (i: number) => roster.groups[1].items[i].key;
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;inset:0;z-index:9999;background:#04050a";
  document.body.append(stage);
  const W: any = window as any;
  W.__peak = 0; W.__drains = 0; W.__played = 0; W.__pushed = 0;
  W.__mark = (on: boolean) => {
    W.__drains = 0; W.__played = 0; W.__pushed = 0; W.__peak = 0;
    if (on) stage.setAttribute("data-cpx-sound", ""); else stage.removeAttribute("data-cpx-sound");
  };
  const sfx: any = (() => {
    const r = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-render");
    for (const [n, v] of r._scope) if (n === "sfx") return (v as any)._value;
  })();
  const realDrain = sfx.drain;
  // Only this duel's world: the page mounts other battlefields (the roster previews)
  // and they drain their own queues through the same sfx.
  sfx.drain = (w: any) => {
    const n = realDrain(w);
    if (w === W.__world) { W.__drains++; W.__played += n; }
    return n;
  };
  const v = duelView({seed: 4, mode: "elimination", limit: 45,
      a: {spec: roster.byKey.get(rank(0)).spec, control: "auto"},
      b: {spec: roster.byKey.get(rank(1)).spec},
      placement: {separation: 20, bearing: 25}}, {height: 660, speed: 4});
  stage.append(v);
  W.__v = v;
  W.__world = v.duel.world;
  const q = v.duel.world.snd;
  const realPush = q.push.bind(q);
  q.push = (...e: any[]) => { W.__pushed += e.length; W.__peak = Math.max(W.__peak, q.length + e.length);
                              return realPush(...e); };
});
const window_ = async (marked: boolean, ms: number) => {
  await p.evaluate((m) => (window as any).__mark(m), marked);
  await p.waitForTimeout(ms);
  return p.evaluate(() => {
    const W: any = window as any;
    return {drains: W.__drains, played: W.__played, pushed: W.__pushed, peak: W.__peak,
            left: W.__v.duel.world.snd.length, t: W.__v.duel.world.t};
  });
};
const off: any = await window_(false, 6000);
const on: any = await window_(true, 6000);
console.log("");
console.log(`  outside the region: queued ${off.pushed}, played ${off.played}, ${off.left} left`);
console.log(`  inside  the region: queued ${on.pushed}, played ${on.played}, ${on.left} left, ` +
            `${on.drains} drained frames, deepest ${on.peak}`);
ok(on.t > 3, "the duel actually ran", `${on.t.toFixed(1)}s of sim`);
ok(off.pushed > 0 && on.pushed > 0, "the engine queued sounds in both windows",
   `${off.pushed} / ${on.pushed}`);
ok(off.played === 0, "OUTSIDE [data-cpx-sound] nothing plays", `${off.played} played`);
ok(off.left === 0, "and the queue is still cleared, so the ring cannot fill", `${off.left} left`);
ok(on.played > 0, "INSIDE the region it plays", `${on.played} played`);
ok(on.played === on.pushed - on.left, "everything queued was played or is still queued",
   `${on.played} + ${on.left} vs ${on.pushed}`);
ok(on.peak < 24, "the ring never filled", `deepest ${on.peak}`);

console.log("\nconsole errors: " + (errs.length ? errs.slice(0, 4).join(" | ") : "none"));
if (errs.length) fail++;
await b.close();
console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
