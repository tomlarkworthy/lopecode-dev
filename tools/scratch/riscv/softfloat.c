/* softfloat.c — compiler-rt builtins for rv32 ilp32d (lopecode RISC-V SBC)
 *
 * WHY THIS FILE EXISTS:
 * The rv32 ilp32d ABI uses 128-bit quad precision for `long double`.
 * Neither clang's compiler-rt nor GCC's libgcc ship prebuilt libraries
 * for this target. The linker can't find __multf3, __addtf3, etc.
 * This file provides those builtins so BusyBox (and musl libc) can link.
 *
 * WHAT'S HERE:
 * - 64-bit integer division/modulo/shifts (rv32 has no 64-bit instructions)
 * - Double-precision (binary64) arithmetic via integer bit manipulation
 * - Single-precision (binary32) int conversions and multiply
 * - Quad-precision (binary128) add/subtract/multiply/divide with full
 *   113-bit mantissa arithmetic (needed for musl's strtod bias trick)
 * - Quad-precision conversions (to/from double, float, int) via double
 *   trampolines — lossy beyond 53 bits but sufficient for conversions
 * - scalbnl() override — musl's version uses quad literals that overflow
 *   through our double trampolines; ours uses direct exponent bit twiddling
 *
 * KNOWN LIMITATIONS:
 * - Quad comparisons (__getf2 etc.) go through double — may give wrong
 *   results for values that differ only in bits 54-113
 * - Quad conversions to/from int go through double — loses precision
 *   for large values (> 2^53)
 * - No rounding modes — all operations truncate/round-to-zero
 * - __multf3 and __divtf3 are full 113-bit but UNTESTED as of 2026-04-11
 *
 * BETTER ALTERNATIVES:
 * 1. Switch emulator to rv64 — eliminates this file entirely. rv64 lp64d
 *    has full toolchain support (prebuilt libgcc/compiler-rt). The cost is
 *    rewriting the JS emulator for 64-bit registers (BigInt or hi/lo pairs).
 * 2. Build GCC's libgcc from riscv-gnu-toolchain — GCC's soft-fp library
 *    uses manual multi-word arithmetic (no __int128) so it works on rv32.
 *    Requires building the full GCC cross-toolchain (~15 min).
 * 3. LLVM compiler-rt does NOT work for quad-precision on rv32 — clang
 *    doesn't support __int128 on rv32, so all tf (128-bit) builtins
 *    compile to empty objects. Only non-quad builtins are usable.
 *
 * All double-precision functions use integer arithmetic only — no FPU
 * instructions emitted, safe for soft-float bootstrap.
 */

typedef unsigned int uint32_t;
typedef int int32_t;
typedef unsigned long long uint64_t;
typedef long long int64_t;

/* Forward declarations — needed because some functions are used before definition */
double __muldf3(double a, double b);
double __adddf3(double a, double b);
double __subdf3(double a, double b);
double __divdf3(double a, double b);
double __floatsidf(int a);
double __floatunsidf(unsigned int a);
int __fixdfsi(double a);
unsigned int __fixunsdfsi(double a);
double __extendsfdf2(float a);
float __truncdfsf2(double a);
int __gedf2(double a, double b);
int __ledf2(double a, double b);
int __ltdf2(double a, double b);

/* === 64-bit integer division === */

uint64_t __udivdi3(uint64_t n, uint64_t d) {
    if (d == 0) return 0;
    uint64_t q = 0, r = 0;
    for (int i = 63; i >= 0; i--) {
        r = (r << 1) | ((n >> i) & 1);
        if (r >= d) { r -= d; q |= (uint64_t)1 << i; }
    }
    return q;
}

int64_t __divdi3(int64_t a, int64_t b) {
    int neg = 0;
    if (a < 0) { a = -a; neg ^= 1; }
    if (b < 0) { b = -b; neg ^= 1; }
    uint64_t r = __udivdi3((uint64_t)a, (uint64_t)b);
    return neg ? -(int64_t)r : (int64_t)r;
}

uint64_t __umoddi3(uint64_t a, uint64_t b) {
    return a - __udivdi3(a, b) * b;
}

int64_t __moddi3(int64_t a, int64_t b) {
    int neg = a < 0;
    if (a < 0) a = -a;
    if (b < 0) b = -b;
    int64_t r = (int64_t)__umoddi3((uint64_t)a, (uint64_t)b);
    return neg ? -r : r;
}

/* === 64-bit shift builtins === */
/* rv32 has no 64-bit shift instructions; the compiler emits calls to these */

uint64_t __lshrdi3(uint64_t a, int b) {
    if (b == 0) return a;
    if (b >= 64) return 0;
    uint32_t lo = (uint32_t)a;
    uint32_t hi = (uint32_t)(a >> 32);
    if (b >= 32) return (uint64_t)(hi >> (b - 32));
    uint32_t new_hi = hi >> b;
    uint32_t new_lo = (lo >> b) | (hi << (32 - b));
    return ((uint64_t)new_hi << 32) | new_lo;
}

int64_t __ashrdi3(int64_t a, int b) {
    if (b == 0) return a;
    uint32_t lo = (uint32_t)(uint64_t)a;
    int32_t hi = (int32_t)((uint64_t)a >> 32);
    if (b >= 64) return (int64_t)(hi >> 31);
    if (b >= 32) {
        int32_t new_lo = hi >> (b - 32);
        int32_t new_hi = hi >> 31;
        return ((uint64_t)(uint32_t)new_hi << 32) | (uint32_t)new_lo;
    }
    int32_t new_hi = hi >> b;
    uint32_t new_lo = (lo >> b) | ((uint32_t)hi << (32 - b));
    return ((uint64_t)(uint32_t)new_hi << 32) | new_lo;
}

uint64_t __ashldi3(uint64_t a, int b) {
    if (b == 0) return a;
    if (b >= 64) return 0;
    uint32_t lo = (uint32_t)a;
    uint32_t hi = (uint32_t)(a >> 32);
    if (b >= 32) return (uint64_t)(lo << (b - 32)) << 32;
    uint32_t new_hi = (hi << b) | (lo >> (32 - b));
    uint32_t new_lo = lo << b;
    return ((uint64_t)new_hi << 32) | new_lo;
}

/* === Double-precision float (IEEE 754 binary64) via integer ops === */
/* Layout: sign(1) | exponent(11) | mantissa(52) */

typedef union { double d; uint64_t u; } du;

#define DSIGN(x) ((x) >> 63)
#define DEXP(x)  (((x) >> 52) & 0x7FF)
#define DMANT(x) ((x) & 0x000FFFFFFFFFFFFF)
#define DBIAS 1023
#define DINF  0x7FF0000000000000ULL
#define PACK_D(s,e,m) (((uint64_t)(s) << 63) | ((uint64_t)(e) << 52) | ((m) & 0x000FFFFFFFFFFFFFULL))

/* double -> int */
int __fixdfsi(double a) {
    du u = {a};
    int sign = DSIGN(u.u);
    int exp = DEXP(u.u) - DBIAS;
    if (exp < 0) return 0;
    if (exp > 30) return sign ? (-2147483647-1) : 2147483647;
    uint64_t mant = DMANT(u.u) | (1ULL << 52);
    int32_t val;
    if (exp >= 52) val = (int32_t)(mant << (exp - 52));
    else val = (int32_t)(mant >> (52 - exp));
    return sign ? -val : val;
}

/* unsigned -> double */
double __floatunsidf(unsigned int a) {
    if (a == 0) { du r = {0}; return r.d; }
    int shift = 0;
    uint32_t tmp = a;
    while (!(tmp & 0x80000000)) { tmp <<= 1; shift++; }
    /* a has (32 - shift) significant bits, leading 1 at bit (31 - shift) */
    int exp = 31 - shift + DBIAS;
    uint64_t mant = ((uint64_t)a << (52 - 31 + shift)) & 0x000FFFFFFFFFFFFFULL;
    du r; r.u = PACK_D(0, exp, mant);
    return r.d;
}

/* int -> double */
double __floatsidf(int a) {
    if (a == 0) { du r = {0}; return r.d; }
    int sign = 0;
    unsigned int ua;
    if (a < 0) { sign = 1; ua = (unsigned int)(-a); }
    else ua = (unsigned int)a;
    double r = __floatunsidf(ua);
    if (sign) { du u = {r}; u.u |= (1ULL << 63); return u.d; }
    return r;
}

/* double multiply */
double __muldf3(double a, double b) {
    du ua = {a}, ub = {b};
    int sa = DSIGN(ua.u), sb = DSIGN(ub.u);
    int ea = DEXP(ua.u), eb = DEXP(ub.u);
    uint64_t ma = DMANT(ua.u), mb = DMANT(ub.u);

    /* Handle zeros and specials */
    if (ea == 0 && ma == 0) { du r; r.u = PACK_D(sa ^ sb, 0, 0); return r.d; }
    if (eb == 0 && mb == 0) { du r; r.u = PACK_D(sa ^ sb, 0, 0); return r.d; }
    if (ea == 0x7FF || eb == 0x7FF) { du r; r.u = DINF | ((uint64_t)(sa ^ sb) << 63); return r.d; }

    /* Add implicit bit */
    if (ea != 0) ma |= (1ULL << 52); else ea = 1;
    if (eb != 0) mb |= (1ULL << 52); else eb = 1;

    int exp = ea + eb - DBIAS;
    /* Multiply mantissas: 53-bit * 53-bit
     * Split into 27-bit and 26-bit halves.  ah*bh lands at bit 52
     * (= 26+26), so the implicit-1 bit is naturally at position 52
     * and no post-hoc scale compensation is needed. */
    uint32_t ah = ma >> 26, al = ma & 0x3FFFFFF;
    uint32_t bh = mb >> 26, bl = mb & 0x3FFFFFF;
    uint64_t p = (uint64_t)ah * bh;
    uint64_t mid = (uint64_t)ah * bl + (uint64_t)al * bh;
    p += (mid >> 26);

    /* Normalize */
    while (p >= (2ULL << 53)) { p >>= 1; exp++; }
    if (p & (1ULL << 53)) { p >>= 1; exp++; }
    while (p && !(p & (1ULL << 52))) { p <<= 1; exp--; }

    if (exp >= 0x7FF) { du r; r.u = DINF | ((uint64_t)(sa ^ sb) << 63); return r.d; }
    if (exp <= 0) { du r; r.u = PACK_D(sa ^ sb, 0, 0); return r.d; }

    du r; r.u = PACK_D(sa ^ sb, exp, p & 0x000FFFFFFFFFFFFFULL);
    return r.d;
}

/* double add (internal, both positive, ea >= eb) */
static double dadd_pos(uint64_t ua, uint64_t ub) {
    int ea = DEXP(ua), eb = DEXP(ub);
    uint64_t ma = DMANT(ua) | (ea ? (1ULL << 52) : 0);
    uint64_t mb = DMANT(ub) | (eb ? (1ULL << 52) : 0);
    if (ea == 0) ea = 1; if (eb == 0) eb = 1;
    int shift = ea - eb;
    if (shift > 52) return (du){.u = ua}.d;
    mb >>= shift;
    ma += mb;
    if (ma & (1ULL << 53)) { ma >>= 1; ea++; }
    if (ea >= 0x7FF) { du r; r.u = DINF; return r.d; }
    du r; r.u = PACK_D(0, ea, ma & 0x000FFFFFFFFFFFFFULL);
    return r.d;
}

/* double subtract (internal, both positive, ea >= eb, result positive) */
static double dsub_pos(uint64_t ua, uint64_t ub) {
    int ea = DEXP(ua), eb = DEXP(ub);
    uint64_t ma = DMANT(ua) | (ea ? (1ULL << 52) : 0);
    uint64_t mb = DMANT(ub) | (eb ? (1ULL << 52) : 0);
    if (ea == 0) ea = 1; if (eb == 0) eb = 1;
    int shift = ea - eb;
    if (shift > 52) return (du){.u = ua}.d;
    mb >>= shift;
    ma -= mb;
    if (ma == 0) { du r; r.u = 0; return r.d; }
    while (!(ma & (1ULL << 52))) { ma <<= 1; ea--; }
    if (ea <= 0) { du r; r.u = 0; return r.d; }
    du r; r.u = PACK_D(0, ea, ma & 0x000FFFFFFFFFFFFFULL);
    return r.d;
}

double __adddf3(double a, double b) {
    du ua = {a}, ub = {b};
    int sa = DSIGN(ua.u), sb = DSIGN(ub.u);
    uint64_t aua = ua.u & 0x7FFFFFFFFFFFFFFFULL, aub = ub.u & 0x7FFFFFFFFFFFFFFFULL;
    if (sa == sb) {
        double r = (aua >= aub) ? dadd_pos(aua, aub) : dadd_pos(aub, aua);
        if (sa) { du ru = {r}; ru.u |= (1ULL << 63); return ru.d; }
        return r;
    }
    /* Different signs — subtract smaller from larger */
    if (aua >= aub) {
        double r = dsub_pos(aua, aub);
        if (sa) { du ru = {r}; ru.u |= (1ULL << 63); return ru.d; }
        return r;
    } else {
        double r = dsub_pos(aub, aua);
        if (sb) { du ru = {r}; ru.u |= (1ULL << 63); return ru.d; }
        return r;
    }
}

double __subdf3(double a, double b) {
    du ub = {b}; ub.u ^= (1ULL << 63);
    return __adddf3(a, ub.d);
}

/* Double comparison via integer bit manipulation — NO C float operators.
 * IEEE 754: positive doubles compare like unsigned integers.
 * Negative doubles compare in reverse order (sign-magnitude). */
static int dcmp(double a, double b) {
    du ua = {a}, ub = {b};
    uint64_t aa = ua.u, bb = ub.u;
    /* NaN check */
    if ((DEXP(aa) == 0x7FF && DMANT(aa)) || (DEXP(bb) == 0x7FF && DMANT(bb)))
        return -2; /* unordered */
    /* Handle -0 == +0 */
    if ((aa | bb) == (1ULL << 63)) return 0; /* both zero */
    if (aa == bb) return 0;
    int sa = DSIGN(aa), sb = DSIGN(bb);
    if (sa != sb) return sa ? -1 : 1; /* neg < pos */
    uint64_t ma = aa & 0x7FFFFFFFFFFFFFFFULL, mb = bb & 0x7FFFFFFFFFFFFFFFULL;
    if (sa) return (ma > mb) ? -1 : 1; /* both neg: larger magnitude = smaller */
    return (ma > mb) ? 1 : -1; /* both pos: larger magnitude = larger */
}

int __gedf2(double a, double b) { int c = dcmp(a, b); return (c >= 0 && c != -2) ? 0 : -1; }
int __ledf2(double a, double b) { int c = dcmp(a, b); return (c <= 0 && c != -2) ? 0 : 1; }
int __ltdf2(double a, double b) { int c = dcmp(a, b); return (c < 0 && c != -2) ? -1 : 0; }
int __gtdf2(double a, double b) { int c = dcmp(a, b); return (c > 0) ? 1 : 0; }
int __eqdf2(double a, double b) { du ua = {a}, ub = {b}; return ua.u == ub.u ? 0 : 1; }

/* float -> double */
double __extendsfdf2(float a) {
    union { float f; uint32_t u; } uf = {a};
    int sign = uf.u >> 31;
    int exp = (uf.u >> 23) & 0xFF;
    uint32_t mant = uf.u & 0x7FFFFF;
    if (exp == 0 && mant == 0) { du r; r.u = (uint64_t)sign << 63; return r.d; }
    if (exp == 0xFF) { du r; r.u = PACK_D(sign, 0x7FF, (uint64_t)mant << 29); return r.d; }
    int dexp = exp - 127 + DBIAS;
    uint64_t dmant = (uint64_t)mant << 29;
    du r; r.u = PACK_D(sign, dexp, dmant);
    return r.d;
}

/* double -> float */
float __truncdfsf2(double a) {
    du u = {a};
    int sign = DSIGN(u.u);
    int exp = DEXP(u.u);
    uint64_t mant = DMANT(u.u);
    if (exp == 0x7FF) {
        union { float f; uint32_t u; } r;
        r.u = (sign << 31) | 0x7F800000 | (uint32_t)(mant >> 29);
        return r.f;
    }
    int fexp = exp - DBIAS + 127;
    if (fexp >= 0xFF) { union { float f; uint32_t u; } r; r.u = (sign << 31) | 0x7F800000; return r.f; }
    if (fexp <= 0) { union { float f; uint32_t u; } r; r.u = sign << 31; return r.f; }
    uint32_t fmant = (uint32_t)(mant >> 29);
    union { float f; uint32_t u; } r;
    r.u = (sign << 31) | (fexp << 23) | fmant;
    return r.f;
}

/* === Long double (IEEE 754 binary128, quad precision) via integer ops ===
 *
 * On rv32 ilp32 without F extension, long double is 128-bit quad.
 * Layout: sign(1) | exponent(15) | mantissa(112)
 *
 * CRITICAL: We CANNOT use C type casts like (double)ld or (long double)d
 * because the compiler generates calls to __trunctfdf2 / __extenddftf2 —
 * the very functions we're defining. ALL conversions must use integer
 * bit manipulation via memcpy or union tricks.
 *
 * BusyBox doesn't need full quad precision, so these stubs convert
 * through double via bit manipulation for all arithmetic.
 */

/* Access long double as raw bytes — avoids any compiler-generated calls */
typedef union { long double ld; uint64_t u[2]; } ldu;
/* On little-endian rv32: u[0] = low 64 bits (mantissa low), u[1] = high 64 bits (sign|exp|mantissa high) */

#define TFSIGN(hi) ((hi) >> 63)
#define TFEXP(hi)  (((hi) >> 48) & 0x7FFF)
#define TFBIAS 16383

/* Convert long double to double via bit manipulation (NO C casts) */
static double tf_to_df(long double a) {
    ldu u; u.ld = a;
    uint64_t hi = u.u[1];
    int sign = TFSIGN(hi);
    int texp = TFEXP(hi);
    /* Mantissa: quad has 112 bits, double has 52 bits.
     * Top 48 bits of mantissa are in hi[47:0], next 64 bits in u.u[0].
     * We need top 52 bits: 48 from hi + 4 from top of lo. */
    uint64_t mant_hi = hi & 0x0000FFFFFFFFFFFFULL; /* top 48 bits of mantissa */
    uint64_t mant_lo = u.u[0]; /* low 64 bits of mantissa */
    uint64_t dmant = (mant_hi << 4) | (mant_lo >> 60); /* top 52 bits */

    if (texp == 0x7FFF) {
        /* Inf or NaN */
        if (mant_hi == 0 && mant_lo == 0)
            { du r; r.u = PACK_D(sign, 0x7FF, 0); return r.d; }
        else
            { du r; r.u = PACK_D(sign, 0x7FF, dmant | 1); return r.d; } /* NaN */
    }
    if (texp == 0 && mant_hi == 0 && mant_lo == 0) {
        du r; r.u = (uint64_t)sign << 63; return r.d; /* zero */
    }
    int dexp = texp - TFBIAS + DBIAS;
    if (dexp >= 0x7FF) { du r; r.u = PACK_D(sign, 0x7FF, 0); return r.d; } /* overflow → inf */
    if (dexp <= 0) { du r; r.u = (uint64_t)sign << 63; return r.d; } /* underflow → zero */
    du r; r.u = PACK_D(sign, dexp, dmant);
    return r.d;
}

/* Convert double to long double via bit manipulation (NO C casts) */
static long double df_to_tf(double a) {
    du ud = {a};
    uint64_t bits = ud.u;
    int sign = DSIGN(bits);
    int dexp = DEXP(bits);
    uint64_t dmant = DMANT(bits); /* 52 bits */

    ldu r;
    if (dexp == 0x7FF) {
        /* Inf or NaN */
        r.u[1] = ((uint64_t)sign << 63) | ((uint64_t)0x7FFF << 48) | (dmant >> 4);
        r.u[0] = dmant << 60;
        return r.ld;
    }
    if (dexp == 0 && dmant == 0) {
        r.u[1] = (uint64_t)sign << 63;
        r.u[0] = 0;
        return r.ld;
    }
    int texp = dexp - DBIAS + TFBIAS;
    /* Spread 52-bit double mantissa into 112-bit quad mantissa.
     * Top 48 go into hi[47:0], next 4 go into top of lo[63:60]. */
    r.u[1] = ((uint64_t)sign << 63) | ((uint64_t)texp << 48) | (dmant >> 4);
    r.u[0] = dmant << 60;
    return r.ld;
}

/* 64x64 → 128-bit unsigned multiply.
 * Splits each 64-bit value into two 32-bit halves to avoid overflow. */
static void mul64(uint64_t a, uint64_t b, uint64_t *hi, uint64_t *lo) {
    uint64_t al = a & 0xFFFFFFFF, ah = a >> 32;
    uint64_t bl = b & 0xFFFFFFFF, bh = b >> 32;
    uint64_t p0 = al * bl;
    uint64_t p1 = al * bh;
    uint64_t p2 = ah * bl;
    uint64_t p3 = ah * bh;
    /* Accumulate middle terms with carry */
    uint64_t mid = (p0 >> 32) + (p1 & 0xFFFFFFFF) + (p2 & 0xFFFFFFFF);
    *lo = (p0 & 0xFFFFFFFF) | (mid << 32);
    *hi = p3 + (p1 >> 32) + (p2 >> 32) + (mid >> 32);
}

/* Proper quad-precision multiply using 113-bit mantissa arithmetic.
 * Each quad mantissa = {hi[48:0], lo[63:0]} = 113 bits (with implicit bit).
 * Product of two 113-bit mantissas is 226 bits; we keep top 113. */
long double __multf3(long double a, long double b) {
    ldu ua, ub;
    ua.ld = a; ub.ld = b;
    int sa = TFSIGN(ua.u[1]), sb = TFSIGN(ub.u[1]);
    int ea = TFEXP(ua.u[1]), eb = TFEXP(ub.u[1]);

    /* Handle zeros */
    if ((ea == 0 && (ua.u[1] & 0x0000FFFFFFFFFFFFULL) == 0 && ua.u[0] == 0) ||
        (eb == 0 && (ub.u[1] & 0x0000FFFFFFFFFFFFULL) == 0 && ub.u[0] == 0)) {
        ldu r; r.u[1] = (uint64_t)(sa ^ sb) << 63; r.u[0] = 0; return r.ld;
    }
    /* Handle inf/nan via double trampoline */
    if (ea == 0x7FFF || eb == 0x7FFF) {
        double da = tf_to_df(a), db = tf_to_df(b);
        return df_to_tf(da * db);
    }

    int rsign = sa ^ sb;
    int rexp = ea + eb - TFBIAS;

    /* Extract 113-bit mantissas: implicit bit at position 112 = bit 48 of hi word */
    uint64_t ahi = (ua.u[1] & 0x0000FFFFFFFFFFFFULL) | (ea ? 0x0001000000000000ULL : 0);
    uint64_t alo = ua.u[0];
    uint64_t bhi = (ub.u[1] & 0x0000FFFFFFFFFFFFULL) | (eb ? 0x0001000000000000ULL : 0);
    uint64_t blo = ub.u[0];

    /* Multiply {ahi, alo} * {bhi, blo} — we need the top 113 bits of the 226-bit product.
     * A = ahi*2^64 + alo,  B = bhi*2^64 + blo
     * A*B = ahi*bhi*2^128 + (ahi*blo + alo*bhi)*2^64 + alo*blo
     *
     * We accumulate into four 64-bit words: {r3, r2, r1, r0} (256 bits) */
    uint64_t r0, r1, r2, r3;
    uint64_t ph, pl, carry;

    /* alo * blo → {r1_part, r0} */
    mul64(alo, blo, &r1, &r0);

    /* ahi * blo → {ph, pl}, add to {r2, r1} */
    mul64(ahi, blo, &ph, &pl);
    uint64_t old_r1 = r1;
    r1 += pl;
    r2 = ph + (r1 < old_r1 ? 1 : 0);

    /* alo * bhi → {ph, pl}, add to {r2, r1} with carry into r3 */
    mul64(alo, bhi, &ph, &pl);
    old_r1 = r1;
    r1 += pl;
    carry = (r1 < old_r1 ? 1 : 0);
    uint64_t old_r2 = r2;
    r2 += ph + carry;
    r3 = (r2 < old_r2 || (carry && r2 == old_r2 && ph == 0)) ? 1 : 0;

    /* ahi * bhi → {ph, pl}, add to {r3, r2} */
    mul64(ahi, bhi, &ph, &pl);
    old_r2 = r2;
    r2 += pl;
    r3 += ph + (r2 < old_r2 ? 1 : 0);

    /* Product is in {r3, r2, r1, r0}.
     * The implicit bits were at position 48 in each hi word.
     * Product's implicit bit is at position 48+48 = 96 from the bottom of {r3,r2,r1,r0}.
     * Position 96 = bit 32 of r1 (since r0 has bits 0-63, r1 has bits 64-127).
     * Wait — position counting: implicit bit of a is bit (64+48)=112 of {ahi,alo}.
     * Product implicit bit is at 112+112=224 of the 256-bit result.
     * 224 = 3*64 + 32, so bit 32 of r3.
     *
     * If both implicit bits are set, the product's MSB is at bit 224 or 225.
     * For normalized result, the implicit bit should be at position 112.
     * We need to extract 113 bits starting from the MSB.
     */

    /* Normalize: find the MSB. It's either at bit 225 (if product overflows)
     * or bit 224. bit 225 = bit 33 of r3, bit 224 = bit 32 of r3. */
    if (r3 & (1ULL << 33)) {
        /* MSB at bit 225 — shift right by 225-112 = 113 bits to place
         * implicit bit at position 112.
         * Extract {rhi, rlo} = top 113 bits of {r3, r2, r1, r0} >> 113 */
        /* 113 = 64 + 49. Shift {r3,r2,r1} right by 49 bits. */
        uint64_t rlo = (r1 >> 49) | (r2 << 15);
        uint64_t rhi = (r2 >> 49) | (r3 << 15);
        rexp += 1;
        ldu r;
        r.u[1] = ((uint64_t)rsign << 63) | ((uint64_t)rexp << 48) | (rhi & 0x0000FFFFFFFFFFFFULL);
        r.u[0] = rlo;
        return r.ld;
    } else {
        /* MSB at bit 224 — shift right by 224-112 = 112 bits.
         * 112 = 64 + 48. Shift {r3,r2,r1} right by 48 bits. */
        uint64_t rlo = (r1 >> 48) | (r2 << 16);
        uint64_t rhi = (r2 >> 48) | (r3 << 16);
        ldu r;
        r.u[1] = ((uint64_t)rsign << 63) | ((uint64_t)rexp << 48) | (rhi & 0x0000FFFFFFFFFFFFULL);
        r.u[0] = rlo;
        return r.ld;
    }
}

/* Proper quad-precision divide using 113-bit mantissa arithmetic.
 * Uses restoring division: 113-bit dividend / 113-bit divisor → 113-bit quotient. */
long double __divtf3(long double a, long double b) {
    ldu ua, ub;
    ua.ld = a; ub.ld = b;
    int sa = TFSIGN(ua.u[1]), sb = TFSIGN(ub.u[1]);
    int ea = TFEXP(ua.u[1]), eb = TFEXP(ub.u[1]);

    /* Handle zeros */
    if (ea == 0 && (ua.u[1] & 0x0000FFFFFFFFFFFFULL) == 0 && ua.u[0] == 0) {
        ldu r; r.u[1] = (uint64_t)(sa ^ sb) << 63; r.u[0] = 0; return r.ld;
    }
    /* Handle inf/nan/div-by-zero via double trampoline */
    if (ea == 0x7FFF || eb == 0x7FFF ||
        (eb == 0 && (ub.u[1] & 0x0000FFFFFFFFFFFFULL) == 0 && ub.u[0] == 0)) {
        double da = tf_to_df(a), db = tf_to_df(b);
        return df_to_tf(da / db);
    }

    int rsign = sa ^ sb;
    int rexp = ea - eb + TFBIAS;

    /* Extract 113-bit mantissas */
    uint64_t ahi = (ua.u[1] & 0x0000FFFFFFFFFFFFULL) | (ea ? 0x0001000000000000ULL : 0);
    uint64_t alo = ua.u[0];
    uint64_t bhi = (ub.u[1] & 0x0000FFFFFFFFFFFFULL) | (eb ? 0x0001000000000000ULL : 0);
    uint64_t blo = ub.u[0];

    /* If dividend < divisor, shift dividend left by 1 and decrement exponent */
    if (ahi < bhi || (ahi == bhi && alo < blo)) {
        /* Shift {ahi, alo} left by 1 */
        ahi = (ahi << 1) | (alo >> 63);
        alo <<= 1;
        rexp--;
    }

    /* Restoring division: produce 113 quotient bits.
     * Remainder is in {rhi, rlo}, quotient in {qhi, qlo}. */
    uint64_t rhi = 0, rlo = 0;
    uint64_t qhi = 0, qlo = 0;

    /* We process 113 bits: the implicit bit (112) plus 112 mantissa bits.
     * Dividend bits are in {ahi, alo} from bit 112 down to bit 0. */
    for (int i = 112; i >= 0; i--) {
        /* Shift remainder left by 1, bring in next dividend bit */
        rhi = (rhi << 1) | (rlo >> 63);
        rlo <<= 1;
        /* Next dividend bit: bit i of {ahi, alo} */
        int dbit;
        if (i >= 64)
            dbit = (ahi >> (i - 64)) & 1;
        else
            dbit = (alo >> i) & 1;
        rlo |= dbit;

        /* Compare remainder >= divisor */
        if (rhi > bhi || (rhi == bhi && rlo >= blo)) {
            /* Subtract divisor from remainder */
            uint64_t old_rlo = rlo;
            rlo -= blo;
            rhi -= bhi + (old_rlo < blo ? 1 : 0);
            /* Set quotient bit */
            if (i >= 64)
                qhi |= (1ULL << (i - 64));
            else
                qlo |= (1ULL << i);
        }
    }

    /* qhi has bits 112..64, qlo has bits 63..0.
     * Implicit bit should be at bit 112 = bit 48 of qhi. */
    if (rexp <= 0) { ldu r; r.u[1] = (uint64_t)rsign << 63; r.u[0] = 0; return r.ld; }
    if (rexp >= 0x7FFF) {
        ldu r; r.u[1] = ((uint64_t)rsign << 63) | (0x7FFFULL << 48); r.u[0] = 0; return r.ld;
    }

    ldu r;
    r.u[1] = ((uint64_t)rsign << 63) | ((uint64_t)rexp << 48) | (qhi & 0x0000FFFFFFFFFFFFULL);
    r.u[0] = qlo;
    return r.ld;
}

/* 128-bit right shift of {hi, lo} by n bits (0 <= n < 128) */
static void shr128(uint64_t *hi, uint64_t *lo, int n) {
    if (n == 0) return;
    if (n >= 128) { *hi = 0; *lo = 0; return; }
    if (n >= 64) { *lo = *hi >> (n - 64); *hi = 0; return; }
    *lo = (*lo >> n) | (*hi << (64 - n));
    *hi >>= n;
}

/* 128-bit left shift of {hi, lo} by n bits (0 <= n < 128) */
static void shl128(uint64_t *hi, uint64_t *lo, int n) {
    if (n == 0) return;
    if (n >= 128) { *hi = 0; *lo = 0; return; }
    if (n >= 64) { *hi = *lo << (n - 64); *lo = 0; return; }
    *hi = (*hi << n) | (*lo >> (64 - n));
    *lo <<= n;
}

/* Proper quad-precision add/subtract — needed for the bias trick in strtod.
 * The bias trick adds y + 2^172 then subtracts 2^172. With 113-bit mantissa,
 * both values are preserved. Double trampolines lose y in the addition. */
long double __addtf3(long double a, long double b) {
    ldu ua, ub;
    ua.ld = a; ub.ld = b;
    int sa = TFSIGN(ua.u[1]), sb = TFSIGN(ub.u[1]);
    int ea = TFEXP(ua.u[1]), eb = TFEXP(ub.u[1]);

    /* Handle zeros */
    if (ea == 0 && (ua.u[1] & 0x0000FFFFFFFFFFFFULL) == 0 && ua.u[0] == 0) return b;
    if (eb == 0 && (ub.u[1] & 0x0000FFFFFFFFFFFFULL) == 0 && ub.u[0] == 0) return a;

    /* Handle inf/nan simply */
    if (ea == 0x7FFF || eb == 0x7FFF) {
        double da = tf_to_df(a), db = tf_to_df(b);
        return df_to_tf(da + db);
    }

    /* Extract 113-bit mantissa: implicit bit at position 112 (bit 48 of hi) */
    uint64_t ahi = (ua.u[1] & 0x0000FFFFFFFFFFFFULL) | (ea ? 0x0001000000000000ULL : 0);
    uint64_t alo = ua.u[0];
    uint64_t bhi = (ub.u[1] & 0x0000FFFFFFFFFFFFULL) | (eb ? 0x0001000000000000ULL : 0);
    uint64_t blo = ub.u[0];
    if (!ea) ea = 1;
    if (!eb) eb = 1;

    if (sa != sb) {
        /* Different signs: subtract. Negate b and recurse as add. */
        ub.u[1] ^= (1ULL << 63);
        /* a + (-b) = a - b. Use subtraction logic. */
        /* Ensure |a| >= |b| for subtraction */
        int swap = 0;
        if (ea < eb || (ea == eb && (ahi < bhi || (ahi == bhi && alo < blo)))) {
            swap = 1;
            /* Swap a and b */
            uint64_t t;
            t = ahi; ahi = bhi; bhi = t;
            t = alo; alo = blo; blo = t;
            int te = ea; ea = eb; eb = te;
            sa = sb;
        }
        int shift = ea - eb;
        if (shift > 113) {
            /* b is negligible */
            ldu r;
            ahi = swap ? bhi : ahi; /* we swapped above, use the larger */
            /* Actually, just return the larger operand */
            return swap ? b : a;
        }
        /* Right-align b's mantissa */
        shr128(&bhi, &blo, shift);
        /* Subtract: {ahi,alo} - {bhi,blo} */
        uint64_t rlo = alo - blo;
        uint64_t rhi = ahi - bhi - (alo < blo ? 1 : 0);
        /* Handle zero result */
        if (rhi == 0 && rlo == 0) {
            ldu r; r.u[0] = 0; r.u[1] = 0; return r.ld;
        }
        /* Normalize: shift left until bit 48 of rhi is set */
        while (!(rhi & 0x0001000000000000ULL)) {
            shl128(&rhi, &rlo, 1);
            ea--;
        }
        if (ea <= 0) { ldu r; r.u[0] = 0; r.u[1] = (uint64_t)sa << 63; return r.ld; }
        ldu r;
        r.u[1] = ((uint64_t)sa << 63) | ((uint64_t)ea << 48) | (rhi & 0x0000FFFFFFFFFFFFULL);
        r.u[0] = rlo;
        return r.ld;
    }

    /* Same sign: add */
    int rexp = ea;
    if (ea > eb) {
        int shift = ea - eb;
        if (shift > 113) return a;
        shr128(&bhi, &blo, shift);
    } else if (eb > ea) {
        int shift = eb - ea;
        if (shift > 113) return b;
        shr128(&ahi, &alo, shift);
        rexp = eb;
    }
    /* Add mantissas */
    uint64_t rlo = alo + blo;
    uint64_t rhi = ahi + bhi + (rlo < alo ? 1 : 0);
    /* Check overflow (bit 49 of rhi set) */
    if (rhi & 0x0002000000000000ULL) {
        shr128(&rhi, &rlo, 1);
        rexp++;
    }
    if (rexp >= 0x7FFF) {
        /* Overflow to inf */
        ldu r;
        r.u[1] = ((uint64_t)sa << 63) | (0x7FFFULL << 48);
        r.u[0] = 0;
        return r.ld;
    }
    ldu r;
    r.u[1] = ((uint64_t)sa << 63) | ((uint64_t)rexp << 48) | (rhi & 0x0000FFFFFFFFFFFFULL);
    r.u[0] = rlo;
    return r.ld;
}

long double __subtf3(long double a, long double b) {
    ldu ub; ub.ld = b;
    ub.u[1] ^= (1ULL << 63); /* negate b */
    return __addtf3(a, ub.ld);
}

/* scalbnl — multiply long double by 2^n via exponent adjustment.
 * Pure bit manipulation, no arithmetic needed. */
long double scalbnl(long double x, int n) {
    ldu u; u.ld = x;
    int exp = TFEXP(u.u[1]);
    if (exp == 0 || exp == 0x7FFF || n == 0) return x;
    exp += n;
    if (exp >= 0x7FFF) {
        /* Overflow to infinity, preserve sign */
        u.u[1] = (u.u[1] & (1ULL << 63)) | (0x7FFFULL << 48);
        u.u[0] = 0;
        return u.ld;
    }
    if (exp <= 0) {
        /* Underflow to zero, preserve sign */
        u.u[1] = u.u[1] & (1ULL << 63);
        u.u[0] = 0;
        return u.ld;
    }
    u.u[1] = (u.u[1] & ~(0x7FFFULL << 48)) | ((uint64_t)exp << 48);
    return u.ld;
}

/* Quad comparisons — convert to double via bit manipulation, compare as integers */
int __getf2(long double a, long double b) { return __gedf2(tf_to_df(a), tf_to_df(b)); }
int __letf2(long double a, long double b) { return __ledf2(tf_to_df(a), tf_to_df(b)); }
int __lttf2(long double a, long double b) { return __ltdf2(tf_to_df(a), tf_to_df(b)); }
int __eqtf2(long double a, long double b) { du ua = {tf_to_df(a)}, ub = {tf_to_df(b)}; return ua.u == ub.u ? 0 : 1; }
int __netf2(long double a, long double b) { du ua = {tf_to_df(a)}, ub = {tf_to_df(b)}; return ua.u != ub.u ? 1 : 0; }
int __unordtf2(long double a, long double b) {
    ldu ua; ua.ld = a; ldu ub; ub.ld = b;
    return (TFEXP(ua.u[1]) == 0x7FFF && (ua.u[1] & 0x0000FFFFFFFFFFFFULL || ua.u[0]))
        || (TFEXP(ub.u[1]) == 0x7FFF && (ub.u[1] & 0x0000FFFFFFFFFFFFULL || ub.u[0]));
}

/* Quad conversions — all via bit manipulation, NO C casts */
long double __floatsitf(int a) { return df_to_tf(__floatsidf(a)); }
long double __floatunsitf(unsigned int a) { return df_to_tf(__floatunsidf(a)); }
int __fixtfsi(long double a) { return __fixdfsi(tf_to_df(a)); }
unsigned int __fixunstfsi(long double a) { return __fixunsdfsi(tf_to_df(a)); }
long double __extendsftf2(float a) { return df_to_tf(__extendsfdf2(a)); }
long double __extenddftf2(double a) { return df_to_tf(a); }
float __trunctfsf2(long double a) { return __truncdfsf2(tf_to_df(a)); }
double __trunctfdf2(long double a) { return tf_to_df(a); }

/* Double division */
double __divdf3(double a, double b) {
    du ua = {a}, ub = {b};
    int sa = DSIGN(ua.u), sb = DSIGN(ub.u);
    int ea = DEXP(ua.u), eb = DEXP(ub.u);
    uint64_t ma = DMANT(ua.u), mb = DMANT(ub.u);

    if (eb == 0 && mb == 0) { du r; r.u = DINF | ((uint64_t)(sa ^ sb) << 63); return r.d; }
    if (ea == 0 && ma == 0) { du r; r.u = PACK_D(sa ^ sb, 0, 0); return r.d; }

    if (ea != 0) ma |= (1ULL << 52); else ea = 1;
    if (eb != 0) mb |= (1ULL << 52); else eb = 1;

    int exp = ea - eb + DBIAS;
    /* Restoring division: 63 iterations produce bits 62..0.
     * The implicit-1 bit lands at bit 62 when ma >= mb, so
     * q >>= 10 places it at bit 52 (the IEEE 754 implicit bit). */
    uint64_t q = 0;
    for (int i = 62; i >= 0; i--) {
        if (ma >= mb) { ma -= mb; q |= (1ULL << i); }
        ma <<= 1;
    }
    q >>= 10;

    while (q && !(q & (1ULL << 52))) { q <<= 1; exp--; }
    if (q & (1ULL << 53)) { q >>= 1; exp++; }

    if (exp >= 0x7FF) { du r; r.u = DINF | ((uint64_t)(sa ^ sb) << 63); return r.d; }
    if (exp <= 0) { du r; r.u = PACK_D(sa ^ sb, 0, 0); return r.d; }

    du r; r.u = PACK_D(sa ^ sb, exp, q & 0x000FFFFFFFFFFFFFULL);
    return r.d;
}

/* Negation */
double __negdf2(double a) { du u = {a}; u.u ^= (1ULL << 63); return u.d; }

/* === double -> int64 === */
int64_t __fixdfdi(double a) {
    du u = {a};
    int sign = DSIGN(u.u);
    int exp = DEXP(u.u) - DBIAS;
    if (exp < 0) return 0;
    if (exp > 62) return sign ? (int64_t)(-9223372036854775807LL-1) : (int64_t)9223372036854775807LL;
    uint64_t mant = DMANT(u.u) | (1ULL << 52);
    int64_t val;
    if (exp >= 52) val = (int64_t)(mant << (exp - 52));
    else val = (int64_t)(mant >> (52 - exp));
    return sign ? -val : val;
}

/* unsigned int -> double (already exists as __floatunsidf) */
/* double -> unsigned int */
unsigned int __fixunsdfsi(double a) {
    du u = {a};
    if (DSIGN(u.u)) return 0;
    int exp = DEXP(u.u) - DBIAS;
    if (exp < 0) return 0;
    if (exp > 31) return 0xFFFFFFFFU;
    uint64_t mant = DMANT(u.u) | (1ULL << 52);
    if (exp >= 52) return (unsigned int)(mant << (exp - 52));
    return (unsigned int)(mant >> (52 - exp));
}

/* double -> unsigned int64 */
uint64_t __fixunsdfdi(double a) {
    du u = {a};
    if (DSIGN(u.u)) return 0;
    int exp = DEXP(u.u) - DBIAS;
    if (exp < 0) return 0;
    if (exp > 63) return 0xFFFFFFFFFFFFFFFFULL;
    uint64_t mant = DMANT(u.u) | (1ULL << 52);
    if (exp >= 52) return mant << (exp - 52);
    return mant >> (52 - exp);
}

/* int64 -> double */
double __floatdidf(int64_t a) {
    if (a == 0) { du r = {0}; return r.d; }
    int sign = 0;
    uint64_t ua;
    if (a < 0) { sign = 1; ua = (uint64_t)(-a); } else ua = (uint64_t)a;
    int shift = 0;
    uint64_t tmp = ua;
    while (!(tmp & 0x8000000000000000ULL)) { tmp <<= 1; shift++; }
    int exp = 63 - shift + DBIAS;
    /* We have 64-bit mantissa, need 52 bits */
    uint64_t mant;
    if (shift >= 12) mant = (ua << (shift - 12 + 1)) & 0x000FFFFFFFFFFFFFULL;
    else mant = (ua >> (12 - shift - 1)) & 0x000FFFFFFFFFFFFFULL;
    du r; r.u = PACK_D(sign, exp, mant);
    return r.d;
}

/* uint64 -> double */
double __floatundidf(uint64_t a) {
    if (a == 0) { du r = {0}; return r.d; }
    int shift = 0;
    uint64_t tmp = a;
    while (!(tmp & 0x8000000000000000ULL)) { tmp <<= 1; shift++; }
    int exp = 63 - shift + DBIAS;
    uint64_t mant;
    if (shift >= 12) mant = (a << (shift - 12 + 1)) & 0x000FFFFFFFFFFFFFULL;
    else mant = (a >> (12 - shift - 1)) & 0x000FFFFFFFFFFFFFULL;
    du r; r.u = PACK_D(0, exp, mant);
    return r.d;
}

/* === Single-precision float (IEEE 754 binary32) === */
typedef union { float f; uint32_t u; } fu;

#define FSIGN(x) ((x) >> 31)
#define FEXP(x)  (((x) >> 23) & 0xFF)
#define FMANT(x) ((x) & 0x7FFFFF)
#define FBIAS 127
#define FINF  0x7F800000U
#define PACK_F(s,e,m) (((uint32_t)(s) << 31) | ((uint32_t)(e) << 23) | ((m) & 0x7FFFFF))

/* int -> float */
float __floatsisf(int a) {
    if (a == 0) { fu r; r.u = 0; return r.f; }
    int sign = 0;
    unsigned int ua;
    if (a < 0) { sign = 1; ua = (unsigned int)(-a); } else ua = (unsigned int)a;
    int shift = 0;
    uint32_t tmp = ua;
    while (!(tmp & 0x80000000)) { tmp <<= 1; shift++; }
    int exp = 31 - shift + FBIAS;
    uint32_t mant = (ua << (shift + 1)) >> 9; /* top 23 bits after leading 1 */
    fu r; r.u = PACK_F(sign, exp, mant);
    return r.f;
}

/* unsigned -> float */
float __floatunsisf(unsigned int a) {
    if (a == 0) { fu r; r.u = 0; return r.f; }
    int shift = 0;
    uint32_t tmp = a;
    while (!(tmp & 0x80000000)) { tmp <<= 1; shift++; }
    int exp = 31 - shift + FBIAS;
    uint32_t mant = (a << (shift + 1)) >> 9;
    fu r; r.u = PACK_F(0, exp, mant);
    return r.f;
}

/* float multiply */
float __mulsf3(float a, float b) {
    fu ua = {a}, ub = {b};
    int sa = FSIGN(ua.u), sb = FSIGN(ub.u);
    int ea = FEXP(ua.u), eb = FEXP(ub.u);
    uint32_t ma = FMANT(ua.u), mb = FMANT(ub.u);
    if (ea == 0 && ma == 0) { fu r; r.u = PACK_F(sa ^ sb, 0, 0); return r.f; }
    if (eb == 0 && mb == 0) { fu r; r.u = PACK_F(sa ^ sb, 0, 0); return r.f; }
    if (ea == 0xFF || eb == 0xFF) { fu r; r.u = FINF | ((uint32_t)(sa ^ sb) << 31); return r.f; }
    if (ea != 0) ma |= (1 << 23); else ea = 1;
    if (eb != 0) mb |= (1 << 23); else eb = 1;
    int exp = ea + eb - FBIAS;
    uint64_t p = (uint64_t)ma * mb; /* 24-bit * 24-bit = 48-bit */
    p >>= 23; /* Normalize to 24-bit */
    if (p & (1 << 24)) { p >>= 1; exp++; }
    while (p && !(p & (1 << 23))) { p <<= 1; exp--; }
    if (exp >= 0xFF) { fu r; r.u = FINF | ((uint32_t)(sa ^ sb) << 31); return r.f; }
    if (exp <= 0) { fu r; r.u = PACK_F(sa ^ sb, 0, 0); return r.f; }
    fu r; r.u = PACK_F(sa ^ sb, exp, (uint32_t)p & 0x7FFFFF);
    return r.f;
}

/* double not-equal (returns 0 if equal, nonzero otherwise) */
int __nedf2(double a, double b) { du ua = {a}, ub = {b}; return ua.u != ub.u; }

/* double unordered (NaN check) */
int __unorddf2(double a, double b) {
    du ua = {a}, ub = {b};
    return (DEXP(ua.u) == 0x7FF && DMANT(ua.u)) || (DEXP(ub.u) == 0x7FF && DMANT(ub.u));
}
