(deps) => (frame, opts = {}) => {
  const gray = frame.gray, w = frame.w, h = frame.h;
  const stride = opts.stride ?? 6;
  const hist = new Int32Array(256);
  const rowP = [];
  let c = 0;
  for (let y = (stride >> 1); y < h; y += stride) {
    const base = y * w;
    const rh = new Int32Array(256);
    let rc = 0;
    for (let x = 1; x < w; x++) {
      let v = gray[base + x] - gray[base + x - 1];
      if (v < 0) v = -v; if (v > 255) v = 255;
      hist[v | 0]++; rh[v | 0]++; c++; rc++;
    }
    let acc = 0, p = 0;
    for (let v = 0; v < 256; v++) { acc += rh[v]; if (acc >= 0.9 * rc) { p = v; break; } }
    rowP.push(p);
  }
  const pct = (f) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= f * c) return v; } return 255; };
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
  rowP.sort((a, b) => a - b);
  const rq = (f) => rowP[Math.floor(f * (rowP.length - 1))];
  throw new Error(`mean=${(sum / c).toFixed(2)} p75=${pct(0.75)} p90=${pct(0.9)} p95=${pct(0.95)} p99=${pct(0.99)} rowP90[50/90]=${rq(0.5)}/${rq(0.9)}`);
}
