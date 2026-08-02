// Every codeword, rendered alone on a matched gray field at a generous size,
// through the real detector. Any id that cannot be read is a defect for the
// printable sheet.
const markSvgSource = await get("markSvgSource");
const analyzeFrame = await get("analyzeFrame");
const codebook = await get("codebook");

const raster = async (svg, W, H, markPx) => {
  // data: URL, not blob: -- a file:// page refuses to load blob: as an image
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const tile = markPx * 1.35;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, (W - tile) / 2, (H - tile) / 2, tile, tile);
  const px = ctx.getImageData(0, 0, W, H).data;
  const gray = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4)
    gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
  return { gray, w: W, h: H, t: 0, n: 0 };
};

const out = [];
for (let id = 0; id < 16; id++) {
  const svg = markSvgSource(id, { diameterMm: 60, label: false });
  const f = await raster(svg, 480, 480, 240);
  const { fused } = await analyzeFrame(f, { coarseStride: 10, fineStride: 4 });
  const self = fused.find((x) => x.id === id);
  out.push({
    id,
    word: Array.from(codebook[id]).join(""),
    ok: !!self,
    rows: self ? self.rows : 0,
    margin: self ? self.voteMargin : 0,
    other: fused.filter((x) => x.id !== id).map((x) => x.id).join(",") || "-"
  });
}
return out;
