/* Minimal soft-float and 64-bit integer routines for rv32ima/ilp32
 * These are normally provided by libgcc/compiler-rt but we need
 * them compiled for the correct ABI.
 *
 * Implementations use integer arithmetic only — safe for soft-float targets.
 */

typedef unsigned int uint32_t;
typedef int int32_t;
typedef unsigned long long uint64_t;
typedef long long int64_t;

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
    /* Multiply mantissas: 53-bit * 53-bit */
    /* Split into 32-bit halves to avoid 64-bit overflow */
    uint32_t ah = ma >> 21, al = ma & 0x1FFFFF;
    uint32_t bh = mb >> 21, bl = mb & 0x1FFFFF;
    uint64_t p = (uint64_t)ah * bh;
    uint64_t mid = (uint64_t)ah * bl + (uint64_t)al * bh;
    /* We only need the top ~54 bits of the 106-bit product */
    p += (mid >> 21);

    /* Normalize */
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

/* Comparisons: return <0 if a<b, 0 if a==b, >0 if a>b */
int __gedf2(double a, double b) { return __adddf3(a, -b) >= 0.0 ? 0 : -1; }
int __ledf2(double a, double b) { return __adddf3(a, -b) <= 0.0 ? 0 : 1; }
int __ltdf2(double a, double b) { return __adddf3(a, -b) < 0.0 ? -1 : 0; }
int __gtdf2(double a, double b) { return __adddf3(a, -b) > 0.0 ? 1 : 0; }
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

/* long double (quad) multiply stub — musl needs this */
/* On rv32 ilp32, long double is 128-bit (quad precision) */
/* Provide a minimal stub that converts through double */
typedef struct { uint64_t lo; uint64_t hi; } ldbl;

/* These are stubs — full quad precision isn't needed for busybox */
/* Just enough to link; the functions that use them rarely execute */
long double __multf3(long double a, long double b) {
    return (long double)((double)a * (double)b);
}

long double __addtf3(long double a, long double b) {
    return (long double)((double)a + (double)b);
}

long double __subtf3(long double a, long double b) {
    return (long double)((double)a - (double)b);
}

long double __divtf3(long double a, long double b) {
    return (long double)((double)a / (double)b);
}

int __getf2(long double a, long double b) { return (a >= b) ? 0 : -1; }
int __letf2(long double a, long double b) { return (a <= b) ? 0 : 1; }
int __lttf2(long double a, long double b) { return (a < b) ? -1 : 0; }
int __eqtf2(long double a, long double b) { return (a == b) ? 0 : 1; }
int __netf2(long double a, long double b) { return (a != b) ? 1 : 0; }
int __unordtf2(long double a, long double b) { return 0; }

long double __floatsitf(int a) { return (long double)a; }
long double __floatunsitf(unsigned int a) { return (long double)a; }
int __fixtfsi(long double a) { return (int)a; }
unsigned int __fixunstfsi(long double a) { return (unsigned int)a; }
long double __extendsftf2(float a) { return (long double)a; }
long double __extenddftf2(double a) { return (long double)a; }
float __trunctfsf2(long double a) { return (float)a; }
double __trunctfdf2(long double a) { return (double)a; }

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
    /* Shift dividend left to get more precision */
    uint64_t q = 0;
    ma <<= 10; /* Use top bits for precision */
    for (int i = 62; i >= 0; i--) {
        if (ma >= mb) { ma -= mb; q |= (1ULL << i); }
        ma <<= 1;
    }
    /* q has ~63 bits of precision, we need 53 */
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

/* === 64-bit shifts === */
int64_t __ashldi3(int64_t a, int b) { return (uint64_t)a << b; }
int64_t __ashrdi3(int64_t a, int b) { return a >> b; }
uint64_t __lshrdi3(uint64_t a, int b) { return a >> b; }

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
