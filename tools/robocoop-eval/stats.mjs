// Shared posterior statistics for eval reporting (plan/rqgm-and-robocoop-5.md, U1 + U4).
// Single source of truth — polyglot/attribute.mjs (the labeler) and eval/ladder.mjs (the report)
// both import from here. Reference values (level 0.95): 0/3 → upper 0.536, 0/10 → 0.217,
// 0/30 → 0.080; 10/10 → lower 0.783, 3/3 → lower 0.464. Pinned in tests/robocoop5/.

// log Γ, Lanczos g=7, n=9.
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7];
function lnGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = LANCZOS[0];
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Continued fraction for the incomplete beta (Numerical Recipes §6.4, modified Lentz).
function betacf(x, a, b) {
  const TINY = 1e-30, EPS = 3e-16;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a,b) = P(Beta(a,b) ≤ x).
export function regularizedIncompleteBeta(x, a, b) {
  if (!(x > 0)) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2)
    ? (front * betacf(x, a, b)) / a
    : 1 - (Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + b * Math.log1p(-x) + a * Math.log(x)) * betacf(1 - x, b, a)) / b;
}

// Quantile by bisection — I_x is monotone in x, and 200 halvings of [0,1] are exact to 1e-60.
export function betaQuantile(q, a, b) {
  if (!(q > 0)) return 0;
  if (q >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    regularizedIncompleteBeta(mid, a, b) < q ? (lo = mid) : (hi = mid);
  }
  return (lo + hi) / 2;
}

// Exact two-sided sign test on discordant pairs (the exact form of McNemar's test).
// `b` = pairs where arm A passed and arm B failed, `c` = the reverse. Concordant pairs (both pass,
// both fail) carry no information about a difference between the arms, so the null hypothesis is
// that each of the b+c discordant pairs falls to A with probability ½:
//     P = 2 · Σ_{i=0..min(b,c)} C(b+c, i) · ½^(b+c), clamped to 1.
// Computed exactly by an iterative term recurrence — our discordant counts are tens, so there is no
// reason for a normal approximation. b = c = 0 → P = 1 (two identical arms are no evidence at all).
export function discordantPairTest(b, c) {
  const B = Math.max(0, Math.round(Number(b) || 0)), C = Math.max(0, Math.round(Number(c) || 0));
  const n = B + C;
  if (!n) return 1;
  const m = Math.min(B, C);
  let term = Math.pow(0.5, n), sum = term; // i = 0
  for (let i = 0; i < m; i++) {
    term *= (n - i) / (i + 1);
    sum += term;
  }
  return Math.min(1, 2 * sum);
}

// Jeffreys credible band on a pass rate: the equal-tailed interval of Beta(S+½, F+½). Beta(½,½) is
// the reference prior for a binomial, so the band is the smallest honest statement N graded
// samples support.
export function jeffreysInterval(successes, failures, level = 0.95) {
  const s = Math.max(0, Number(successes) || 0), f = Math.max(0, Number(failures) || 0);
  const alpha = (1 - level) / 2;
  // Brown/Cai/DasGupta's boundary convention: with no successes the interval starts at 0 (and
  // symmetrically at 1 with no failures) — a two-sided quantile there would exclude the only
  // outcome observed.
  return {
    lower: s === 0 ? 0 : betaQuantile(alpha, s + 0.5, f + 0.5),
    upper: f === 0 ? 1 : betaQuantile(1 - alpha, s + 0.5, f + 0.5),
  };
}
