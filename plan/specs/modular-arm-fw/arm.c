// Arm controller: bus master over the links. Knows the layout, checks stored counts against the IMUs at power-up,
// solves the stack's inverse kinematics for a tool pose, and streams strut setpoints along a straight tool path.
#include "hal.h"
#include "proto.h"
#include "kin.h"
#include "mathlite.h"
#define EXPORT __attribute__((visibility("default")))
#define MAXMOD 8
#define MAXLINK 3
#define NQ (6 * MAXLINK)

enum { M_CUBE, M_LINK, M_TOOL };
enum { A_BOOT, A_CHECK, A_HOMING, A_READY, A_MOVING, A_FAULT, A_SETTLING };
enum { E_NONE, E_LINK_FAULT, E_TILT_AFTER_HOME, E_IK, E_BUS, E_SETTLE };
enum { LOG_TILT = 20, LOG_HOME_LINK, LOG_IK_FAIL, LOG_BUS_TIMEOUT, LOG_ARRIVED, LOG_STATE };

typedef struct { int type, arg; float len; } mod_t;
static mod_t M[MAXMOD]; static int nm, nl;
static geo_t G; static float joinH, cubeBelow, cubeAbove, cpm, tiltTolDeg = 1.5f, vmax = 4.0f;   // mm/s a strut is planned to; under load it does less
static uint32_t settle_us;
static xf_t base;

typedef struct { st_t st; int fresh; pose_t pose; float L[6]; } linkview_t;
static linkview_t V[MAXLINK];
static int state, err, cur, waiting, homing_link = -1, home_attempted[MAXLINK], home_cmd_pending, home_acked;
static uint32_t sent_us, last_slot_us;
static rx_t rx;
static float out[64];
EXPORT float *arm_q(void);   // read by the host page: tip xyz, axis xyz, link poses ...

// plan: tool tip p0 -> p1, axis a0 -> a1, over T seconds
static float p0[3], p1[3], a0[3], a1[3], Tplan, tplan; static uint32_t t0_us;
static float q[NQ], q_nom[NQ];
static int32_t sp_pos[MAXLINK][6], sp_vel[MAXLINK][6];

EXPORT float *arm_out(void) { return out; }
EXPORT int32_t arm_state(void) { return state; }
EXPORT int32_t arm_error(void) { return err; }
EXPORT void arm_geo(float rb, float rp, float sepB, float sepP, float h, float Lmin, float Lmax, float cone, float baseOff, float topOff) {
  G = (geo_t){ rb, rp, sepB, sepP, h, Lmin, Lmax, cone, baseOff, topOff };
}
EXPORT void arm_join(float jh, float below, float above, float counts_per_mm) { joinH = jh; cubeBelow = below; cubeAbove = above; cpm = counts_per_mm; }
EXPORT void arm_base(float x, float y, float z, float rx, float ry, float rz) { xf_t T, R; xf_trans(&T, x, y, z); xf_rot(&R, rx, ry, rz); xf_mul(&base, &T, &R); }
EXPORT void arm_module(int32_t type, int32_t arg, float len) { if (nm < MAXMOD) { M[nm++] = (mod_t){ type, arg, len }; if (type == M_LINK) nl++; } }
EXPORT void arm_init(void) { nm = nl = 0; state = A_BOOT; err = E_NONE; cur = 0; waiting = 0; rx.n = 0; xf_id(&base); for (int i = 0; i < MAXLINK; i++) home_attempted[i] = 0; }

// stack forward kinematics from link poses; frames[k] = each link's top plate (IMU frame); returns the tool frame at the tip
static void stack_fk(const pose_t *poses, xf_t *tool, xf_t *tops, xf_t *joints) {
  xf_t F = base, T; int li = 0;
  for (int k = 0; k < nm; k++) {
    if (k > 0 && joinH != 0) { xf_trans(&T, 0, 0, joinH); xf_mul(&F, &F, &T); }
    if (M[k].type == M_CUBE) {
      xf_t c, turn; xf_trans(&T, 0, 0, cubeBelow); xf_mul(&c, &F, &T);
      const float d = PI_F / 2;
      switch (M[k].arg) { case 1: xf_rot(&turn, 0, d, 0); break; case 2: xf_rot(&turn, 0, -d, 0); break; case 3: xf_rot(&turn, -d, 0, 0); break; case 4: xf_rot(&turn, d, 0, 0); break; default: xf_id(&turn); }
      xf_mul(&c, &c, &turn); xf_trans(&T, 0, 0, cubeAbove); xf_mul(&F, &c, &T);
    } else if (M[k].type == M_LINK) {
      xf_t J, top; xf_trans(&T, 0, 0, G.baseOff); xf_mul(&J, &F, &T);
      if (joints) joints[li] = J;
      link_top(&G, &poses[li], &top); xf_mul(&J, &J, &top);
      if (tops) tops[li] = J;
      xf_trans(&T, 0, 0, G.topOff); xf_mul(&F, &J, &T); li++;
    } else { xf_trans(&T, 0, 0, M[k].len); xf_mul(&F, &F, &T); }
  }
  *tool = F;
}
static void tip_of(const float *qq, float tip[3], float axis[3]) {
  pose_t ps[MAXLINK]; xf_t tool;
  for (int l = 0; l < nl; l++) ps[l] = (pose_t){ qq[6 * l], qq[6 * l + 1], qq[6 * l + 2], qq[6 * l + 3] / 100, qq[6 * l + 4] / 100, qq[6 * l + 5] / 100 };
  stack_fk(ps, &tool, 0, 0);
  for (int i = 0; i < 3; i++) { tip[i] = tool.t[i]; axis[i] = tool.R[i][2]; }
}
static int q_ok(const float *qq) {
  for (int l = 0; l < nl; l++) { pose_t p = { qq[6 * l], qq[6 * l + 1], qq[6 * l + 2], qq[6 * l + 3] / 100, qq[6 * l + 4] / 100, qq[6 * l + 5] / 100 }; if (!link_ok(&G, &p)) return 0; }
  return 1;
}
// damped least squares on all link poses (rotations scaled x100); a pull toward mid-stroke acts only in the null space,
// so it never fights the tool target
static int ik(const float tgt[3], const float ax[3]) {
  int n = 6 * nl; float J[6][NQ];
  for (int it = 0; it < 15; it++) {
    float tip[3], axis[3], e[6]; tip_of(q, tip, axis);
    for (int i = 0; i < 3; i++) e[i] = tgt[i] - tip[i];
    e[3] = 100 * (axis[1] * ax[2] - axis[2] * ax[1]); e[4] = 100 * (axis[2] * ax[0] - axis[0] * ax[2]); e[5] = 100 * (axis[0] * ax[1] - axis[1] * ax[0]);
    float worst = 0; for (int i = 0; i < 6; i++) if (m_abs(e[i]) > worst) worst = m_abs(e[i]);
    if (it < 15) out[48 + it] = worst; out[63] = (float)it;   // solver trace, read by the page
    if (worst < 0.005f && it > 0) return q_ok(q) ? 0 : 2;
    for (int j = 0; j < n; j++) {
      float keep = q[j], t1[3], x1[3]; q[j] = keep + 0.01f; tip_of(q, t1, x1); q[j] = keep;
      for (int i = 0; i < 3; i++) J[i][j] = (t1[i] - tip[i]) / 0.01f;
      float e1[3] = { 100 * (x1[1] * ax[2] - x1[2] * ax[1]), 100 * (x1[2] * ax[0] - x1[0] * ax[2]), 100 * (x1[0] * ax[1] - x1[1] * ax[0]) };
      for (int i = 0; i < 3; i++) J[3 + i][j] = -(e1[i] - e[3 + i]) / 0.01f;   // e = target - f(q), so J = -de/dq
    }
    // JJt + lambda, solved for the task step and for the part of the pull the task would see
    float A[36], A2[36], y[6], z[NQ], Jz[6];
    for (int a = 0; a < 6; a++) for (int b = 0; b < 6; b++) { float t = 0; for (int k = 0; k < n; k++) t += J[a][k] * J[b][k]; A[a * 6 + b] = t + (a == b ? 0.05f : 0); }
    for (int k = 0; k < 36; k++) A2[k] = A[k] - (k % 7 == 0 ? 0.05f - 1e-3f : 0);   // near-exact projection, or the pull leaks into the tool pose
    for (int a = 0; a < 6; a++) y[a] = e[a];
    if (solve(6, A, y)) return 3;
    for (int k = 0; k < n; k++) z[k] = 0.05f * (q_nom[k] - q[k]);
    for (int a = 0; a < 6; a++) { float t = 0; for (int k = 0; k < n; k++) t += J[a][k] * z[k]; Jz[a] = t; }
    if (solve(6, A2, Jz)) return 3;
    for (int k = 0; k < n; k++) { float d1 = 0, d2 = 0; for (int a = 0; a < 6; a++) { d1 += J[a][k] * y[a]; d2 += J[a][k] * Jz[a]; } q[k] += d1 + z[k] - d2; }
  }
  return 1;
}

static void send(int l, uint8_t cmd, const void *pl, uint8_t len) {
  uint8_t o[FR_MAX + 6]; hal_bus_tx(o, fr_encode(o, (uint8_t)(l + 1), cmd, pl, len)); waiting = 1; sent_us = hal_now_us();
}
static void poll_next(void) {
  int l = cur;
  if (state == A_MOVING || state == A_READY || state == A_SETTLING) {
    sp_t sp; for (int i = 0; i < 6; i++) { sp.pos[i] = sp_pos[l][i]; sp.vel[i] = (int16_t)sp_vel[l][i]; }
    if (state != A_MOVING) for (int i = 0; i < 6; i++) sp.vel[i] = 0;
    send(l, C_SETPOINT, &sp, sizeof sp);
  } else if (state == A_HOMING && homing_link == l && !home_attempted[l]) { uint8_t m = 63; home_attempted[l] = 1; home_cmd_pending = 1; home_acked = 0; send(l, C_HOME, &m, 1); }
  else send(l, C_STATUS, 0, 0);
}
static void on_reply(const uint8_t *f) {
  int l = f[1] - 1; if (l < 0 || l >= nl || f[3] != sizeof(st_t)) return;
  for (unsigned i = 0; i < sizeof(st_t); i++) ((uint8_t *)&V[l].st)[i] = f[4 + i];
  V[l].fresh = 1;
  if (home_cmd_pending && l == homing_link) { home_cmd_pending = 0; home_acked = 1; }   // the reply to the home command itself
  for (int i = 0; i < 6; i++) V[l].L[i] = G.Lmin + V[l].st.pos[i] / cpm;
  // an unhomed strut's count means nothing; a bad pose must not become the next solve's starting guess
  if (V[l].st.homed_mask != 63 || link_fk(&G, V[l].L, &V[l].pose)) { pose_t z = { 0, 0, 0, 0, 0, 0 }; V[l].pose = z; if (V[l].st.homed_mask == 63) link_fk(&G, V[l].L, &V[l].pose); }
}

// angle between this link's IMU and the gravity its own counts predict, given the IMU of the link below (the base, for link 1).
// Uses no other link's counts, so a link can be checked, and homed, alone.
static float tilt_error_deg(int l) {
  pose_t zero[MAXLINK]; xf_t tool, tops[MAXLINK], Js[MAXLINK], rel;
  for (int k = 0; k < nl; k++) zero[k] = (pose_t){ 0, 0, 0, 0, 0, 0 };
  stack_fk(zero, &tool, tops, Js);           // the frames between links are fixed, so any poses give them
  float v[3], u[3];
  if (l == 0) for (int i = 0; i < 3; i++) v[i] = Js[0].R[2][i];   // world up, in link 1's base frame
  else {
    float m[3] = { V[l - 1].st.acc[0], V[l - 1].st.acc[1], V[l - 1].st.acc[2] };
    for (int i = 0; i < 3; i++) { float w = 0; for (int k = 0; k < 3; k++) w += tops[l - 1].R[i][k] * m[k]; u[i] = w; }   // to world, at zero poses
    for (int i = 0; i < 3; i++) { float w = 0; for (int k = 0; k < 3; k++) w += Js[l].R[k][i] * u[k]; v[i] = w; }        // to link l's base frame
  }
  link_top(&G, &V[l].pose, &rel);
  float g[3]; for (int i = 0; i < 3; i++) { float w = 0; for (int k = 0; k < 3; k++) w += rel.R[k][i] * v[k]; g[i] = w; }   // into its top plate
  float a[3] = { V[l].st.acc[0], V[l].st.acc[1], V[l].st.acc[2] };
  float c = (g[0] * a[0] + g[1] * a[1] + g[2] * a[2]) / (m_sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) * m_sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]));
  return m_acos(c) * 180 / PI_F;
}
static void links_to_q(void) { for (int l = 0; l < nl; l++) { float *p = &V[l].pose.x; for (int k = 0; k < 6; k++) q[6 * l + k] = k < 3 ? p[k] : p[k] * 100; } }
static void q_to_setpoints(const float *qq, int32_t pos[MAXLINK][6]) {
  for (int l = 0; l < nl; l++) {
    pose_t p = { qq[6 * l], qq[6 * l + 1], qq[6 * l + 2], qq[6 * l + 3] / 100, qq[6 * l + 4] / 100, qq[6 * l + 5] / 100 }; float L[6];
    link_ik(&G, &p, L); for (int i = 0; i < 6; i++) pos[l][i] = (int32_t)((L[i] - G.Lmin) * cpm + 0.5f);
  }
}

// boot: poll every link once, then check tilt; home the highest mismatched link alone; recheck
static void supervise(void) {
  int all = 1; for (int l = 0; l < nl; l++) all &= V[l].fresh;
  if (!all) return;
  for (int l = 0; l < nl; l++) for (int i = 0; i < 6; i++) if (V[l].st.state[i] == 4) { state = A_FAULT; err = E_LINK_FAULT; hal_log(LOG_STATE, state, l); return; }
  if (state == A_HOMING) {
    if (!home_acked) return;                                                     // a reply from before the command says nothing
    for (int i = 0; i < 6; i++) if (V[homing_link].st.state[i] == 3) return;   // still homing
    state = A_CHECK;
  }
  if (state == A_BOOT || state == A_CHECK) {
    for (int l = nl - 1; l >= 0; l--) {
      float e = V[l].st.homed_mask == 63 ? tilt_error_deg(l) : 180;
      out[40 + l] = e;
      if (e > tiltTolDeg) {
        if (home_attempted[l]) { state = A_FAULT; err = E_TILT_AFTER_HOME; hal_log(LOG_TILT, l, (int32_t)(e * 100)); return; }
        homing_link = l; state = A_HOMING; hal_log(LOG_HOME_LINK, l, (int32_t)(e * 100)); return;
      }
    }
    links_to_q(); for (int j = 0; j < NQ; j++) q_nom[j] = 0;   // the solver leans toward mid-stroke, not toward the stops
    q_to_setpoints(q, sp_pos); for (int l = 0; l < nl; l++) for (int i = 0; i < 6; i++) sp_vel[l][i] = 0;
    state = A_READY; hal_log(LOG_STATE, state, 0);
  }
}

EXPORT int32_t arm_goto(float x, float y, float z, float ax, float ay, float az, float seconds) {
  if (state != A_READY) return 1;
  float tip[3], axis[3]; links_to_q(); tip_of(q, tip, axis);
  float n = m_sqrt(ax * ax + ay * ay + az * az);
  for (int i = 0; i < 3; i++) { p0[i] = tip[i]; a0[i] = axis[i]; }
  p1[0] = x; p1[1] = y; p1[2] = z; a1[0] = ax / n; a1[1] = ay / n; a1[2] = az / n;
  // the slowest strut sets the duration: sample the path, take the steepest strut length per unit of path, x 1.5 for the smoothstep peak
  float keep[NQ], Lp[MAXLINK][6], steep = 0; for (int j = 0; j < NQ; j++) keep[j] = q[j];
  for (int k = 0; k <= 8; k++) {
    float s = k / 8.0f, tg[3], ag[3], an = 0, Lk[MAXLINK][6];
    for (int i = 0; i < 3; i++) { tg[i] = p0[i] + (p1[i] - p0[i]) * s; ag[i] = a0[i] + (a1[i] - a0[i]) * s; an += ag[i] * ag[i]; }
    an = m_sqrt(an); for (int i = 0; i < 3; i++) ag[i] /= an;
    if (ik(tg, ag)) { for (int j = 0; j < NQ; j++) q[j] = keep[j]; state = A_READY; err = E_IK; hal_log(LOG_IK_FAIL, 9, k); return 2; }
    for (int l = 0; l < nl; l++) { pose_t pp = { q[6 * l], q[6 * l + 1], q[6 * l + 2], q[6 * l + 3] / 100, q[6 * l + 4] / 100, q[6 * l + 5] / 100 }; link_ik(&G, &pp, Lk[l]); }
    if (k) for (int l = 0; l < nl; l++) for (int i = 0; i < 6; i++) { float d = m_abs(Lk[l][i] - Lp[l][i]) * 8; if (d > steep) steep = d; }
    for (int l = 0; l < nl; l++) for (int i = 0; i < 6; i++) Lp[l][i] = Lk[l][i];
  }
  for (int j = 0; j < NQ; j++) q[j] = keep[j];
  float need = 1.5f * steep / vmax;
  Tplan = seconds > need ? seconds : need; tplan = 0; t0_us = hal_now_us(); last_slot_us = t0_us - 10000; state = A_MOVING; err = E_NONE;
  return 0;
}
EXPORT void arm_grip(int32_t on) { hal_grip(on); }
EXPORT void arm_vmax(float mm_per_s) { vmax = mm_per_s; }
EXPORT float arm_planned_s(void) { return Tplan; }

// every 10 ms while moving: the next sample of the path, solved, as positions plus the velocity to the one after
static void plan_slot(uint32_t now) {
  if (now - last_slot_us < 10000) return;
  last_slot_us = now;
  float s0 = (now - t0_us) * 1e-6f / Tplan, s1 = s0 + 0.01f / Tplan;
  float sm0 = s0 >= 1 ? 1 : s0 * s0 * (3 - 2 * s0), sm1 = s1 >= 1 ? 1 : s1 * s1 * (3 - 2 * s1);   // smoothstep
  float tgt[3], ax[3], nq0[NQ]; int32_t pa[MAXLINK][6], pb[MAXLINK][6];
  for (int pass = 0; pass < 2; pass++) {
    float sm = pass ? sm1 : sm0, an = 0;
    for (int i = 0; i < 3; i++) { tgt[i] = p0[i] + (p1[i] - p0[i]) * sm; ax[i] = a0[i] + (a1[i] - a0[i]) * sm; an += ax[i] * ax[i]; }
    an = m_sqrt(an); for (int i = 0; i < 3; i++) ax[i] /= an;
    int r = ik(tgt, ax);
    if (r) { state = A_FAULT; err = E_IK; hal_log(LOG_IK_FAIL, r, (int32_t)(sm * 1000)); return; }
    q_to_setpoints(q, pass ? pb : pa);
    if (!pass) for (int j = 0; j < NQ; j++) nq0[j] = q[j];
  }
  for (int j = 0; j < NQ; j++) q[j] = nq0[j];
  for (int l = 0; l < nl; l++) for (int i = 0; i < 6; i++) { sp_pos[l][i] = pa[l][i]; sp_vel[l][i] = (int32_t)((pb[l][i] - pa[l][i]) / 0.01f); }
  if (s0 >= 1) { for (int l = 0; l < nl; l++) for (int i = 0; i < 6; i++) sp_vel[l][i] = 0; state = A_SETTLING; settle_us = now; }
}

EXPORT void arm_tick(void) {
  uint32_t now = hal_now_us();
  uint8_t in[FR_MAX + 6]; int n = hal_bus_rx(in, sizeof in);
  for (int k = 0; k < n; k++) if (fr_feed(&rx, in[k]) && rx.buf[2] == C_REPLY) { on_reply(rx.buf); waiting = 0; cur = (cur + 1) % nl; }
  if (waiting && now - sent_us > 3000) { hal_log(LOG_BUS_TIMEOUT, cur, 0); waiting = 0; cur = (cur + 1) % nl; }
  if (state != A_FAULT) {
    if (state == A_MOVING) plan_slot(now);
    if (state == A_SETTLING) {   // arrived when every strut reports within 3 counts of its last setpoint
      int done = 1; for (int l = 0; l < nl; l++) for (int i = 0; i < 6; i++) { int32_t d = V[l].st.pos[i] - sp_pos[l][i]; if (d > 3 || d < -3) done = 0; }
      if (done) { state = A_READY; hal_log(LOG_ARRIVED, (int32_t)((now - t0_us) / 1000), 0); }
      else if (now - settle_us > 3000000) { state = A_FAULT; err = E_SETTLE; hal_log(LOG_STATE, state, err); }
    }
    if (state != A_MOVING && state != A_SETTLING && state != A_FAULT) supervise();
    if (!waiting && nl) poll_next();
  }
  float tip[3], axis[3], qm[NQ];   // the measured tip, without touching q (the solver's warm start)
  for (int l = 0; l < nl; l++) { float *p = &V[l].pose.x; for (int k = 0; k < 6; k++) qm[6 * l + k] = k < 3 ? p[k] : p[k] * 100; }
  tip_of(qm, tip, axis);
  for (int i = 0; i < 3; i++) { out[i] = tip[i]; out[3 + i] = axis[i]; }
  for (int l = 0; l < nl; l++) { float *p = &V[l].pose.x; for (int k = 0; k < 6; k++) out[6 + 6 * l + k] = p[k]; }
}

// test hooks: solve from the current q without moving anything
EXPORT int32_t arm_ik_test(float x, float y, float z, float ax, float ay, float az) { float t[3] = { x, y, z }, a[3] = { ax, ay, az }; links_to_q(); return ik(t, a); }
EXPORT float *arm_q(void) { return q; }
