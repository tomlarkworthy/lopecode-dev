// Rasterise the printable sheet and run the real detector on it, at a few
// simulated camera resolutions. Uses the notebook's own cells via get().
const markSheetSvg = await get("markSheetSvg");
const analyzeFrame = await get("analyzeFrame");
const ids = [0, 3, 7, 9, 11, 14];

const raster = async (svg, W, H, pageBg) => {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = pageBg; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const gray = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4)
    gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
  URL.revokeObjectURL(url);
  return { gray, w: W, h: H, t: 0, n: 0 };
};

const out = [];
for (const [label, opts, pageBg] of [
  ["gray page (as shipped)", {}, "#ffffff"],
  ["background:false on white paper", { background: false }, "#ffffff"],
  ["background:false on gray paper", { background: false }, "#808080"]
]) {
  const svg = markSheetSvg(ids, { diameterMm: 60, ...opts });
  for (const W of [640, 900]) {
    const H = Math.round(W * 297 / 210);
    const f = await raster(svg, W, H, pageBg);
    const t0 = performance.now();
    const { fused } = await analyzeFrame(f, { coarseStride: 16, fineStride: 6 });
    const got = fused.map((x) => x.id).sort((a, b) => a - b);
    out.push({
      label, captureW: W,
      markPx: +(W * 60 / 210).toFixed(0),
      found: got.join(","),
      missing: ids.filter((i) => !got.includes(i)).join(",") || "-",
      spurious: got.filter((i) => !ids.includes(i)).join(",") || "-",
      ms: +(performance.now() - t0).toFixed(0)
    });
  }
}
return out;
