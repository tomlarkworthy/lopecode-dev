#include "kin.h"
#include "mathlite.h"

static const int PAIR[6] = { 1, 2, 3, 4, 5, 0 };

void xf_id(xf_t *a) { for (int i = 0; i < 3; i++) { for (int j = 0; j < 3; j++) a->R[i][j] = i == j; a->t[i] = 0; } }
void xf_trans(xf_t *a, float x, float y, float z) { xf_id(a); a->t[0] = x; a->t[1] = y; a->t[2] = z; }
void xf_rot(xf_t *a, float rx, float ry, float rz) {
  float cx = m_cos(rx), sx = m_sin(rx), cy = m_cos(ry), sy = m_sin(ry), cz = m_cos(rz), sz = m_sin(rz);
  float R[3][3] = { { cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx },
                    { sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx },
                    { -sy, cy * sx, cy * cx } };
  for (int i = 0; i < 3; i++) { for (int j = 0; j < 3; j++) a->R[i][j] = R[i][j]; a->t[i] = 0; }
}
void xf_apply(const xf_t *a, const float p[3], float o[3]) {
  for (int i = 0; i < 3; i++) o[i] = a->R[i][0] * p[0] + a->R[i][1] * p[1] + a->R[i][2] * p[2] + a->t[i];
}
void xf_mul(xf_t *out, const xf_t *a, const xf_t *b) {
  xf_t r;
  for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) r.R[i][j] = a->R[i][0] * b->R[0][j] + a->R[i][1] * b->R[1][j] + a->R[i][2] * b->R[2][j];
  xf_apply(a, b->t, r.t);
  *out = r;
}

static void anchors(float r, float sep, float rot, float out[6][3]) {
  int n = 0;
  for (int k = 0; k < 3; k++) for (int s = -1; s <= 1; s += 2) {
    float a = rot + k * 2 * PI_F / 3 + s * sep / 2;
    out[n][0] = r * m_cos(a); out[n][1] = r * m_sin(a); out[n][2] = 0; n++;
  }
}

void link_top(const geo_t *g, const pose_t *p, xf_t *top) {
  xf_t T, R; xf_trans(&T, p->x, p->y, g->h + p->z); xf_rot(&R, p->rx, p->ry, p->rz); xf_mul(top, &T, &R);
}

void link_legs(const geo_t *g, const pose_t *p, float a[6][3], float b[6][3]) {
  float B[6][3], P0[6][3]; xf_t top;
  anchors(g->rb, g->sepB, 0, B); anchors(g->rp, g->sepP, PI_F / 3, P0); link_top(g, p, &top);
  for (int i = 0; i < 6; i++) { for (int k = 0; k < 3; k++) a[i][k] = B[PAIR[i]][k]; xf_apply(&top, P0[i], b[i]); }
}

void link_ik(const geo_t *g, const pose_t *p, float L[6]) {
  float a[6][3], b[6][3]; link_legs(g, p, a, b);
  for (int i = 0; i < 6; i++) { float dx = b[i][0] - a[i][0], dy = b[i][1] - a[i][1], dz = b[i][2] - a[i][2]; L[i] = m_sqrt(dx * dx + dy * dy + dz * dz); }
}

int solve(int n, float *A, float *b) {
  for (int i = 0; i < n; i++) {
    int p = i; for (int k = i + 1; k < n; k++) if (m_abs(A[k * n + i]) > m_abs(A[p * n + i])) p = k;
    if (m_abs(A[p * n + i]) < 1e-12f) return 1;
    if (p != i) { for (int j = 0; j < n; j++) { float t = A[i * n + j]; A[i * n + j] = A[p * n + j]; A[p * n + j] = t; } float t = b[i]; b[i] = b[p]; b[p] = t; }
    for (int k = i + 1; k < n; k++) { float f = A[k * n + i] / A[i * n + i]; for (int j = i; j < n; j++) A[k * n + j] -= f * A[i * n + j]; b[k] -= f * b[i]; }
  }
  for (int i = n - 1; i >= 0; i--) { float s = b[i]; for (int j = i + 1; j < n; j++) s -= A[i * n + j] * b[j]; b[i] = s / A[i * n + i]; }
  return 0;
}

int link_fk(const geo_t *g, const float L[6], pose_t *p) {
  float *q = &p->x;  // pose_t is six floats in order
  for (int it = 0; it < 20; it++) {
    float L0[6], A[36], r[6], worst = 0;
    link_ik(g, p, L0);
    for (int i = 0; i < 6; i++) { r[i] = L[i] - L0[i]; if (m_abs(r[i]) > worst) worst = m_abs(r[i]); }
    if (worst < 2e-4f) return 0;
    for (int j = 0; j < 6; j++) {
      float h = j < 3 ? 1e-2f : 1e-4f, keep = q[j], L1[6]; q[j] = keep + h; link_ik(g, p, L1); q[j] = keep;
      for (int i = 0; i < 6; i++) A[i * 6 + j] = (L1[i] - L0[i]) / h;
    }
    if (solve(6, A, r)) return 2;
    for (int j = 0; j < 6; j++) q[j] += r[j];
  }
  return 1;
}

int link_ok(const geo_t *g, const pose_t *p) {
  float a[6][3], b[6][3]; xf_t top; link_legs(g, p, a, b); link_top(g, p, &top);
  float n[3] = { top.R[0][2], top.R[1][2], top.R[2][2] }, cc = m_cos(g->cone);
  for (int i = 0; i < 6; i++) {
    float d[3] = { b[i][0] - a[i][0], b[i][1] - a[i][1], b[i][2] - a[i][2] }, L = m_sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    if (L < g->Lmin - 0.01f || L > g->Lmax + 0.01f) return 0;   // float rounding at the stops
    if (d[2] / L < cc) return 0;                                   // base joint cone
    if ((d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / L < cc) return 0; // top joint cone
  }
  return 1;
}
