// Minimal GPT (pre-LN, GELU MLP, causal MHA, untied unembed) with hand-written
// backprop on flat Float64Arrays. Small-scale prototype for belief-state probing.

export type Cfg = {
  V: number; // vocab
  T: number; // context length
  C: number; // d_model
  H: number; // heads
  L: number; // layers
  F: number; // mlp hidden
  B: number; // batch
};

export type Param = { name: string; w: Float64Array; g: Float64Array; m: Float64Array; v: Float64Array };

const GELU_K = Math.sqrt(2 / Math.PI);

function geluFwd(out: Float64Array, inp: Float64Array, n: number) {
  for (let i = 0; i < n; i++) {
    const x = inp[i];
    out[i] = 0.5 * x * (1 + Math.tanh(GELU_K * (x + 0.044715 * x * x * x)));
  }
}
function geluBwd(dinp: Float64Array, inp: Float64Array, dout: Float64Array, n: number) {
  for (let i = 0; i < n; i++) {
    const x = inp[i];
    const u = GELU_K * (x + 0.044715 * x * x * x);
    const th = Math.tanh(u);
    const sech2 = 1 - th * th;
    dinp[i] += dout[i] * (0.5 * (1 + th) + 0.5 * x * sech2 * GELU_K * (1 + 3 * 0.044715 * x * x));
  }
}

// out[n,o] = inp[n,:] @ w[:,o] + b[o]
function matmulFwd(out: Float64Array, inp: Float64Array, w: Float64Array, b: Float64Array | null, N: number, I: number, O: number) {
  for (let n = 0; n < N; n++) {
    const io = n * I, oo = n * O;
    for (let o = 0; o < O; o++) out[oo + o] = b ? b[o] : 0;
    for (let i = 0; i < I; i++) {
      const x = inp[io + i];
      if (x === 0) continue;
      const wo = i * O;
      for (let o = 0; o < O; o++) out[oo + o] += x * w[wo + o];
    }
  }
}
function matmulBwd(dinp: Float64Array | null, dw: Float64Array, db: Float64Array | null, dout: Float64Array, inp: Float64Array, w: Float64Array, N: number, I: number, O: number) {
  for (let n = 0; n < N; n++) {
    const io = n * I, oo = n * O;
    if (db) for (let o = 0; o < O; o++) db[o] += dout[oo + o];
    for (let i = 0; i < I; i++) {
      const wo = i * O;
      const x = inp[io + i];
      let acc = 0;
      for (let o = 0; o < O; o++) {
        const d = dout[oo + o];
        dw[wo + o] += x * d;
        acc += d * w[wo + o];
      }
      if (dinp) dinp[io + i] += acc;
    }
  }
}

function lnFwd(out: Float64Array, mean: Float64Array, rstd: Float64Array, inp: Float64Array, g: Float64Array, b: Float64Array, N: number, C: number) {
  for (let n = 0; n < N; n++) {
    const o = n * C;
    let mu = 0;
    for (let c = 0; c < C; c++) mu += inp[o + c];
    mu /= C;
    let vs = 0;
    for (let c = 0; c < C; c++) { const d = inp[o + c] - mu; vs += d * d; }
    const rs = 1 / Math.sqrt(vs / C + 1e-5);
    mean[n] = mu; rstd[n] = rs;
    for (let c = 0; c < C; c++) out[o + c] = g[c] * ((inp[o + c] - mu) * rs) + b[c];
  }
}
function lnBwd(dinp: Float64Array, dg: Float64Array, db: Float64Array, dout: Float64Array, inp: Float64Array, mean: Float64Array, rstd: Float64Array, g: Float64Array, N: number, C: number) {
  for (let n = 0; n < N; n++) {
    const o = n * C, mu = mean[n], rs = rstd[n];
    let dnormMean = 0, dnormNormMean = 0;
    for (let c = 0; c < C; c++) {
      const xhat = (inp[o + c] - mu) * rs;
      const dnorm = dout[o + c] * g[c];
      dnormMean += dnorm;
      dnormNormMean += dnorm * xhat;
      dg[c] += dout[o + c] * xhat;
      db[c] += dout[o + c];
    }
    dnormMean /= C; dnormNormMean /= C;
    for (let c = 0; c < C; c++) {
      const xhat = (inp[o + c] - mu) * rs;
      const dnorm = dout[o + c] * g[c];
      dinp[o + c] += rs * (dnorm - dnormMean - xhat * dnormNormMean);
    }
  }
}

// qkv layout [B,T,3C]; q at h*hs, k at C + h*hs, v at 2C + h*hs
function attnFwd(atty: Float64Array, att: Float64Array, qkv: Float64Array, B: number, T: number, C: number, H: number) {
  const hs = C / H, scale = 1 / Math.sqrt(hs);
  for (let b = 0; b < B; b++)
    for (let h = 0; h < H; h++) {
      const attBase = (b * H + h) * T * T;
      for (let t = 0; t < T; t++) {
        const qo = (b * T + t) * 3 * C + h * hs;
        // scores + online softmax (small T: two-pass is fine)
        let maxv = -Infinity;
        const row = attBase + t * T;
        for (let t2 = 0; t2 <= t; t2++) {
          const ko = (b * T + t2) * 3 * C + C + h * hs;
          let s = 0;
          for (let i = 0; i < hs; i++) s += qkv[qo + i] * qkv[ko + i];
          s *= scale;
          att[row + t2] = s;
          if (s > maxv) maxv = s;
        }
        let sum = 0;
        for (let t2 = 0; t2 <= t; t2++) { const e = Math.exp(att[row + t2] - maxv); att[row + t2] = e; sum += e; }
        for (let t2 = 0; t2 <= t; t2++) att[row + t2] /= sum;
        for (let t2 = t + 1; t2 < T; t2++) att[row + t2] = 0;
        const yo = (b * T + t) * C + h * hs;
        for (let i = 0; i < hs; i++) atty[yo + i] = 0;
        for (let t2 = 0; t2 <= t; t2++) {
          const a = att[row + t2];
          if (a === 0) continue;
          const vo = (b * T + t2) * 3 * C + 2 * C + h * hs;
          for (let i = 0; i < hs; i++) atty[yo + i] += a * qkv[vo + i];
        }
      }
    }
}
function attnBwd(dqkv: Float64Array, datty: Float64Array, att: Float64Array, qkv: Float64Array, B: number, T: number, C: number, H: number) {
  const hs = C / H, scale = 1 / Math.sqrt(hs);
  const datt = new Float64Array(T);
  for (let b = 0; b < B; b++)
    for (let h = 0; h < H; h++) {
      const attBase = (b * H + h) * T * T;
      for (let t = 0; t < T; t++) {
        const row = attBase + t * T;
        const yo = (b * T + t) * C + h * hs;
        // dv and datt
        for (let t2 = 0; t2 <= t; t2++) {
          const vo = (b * T + t2) * 3 * C + 2 * C + h * hs;
          let da = 0;
          const a = att[row + t2];
          for (let i = 0; i < hs; i++) {
            da += datty[yo + i] * qkv[vo + i];
            dqkv[vo + i] += a * datty[yo + i];
          }
          datt[t2] = da;
        }
        // softmax backward -> dscores (reuse datt as ds)
        let dot = 0;
        for (let t2 = 0; t2 <= t; t2++) dot += att[row + t2] * datt[t2];
        const qo = (b * T + t) * 3 * C + h * hs;
        for (let t2 = 0; t2 <= t; t2++) {
          const ds = att[row + t2] * (datt[t2] - dot) * scale;
          if (ds === 0) continue;
          const ko = (b * T + t2) * 3 * C + C + h * hs;
          for (let i = 0; i < hs; i++) {
            dqkv[qo + i] += ds * qkv[ko + i];
            dqkv[ko + i] += ds * qkv[qo + i];
          }
        }
      }
    }
}

export class GPT {
  cfg: Cfg;
  params: Record<string, Param> = {};
  order: Param[] = [];
  // activations
  act: Record<string, Float64Array> = {};
  step = 0;

  constructor(cfg: Cfg, rng: () => number) {
    this.cfg = cfg;
    const { V, T, C, L, F } = cfg;
    const init = (name: string, size: number, std: number) => {
      const p: Param = {
        name,
        w: new Float64Array(size),
        g: new Float64Array(size),
        m: new Float64Array(size),
        v: new Float64Array(size),
      };
      if (std > 0) {
        for (let i = 0; i < size; i++) {
          // Box-Muller
          const u1 = Math.max(rng(), 1e-12), u2 = rng();
          p.w[i] = std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
      }
      this.params[name] = p;
      this.order.push(p);
      return p;
    };
    const ones = (name: string, size: number) => { const p = init(name, size, 0); p.w.fill(1); return p; };
    init("wte", V * C, 0.02);
    init("wpe", T * C, 0.02);
    for (let l = 0; l < L; l++) {
      ones(`l${l}.ln1g`, C); init(`l${l}.ln1b`, C, 0);
      init(`l${l}.wqkv`, C * 3 * C, 0.02); init(`l${l}.bqkv`, 3 * C, 0);
      init(`l${l}.wo`, C * C, 0.02 / Math.sqrt(2 * L)); init(`l${l}.bo`, C, 0);
      ones(`l${l}.ln2g`, C); init(`l${l}.ln2b`, C, 0);
      init(`l${l}.wfc`, C * F, 0.02); init(`l${l}.bfc`, F, 0);
      init(`l${l}.wproj`, F * C, 0.02 / Math.sqrt(2 * L)); init(`l${l}.bproj`, C, 0);
    }
    ones("lnfg", C); init("lnfb", C, 0);
    init("wu", C * V, 0.02); init("bu", V, 0);
    this.allocActs();
  }

  allocActs() {
    const { V, T, C, L, F, B, H } = this.cfg;
    const N = B * T;
    const a = this.act;
    const mk = (name: string, size: number) => (a[name] = new Float64Array(size));
    mk("h0", N * C);
    for (let l = 0; l < L; l++) {
      mk(`l${l}.ln1out`, N * C); mk(`l${l}.ln1mean`, N); mk(`l${l}.ln1rstd`, N);
      mk(`l${l}.qkv`, N * 3 * C); mk(`l${l}.att`, B * H * T * T); mk(`l${l}.atty`, N * C);
      mk(`l${l}.attproj`, N * C); mk(`l${l}.res2`, N * C);
      mk(`l${l}.ln2out`, N * C); mk(`l${l}.ln2mean`, N); mk(`l${l}.ln2rstd`, N);
      mk(`l${l}.fc`, N * F); mk(`l${l}.gelu`, N * F); mk(`l${l}.mlpproj`, N * C);
      mk(`l${l}.res3`, N * C);
      // grads
      mk(`l${l}.d.ln1out`, N * C); mk(`l${l}.d.qkv`, N * 3 * C); mk(`l${l}.d.atty`, N * C);
      mk(`l${l}.d.attproj`, N * C); mk(`l${l}.d.res2`, N * C);
      mk(`l${l}.d.ln2out`, N * C); mk(`l${l}.d.fc`, N * F); mk(`l${l}.d.gelu`, N * F);
      mk(`l${l}.d.mlpproj`, N * C); mk(`l${l}.d.res3`, N * C);
    }
    mk("lnfout", N * C); mk("lnfmean", N); mk("lnfrstd", N);
    mk("logits", N * V); mk("probs", N * V);
    mk("d.h0", N * C); mk("d.lnfout", N * C); mk("d.logits", N * V);
  }

  resIn(l: number): Float64Array {
    return l === 0 ? this.act.h0 : this.act[`l${l - 1}.res3`];
  }

  forward(tokens: Int32Array, targets: Int32Array | null): number {
    const { V, T, C, L, F, B, H } = this.cfg;
    const N = B * T;
    const a = this.act, P = this.params;
    // embeddings
    for (let b = 0; b < B; b++)
      for (let t = 0; t < T; t++) {
        const o = (b * T + t) * C, tok = tokens[b * T + t];
        for (let c = 0; c < C; c++) a.h0[o + c] = P.wte.w[tok * C + c] + P.wpe.w[t * C + c];
      }
    for (let l = 0; l < L; l++) {
      const inp = this.resIn(l);
      lnFwd(a[`l${l}.ln1out`], a[`l${l}.ln1mean`], a[`l${l}.ln1rstd`], inp, P[`l${l}.ln1g`].w, P[`l${l}.ln1b`].w, N, C);
      matmulFwd(a[`l${l}.qkv`], a[`l${l}.ln1out`], P[`l${l}.wqkv`].w, P[`l${l}.bqkv`].w, N, C, 3 * C);
      attnFwd(a[`l${l}.atty`], a[`l${l}.att`], a[`l${l}.qkv`], B, T, C, H);
      matmulFwd(a[`l${l}.attproj`], a[`l${l}.atty`], P[`l${l}.wo`].w, P[`l${l}.bo`].w, N, C, C);
      const res2 = a[`l${l}.res2`];
      for (let i = 0; i < N * C; i++) res2[i] = inp[i] + a[`l${l}.attproj`][i];
      lnFwd(a[`l${l}.ln2out`], a[`l${l}.ln2mean`], a[`l${l}.ln2rstd`], res2, P[`l${l}.ln2g`].w, P[`l${l}.ln2b`].w, N, C);
      matmulFwd(a[`l${l}.fc`], a[`l${l}.ln2out`], P[`l${l}.wfc`].w, P[`l${l}.bfc`].w, N, C, F);
      geluFwd(a[`l${l}.gelu`], a[`l${l}.fc`], N * F);
      matmulFwd(a[`l${l}.mlpproj`], a[`l${l}.gelu`], P[`l${l}.wproj`].w, P[`l${l}.bproj`].w, N, F, C);
      const res3 = a[`l${l}.res3`];
      for (let i = 0; i < N * C; i++) res3[i] = res2[i] + a[`l${l}.mlpproj`][i];
    }
    const resFinal = a[`l${L - 1}.res3`];
    lnFwd(a.lnfout, a.lnfmean, a.lnfrstd, resFinal, P.lnfg.w, P.lnfb.w, N, C);
    matmulFwd(a.logits, a.lnfout, P.wu.w, P.bu.w, N, C, V);
    // softmax + loss
    let loss = 0;
    for (let n = 0; n < N; n++) {
      const o = n * V;
      let maxv = -Infinity;
      for (let v = 0; v < V; v++) if (a.logits[o + v] > maxv) maxv = a.logits[o + v];
      let sum = 0;
      for (let v = 0; v < V; v++) { const e = Math.exp(a.logits[o + v] - maxv); a.probs[o + v] = e; sum += e; }
      for (let v = 0; v < V; v++) a.probs[o + v] /= sum;
      if (targets) loss += -Math.log(Math.max(a.probs[o + targets[n]], 1e-12));
    }
    return targets ? loss / N : 0;
  }

  zeroGrads() {
    for (const p of this.order) p.g.fill(0);
    const a = this.act;
    for (const k of Object.keys(a)) if (k.includes("d.")) a[k].fill(0);
  }

  backward(tokens: Int32Array, targets: Int32Array) {
    const { V, T, C, L, F, B, H } = this.cfg;
    const N = B * T;
    const a = this.act, P = this.params;
    // dlogits
    for (let n = 0; n < N; n++) {
      const o = n * V, tgt = targets[n];
      for (let v = 0; v < V; v++) a["d.logits"][o + v] = (a.probs[o + v] - (v === tgt ? 1 : 0)) / N;
    }
    matmulBwd(a["d.lnfout"], P.wu.g, P.bu.g, a["d.logits"], a.lnfout, P.wu.w, N, C, V);
    const resFinal = a[`l${L - 1}.res3`];
    const dResFinal = a[`l${L - 1}.d.res3`];
    lnBwd(dResFinal, P.lnfg.g, P.lnfb.g, a["d.lnfout"], resFinal, a.lnfmean, a.lnfrstd, P.lnfg.w, N, C);
    for (let l = L - 1; l >= 0; l--) {
      const inp = this.resIn(l);
      const dinp = l === 0 ? a["d.h0"] : a[`l${l - 1}.d.res3`];
      const dres3 = a[`l${l}.d.res3`];
      const dres2 = a[`l${l}.d.res2`];
      // res3 = res2 + mlpproj
      for (let i = 0; i < N * C; i++) { dres2[i] += dres3[i]; a[`l${l}.d.mlpproj`][i] += dres3[i]; }
      matmulBwd(a[`l${l}.d.gelu`], P[`l${l}.wproj`].g, P[`l${l}.bproj`].g, a[`l${l}.d.mlpproj`], a[`l${l}.gelu`], P[`l${l}.wproj`].w, N, F, C);
      geluBwd(a[`l${l}.d.fc`], a[`l${l}.fc`], a[`l${l}.d.gelu`], N * F);
      matmulBwd(a[`l${l}.d.ln2out`], P[`l${l}.wfc`].g, P[`l${l}.bfc`].g, a[`l${l}.d.fc`], a[`l${l}.ln2out`], P[`l${l}.wfc`].w, N, C, F);
      lnBwd(dres2, P[`l${l}.ln2g`].g, P[`l${l}.ln2b`].g, a[`l${l}.d.ln2out`], a[`l${l}.res2`], a[`l${l}.ln2mean`], a[`l${l}.ln2rstd`], P[`l${l}.ln2g`].w, N, C);
      // res2 = inp + attproj
      for (let i = 0; i < N * C; i++) { dinp[i] += dres2[i]; a[`l${l}.d.attproj`][i] += dres2[i]; }
      matmulBwd(a[`l${l}.d.atty`], P[`l${l}.wo`].g, P[`l${l}.bo`].g, a[`l${l}.d.attproj`], a[`l${l}.atty`], P[`l${l}.wo`].w, N, C, C);
      attnBwd(a[`l${l}.d.qkv`], a[`l${l}.d.atty`], a[`l${l}.att`], a[`l${l}.qkv`], B, T, C, H);
      matmulBwd(a[`l${l}.d.ln1out`], P[`l${l}.wqkv`].g, P[`l${l}.bqkv`].g, a[`l${l}.d.qkv`], a[`l${l}.ln1out`], P[`l${l}.wqkv`].w, N, C, 3 * C);
      lnBwd(dinp, P[`l${l}.ln1g`].g, P[`l${l}.ln1b`].g, a[`l${l}.d.ln1out`], inp, a[`l${l}.ln1mean`], a[`l${l}.ln1rstd`], P[`l${l}.ln1g`].w, N, C);
    }
    // embedding grads
    for (let b = 0; b < B; b++)
      for (let t = 0; t < T; t++) {
        const o = (b * T + t) * C, tok = tokens[b * T + t];
        for (let c = 0; c < C; c++) {
          P.wte.g[tok * C + c] += a["d.h0"][o + c];
          P.wpe.g[t * C + c] += a["d.h0"][o + c];
        }
      }
  }

  adam(lr: number, beta1 = 0.9, beta2 = 0.999, eps = 1e-8, wd = 0) {
    this.step++;
    const bc1 = 1 - Math.pow(beta1, this.step);
    const bc2 = 1 - Math.pow(beta2, this.step);
    for (const p of this.order) {
      const { w, g, m, v } = p;
      for (let i = 0; i < w.length; i++) {
        m[i] = beta1 * m[i] + (1 - beta1) * g[i];
        v[i] = beta2 * v[i] + (1 - beta2) * g[i] * g[i];
        const mh = m[i] / bc1, vh = v[i] / bc2;
        w[i] -= lr * (mh / (Math.sqrt(vh) + eps) + wd * w[i]);
      }
    }
  }

  weightCount(): number {
    return this.order.reduce((a, p) => a + p.w.length, 0);
  }

  getWeights(out?: Float64Array): Float64Array {
    const flat = out ?? new Float64Array(this.weightCount());
    let off = 0;
    for (const p of this.order) { flat.set(p.w, off); off += p.w.length; }
    return flat;
  }

  setWeights(flat: Float64Array) {
    let off = 0;
    for (const p of this.order) { p.w.set(flat.subarray(off, off + p.w.length)); off += p.w.length; }
  }

  serialize(): string {
    const out: Record<string, number[]> = {};
    for (const p of this.order) out[p.name] = Array.from(p.w);
    return JSON.stringify({ cfg: this.cfg, step: this.step, params: out });
  }

  static deserialize(json: string): GPT {
    const obj = JSON.parse(json);
    const g = new GPT(obj.cfg, () => 0.5);
    g.step = obj.step;
    for (const p of g.order) p.w.set(obj.params[p.name]);
    return g;
  }
}
