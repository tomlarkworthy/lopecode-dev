// Can a Playwright Chromium on this Mac open the REAL laptop camera, and at
// what rate do frames actually arrive? getSettings().frameRate is what the
// driver was asked for; presentedFrames from requestVideoFrameCallback is what
// arrived. Only the second is evidence.
import { chromium } from "playwright";

const headed = process.argv.includes("--headed");
const useChrome = process.argv.includes("--chrome");
const browser = await chromium.launch({
  headless: !headed,
  ...(useChrome ? { channel: "chrome" } : {}),
  args: ["--use-fake-ui-for-media-stream"],
});
const ctx = await browser.newContext({ permissions: ["camera"] });
const page = await ctx.newPage();
await page.goto("https://example.com/", { waitUntil: "domcontentloaded" });

const out = await page.evaluate(async () => {
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  const cams = devices.filter((d) => d.kind === "videoinput").map((d) => ({ label: d.label, id: d.deviceId.slice(0, 8) }));
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
  } catch (e: any) {
    return { cams, err: e.name + ": " + e.message };
  }
  const track = stream.getVideoTracks()[0];
  const v = document.createElement("video");
  v.srcObject = stream; v.muted = true; v.playsInline = true;
  document.body.append(v);
  await v.play();
  await new Promise((r) => setTimeout(r, 800));

  const measure = (ms: number) => new Promise<any>((res) => {
    let first: number | null = null, t0 = 0, last = 0, n = 0;
    const done = () => res({ fps: n > 1 ? +(((last - first!) / (performance.now() - t0)) * 1000).toFixed(1) : null, callbacks: n });
    const guard = setTimeout(done, ms + 2000);
    const tick = (now: number, meta: any) => {
      if (first === null) { first = meta.presentedFrames; t0 = now; }
      last = meta.presentedFrames; n++;
      if (now - t0 < ms) (v as any).requestVideoFrameCallback(tick);
      else { clearTimeout(guard); done(); }
    };
    (v as any).requestVideoFrameCallback(tick);
  });

  const idle = await measure(3000);
  const s = track.getSettings();
  const caps: any = track.getCapabilities ? track.getCapabilities() : {};
  stream.getTracks().forEach((t) => t.stop());
  return {
    cams,
    settings: { w: s.width, h: s.height, frameRate: s.frameRate, deviceId: (s.deviceId ?? "").slice(0, 8) },
    capsFrameRate: caps.frameRate, capsW: caps.width, capsH: caps.height,
    videoWH: [v.videoWidth, v.videoHeight],
    idle,
  };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
