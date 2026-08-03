// A Zig port of @tomlarkworthy/coded-landmark-tracking's findInvolution, for
// one purpose: to measure whether AOT compilation is worth 2x on the cascade
// that is 83% of the row scan. It is a SPIKE, not a shipping component -- the
// notebook's copy remains the only one that runs, and this exists to be
// benchmarked against it and then to inform a decision.
//
// It is written to be bit-identical, not idiomatic. Every guard, every strict
// vs non-strict comparison and every tie-break follows the JS exactly, because
// the notebook holds the worker pool to "identical to 4dp" and a WASM arm
// would have to clear the same bar. Where the JS relies on IEEE behaviour that
// reads as a bug (division by zero yielding an infinity that a later isFinite
// check catches) the Zig relies on it too.
//
// Fixed buffers, no allocator: the observed maximum over the 16 bank frames is
// 33 edges, and a detector that allocates per row on a phone is not a detector
// worth having.

const std = @import("std");

const MAXE: usize = 64;

var xs: [MAXE]f64 = undefined;
var ss: [MAXE]i32 = undefined;
var uOut: [MAXE]f64 = undefined;

var outP: f64 = 0;
var outQ: f64 = 0;
var outInl: i32 = 0;
var nUp: usize = 0;

// per-hypothesis scratch, and the best seen so far
var pe: [MAXE]usize = undefined;
var pf: [MAXE]usize = undefined;
var bpe: [MAXE]usize = undefined;
var bpf: [MAXE]usize = undefined;
var bnp: usize = 0;
var bAffine: bool = false;

export fn xsPtr() [*]f64 {
    return &xs;
}
export fn ssPtr() [*]i32 {
    return &ss;
}
export fn uPtr() [*]f64 {
    return &uOut;
}
export fn getP() f64 {
    return outP;
}
export fn getQ() f64 {
    return outQ;
}
export fn getNUp() i32 {
    return @intCast(nUp);
}

const INF: f64 = std.math.inf(f64);

inline fn isFin(x: f64) bool {
    return std.math.isFinite(x);
}

// Returns the number of inliers, or -1 for the JS `null`.
export fn run(n_in: usize, tolPx: f64, minInliers: i32) i32 {
    const n = n_in;
    outP = 0;
    outQ = 0;
    outInl = 0;
    nUp = 0;
    bnp = 0;
    if (n < 6 or n > MAXE) return -1;

    const span = xs[n - 1] - xs[0];
    var haveBest = false;
    var bestInl: i32 = 0;
    var bestP: f64 = 0;
    var bestQ: f64 = 0;

    const iMax = if (n < 3) n else 3;
    var i: usize = 0;
    while (i < iMax) : (i += 1) {
        // j >= max(n-3, i+3), counting down from n-1
        const lo_j = @max(if (n >= 3) n - 3 else 0, i + 3);
        if (n == 0) break;
        var j: usize = n - 1;
        while (j >= lo_j) : (j -= 1) {
            if (ss[i] == ss[j]) {
                if (j == 0) break;
                continue;
            }
            if (j < 2) {
                if (j == 0) break;
                continue;
            }
            const aMax = @min(i + 4, j - 2);
            var a: usize = i + 1;
            while (a <= aMax) : (a += 1) {
                const lo_b = @max(if (j >= 4) j - 4 else 0, a + 1);
                if (j == 0) break;
                var b: usize = j - 1;
                while (b >= lo_b) : (b -= 1) {
                    consider(n, span, i, j, a, b, tolPx, minInliers, &haveBest, &bestInl, &bestP, &bestQ);
                    if (b == 0) break;
                }
            }
            if (j == 0) break;
        }
    }

    if (!haveBest) return -1;

    // u per mirror pair via the geometric mean: t_L = -c k, t_R = +c k
    var m: usize = 0;
    var k: usize = 0;
    while (k < bnp) : (k += 1) {
        const te = if (bAffine) xs[bpe[k]] - bestP else (xs[bpe[k]] - bestP) / (xs[bpe[k]] - bestQ);
        const tf = if (bAffine) xs[bpf[k]] - bestP else (xs[bpf[k]] - bestP) / (xs[bpf[k]] - bestQ);
        const u = -te * tf;
        if (u > 0) {
            uOut[m] = u;
            m += 1;
        }
    }
    // ascending by u; insertion sort, stable, n is tiny
    var p: usize = 1;
    while (p < m) : (p += 1) {
        const v = uOut[p];
        var q: usize = p;
        while (q > 0 and uOut[q - 1] > v) : (q -= 1) uOut[q] = uOut[q - 1];
        uOut[q] = v;
    }
    if (m < 3) return -1;

    outP = bestP;
    outQ = bestQ;
    outInl = bestInl;
    nUp = m;
    return bestInl;
}

fn consider(
    n: usize,
    span: f64,
    i: usize,
    j: usize,
    a: usize,
    b: usize,
    tolPx: f64,
    minInliers: i32,
    haveBest: *bool,
    bestInl: *i32,
    bestP: *f64,
    bestQ: *f64,
) void {
    if (ss[i] == ss[j] or ss[a] == ss[b]) return;

    // involutionFrom(x1, x1p, x2, x2p) with r = [x*x', x+x', 1]
    const x1 = xs[i];
    const x1p = xs[j];
    const x2 = xs[a];
    const x2p = xs[b];
    const r10 = x1 * x1p;
    const r11 = x1 + x1p;
    const r20 = x2 * x2p;
    const r21 = x2 + x2p;
    const al = r11 - r21;
    const be = r20 - r10;
    const ga = r10 * r21 - r11 * r20;

    // fixedPoints
    var P: f64 = undefined;
    var Q: f64 = undefined;
    if (@abs(al) * span < 1e-4 * @abs(be)) {
        P = -ga / (2 * be);
        Q = INF;
    } else {
        const disc = be * be - al * ga;
        if (!(disc > 0)) return; // JS: disc <= 0 -> null (NaN also falls out here)
        const sq = @sqrt(disc);
        P = (-be + sq) / al;
        Q = (-be - sq) / al;
    }

    const mid = (xs[i] + xs[j]) / 2;
    if (isFin(Q) and @abs(P - mid) > @abs(Q - mid)) {
        const t = P;
        P = Q;
        Q = t;
    }
    if (!(P > xs[i] and P < xs[j] and P > xs[a] and P < xs[b])) return;
    if (isFin(Q) and Q > xs[i] - 0.02 * span and Q < xs[j] + 0.02 * span) return;
    const affine = !isFin(Q);

    var inl: i32 = 0;
    var np: usize = 0;
    var e: usize = 0;
    while (e < n) : (e += 1) {
        if (xs[e] >= P) break;
        const y = if (affine) 2 * P - xs[e] else -(be * xs[e] + ga) / (al * xs[e] + be);
        if (!isFin(y)) continue;
        // nearest opposite-sign edge right of P. Counts DOWN from n-1 and takes
        // strictly-smaller distances only, so among equal distances the higher
        // index wins -- match that or the detector answers differently.
        var bi: i64 = -1;
        var bd: f64 = INF;
        var f: usize = n;
        while (f > 0) {
            f -= 1;
            if (!(xs[f] > P)) break;
            const dd = @abs(xs[f] - y);
            if (dd < bd and ss[f] == -ss[e]) {
                bd = dd;
                bi = @intCast(f);
            }
        }
        if (bi >= 0 and bd <= tolPx) {
            inl += 2;
            pe[np] = e;
            pf[np] = @intCast(bi);
            np += 1;
        }
    }
    if (inl >= minInliers and (!haveBest.* or inl > bestInl.*)) {
        haveBest.* = true;
        bestInl.* = inl;
        bestP.* = P;
        bestQ.* = Q;
        bAffine = affine;
        bnp = np;
        var c: usize = 0;
        while (c < np) : (c += 1) {
            bpe[c] = pe[c];
            bpf[c] = pf[c];
        }
    }
}

pub fn main() void {}
