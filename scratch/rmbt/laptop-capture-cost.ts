// What does ONE capture cost on this laptop, and how fast can the capture path
// be pumped? The real camera is unreachable from an automated Chromium here
// (enumerateDevices returns nothing), so this uses Chromium's synthetic camera:
// the DELIVERY rate is then fake, but every millisecond measured is real code
// on real silicon — VideoFrame construction, copyTo of the I420 luma, and the
// getImageData fallback, at the resolutions the rig actually uses.
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: !process.argv.includes("--headed"),
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-capture",
  ],
});
const page = await browser.newPage();
await page.goto("https://example.com/", { waitUntil: "domcontentloaded" });

const out = await page.evaluate(async () => {
  const results: any[] = [];
  const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
  const pct = (xs: number[], p: number) => xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];

  for (const [W, H] of [[640, 480], [1280, 720], [1280, 960], [1920, 1080]] as [number, number][]) {
    let gumErr: any = null;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: W }, height: { ideal: H }, frameRate: { ideal: 60 } },
    }).catch((e) => { gumErr = e.name + ": " + e.message; return null; });
    if (!stream) { results.push({ asked: [W, H], err: gumErr }); continue; }
    const v = document.createElement("video");
    v.srcObject = stream; v.muted = true; (v as any).playsInline = true;
    document.body.append(v);
    await v.play();
    await new Promise((r) => setTimeout(r, 500));

    const track = stream.getVideoTracks()[0];
    const s = track.getSettings();

    // delivery: what the compositor actually received (synthetic here, but it
    // proves the harness is counting the right thing)
    const delivered = await new Promise<any>((res) => {
      let first: number | null = null, t0 = 0, last = 0, n = 0;
      const done = () => res({ fps: n > 1 ? +(((last - first!) / (performance.now() - t0)) * 1000).toFixed(1) : null, cb: n });
      const guard = setTimeout(done, 3500);
      const tick = (now: number, meta: any) => {
        if (first === null) { first = meta.presentedFrames; t0 = now; }
        last = meta.presentedFrames; n++;
        if (now - t0 < 2000) (v as any).requestVideoFrameCallback(tick);
        else { clearTimeout(guard); done(); }
      };
      (v as any).requestVideoFrameCallback(tick);
    });

    // one VideoFrame to learn the real geometry and format
    let probe: any = null;
    for (let i = 0; i < 30 && !probe; i++) {
      try { const f = new (window as any).VideoFrame(v); probe = { fmt: f.format, coded: [f.codedWidth, f.codedHeight], vis: f.visibleRect ? [f.visibleRect.width, f.visibleRect.height] : null, alloc: f.allocationSize() }; f.close(); }
      catch (e) { await new Promise((r) => setTimeout(r, 50)); }
    }

    const VW = probe?.vis?.[0] ?? s.width!, VH = probe?.vis?.[1] ?? s.height!;
    const buf = new Uint8Array(VW * VH * 2);

    // fast path: construct + copy plane 0 (the luma the camera already made)
    const vfMs: number[] = [], ctorMs: number[] = [];
    for (let i = 0; i < 60; i++) {
      const a = performance.now();
      let f: any;
      try { f = new (window as any).VideoFrame(v); } catch (e) { break; }
      const b = performance.now();
      await f.copyTo(buf, { rect: f.visibleRect, layout: [{ offset: 0, stride: VW }] }).catch(async () => { await f.copyTo(buf); });
      const c = performance.now();
      f.close();
      if (i >= 10) { ctorMs.push(b - a); vfMs.push(c - a); }
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }

    // fallback path: drawImage + getImageData + luma
    const cv = document.createElement("canvas");
    cv.width = VW; cv.height = VH;
    const g = cv.getContext("2d", { willReadFrequently: true })!;
    const gidMs: number[] = [], grayMs: number[] = [];
    const gray = new Uint8Array(VW * VH);
    for (let i = 0; i < 30; i++) {
      const a = performance.now();
      g.drawImage(v, 0, 0, VW, VH);
      const px = g.getImageData(0, 0, VW, VH).data;
      const b = performance.now();
      for (let k = 0, p = 0; k < gray.length; k++, p += 4) gray[k] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
      const c = performance.now();
      if (i >= 5) { gidMs.push(b - a); grayMs.push(c - b); }
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }

    stream.getTracks().forEach((t) => t.stop());
    v.remove();
    results.push({
      asked: [W, H], settings: { w: s.width, h: s.height, fps: s.frameRate },
      probe, delivered,
      fastPath: vfMs.length ? { n: vfMs.length, ctorMed: +med(ctorMs).toFixed(2), totalMed: +med(vfMs).toFixed(2), p95: +pct(vfMs, 0.95).toFixed(2) } : null,
      slowPath: gidMs.length ? { gidMed: +med(gidMs).toFixed(2), lumaMed: +med(grayMs).toFixed(2), totalMed: +(med(gidMs) + med(grayMs)).toFixed(2) } : null,
    });
  }
  return { ua: navigator.userAgent, hwConcurrency: navigator.hardwareConcurrency, results };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
