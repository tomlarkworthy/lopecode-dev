// Link board: six struts, homed against the retracted stop, following setpoints streamed by the arm controller.
#include "hal.h"
#include "proto.h"
#define EXPORT __attribute__((visibility("default")))

enum { S_UNHOMED, S_IDLE, S_FOLLOW, S_HOMING, S_FAULT };
enum { F_NONE, F_STALL, F_HOME_TIMEOUT };
enum { LOG_HOMED = 1, LOG_FAULT, LOG_BOOT_RESTORED, LOG_BOOT_UNHOMED, LOG_FRAME };
enum { P_ADDR, P_HOME_MA, P_MOVE_MA, P_MAX_DUTY, P_MIN_DUTY, P_STALL_MS, P_HOME_TIMEOUT_MS, P_DEADBAND, P_N };
static int32_t P[P_N];
static float KP = 2.0f, KFF = 0.13f;   // permille per count of error; permille per count/s

typedef struct {
  uint8_t state, fault, homed;
  int32_t zero, last_count;
  float   target, vel;                 // counts from the stop, counts/s
  uint32_t last_change_us, started_us;
} strut_t;
static strut_t S[NSTRUT];
static rx_t rx;
static uint8_t boot_mask;
static uint32_t last_tick_us;

#define MAGIC 0x41524d32u  // "ARM2"
typedef struct { uint32_t magic; int32_t pos[NSTRUT]; uint32_t sum; } saved_t;
static uint32_t checksum(const saved_t *s) {
  uint32_t h = 2166136261u; const uint8_t *p = (const uint8_t *)s;
  for (uint32_t i = 0; i < sizeof(saved_t) - 4; i++) h = (h ^ p[i]) * 16777619u;
  return h;
}
static int valid(int32_t ch) { return (uint32_t)ch < NSTRUT; }

EXPORT void fw_init(void) {
  P[P_ADDR] = 1; P[P_HOME_MA] = 420; P[P_MOVE_MA] = 1500; P[P_MAX_DUTY] = 840; P[P_MIN_DUTY] = 250;
  P[P_STALL_MS] = 20; P[P_HOME_TIMEOUT_MS] = 30000; P[P_DEADBAND] = 2;
  for (int i = 0; i < NSTRUT; i++) { S[i] = (strut_t){ .state = S_UNHOMED }; hal_drive(i, 0); }
  rx.n = 0; boot_mask = 0; last_tick_us = hal_now_us();
}
EXPORT void    fw_set(int32_t p, int32_t v) { if ((uint32_t)p < P_N) P[p] = v; }
EXPORT int32_t fw_get(int32_t p) { return (uint32_t)p < P_N ? P[p] : 0; }
EXPORT int32_t fw_state(int32_t ch) { return valid(ch) ? S[ch].state : -1; }
EXPORT int32_t fw_fault(int32_t ch) { return valid(ch) ? S[ch].fault : -1; }
EXPORT int32_t fw_pos(int32_t ch) { return valid(ch) ? hal_encoder(ch) - S[ch].zero : 0; }

static void stop(int ch, uint8_t state, uint8_t fault) {
  hal_drive(ch, 0); S[ch].state = state; S[ch].fault = fault;
  if (fault) hal_log(LOG_FAULT, ch, fault);
}
static void start(int ch, uint8_t state, int32_t ma) {
  uint32_t now = hal_now_us();
  S[ch].state = state; S[ch].fault = F_NONE; S[ch].last_count = hal_encoder(ch);
  S[ch].last_change_us = S[ch].started_us = now; hal_current_limit(ch, ma);
}
EXPORT void fw_home(int32_t mask) {
  for (int i = 0; i < NSTRUT; i++) if (mask & (1 << i)) { S[i].homed = 0; start(i, S_HOMING, P[P_HOME_MA]); }
}
// a setpoint: hold pos, moving at vel, until the next one
EXPORT void fw_follow(int32_t ch, int32_t pos, int32_t vel) {
  if (!valid(ch)) return;
  strut_t *s = &S[ch];
  if (s->state != S_IDLE && s->state != S_FOLLOW) return;   // never move an unhomed or faulted strut
  s->target = (float)pos; s->vel = (float)vel;
  if (s->state != S_FOLLOW) start(ch, S_FOLLOW, P[P_MOVE_MA]);
}

EXPORT void fw_shutdown(void) {
  saved_t sv = { .magic = MAGIC };
  for (int i = 0; i < NSTRUT; i++) { hal_drive(i, 0); sv.pos[i] = S[i].homed ? fw_pos(i) : INT32_MIN; }
  sv.sum = checksum(&sv);
  hal_flash_write(0, (const uint8_t *)&sv, sizeof sv);
}
// restores the struts saved at a clean shutdown, then invalidates the record so a later power loss cannot reuse it
EXPORT int32_t fw_boot(void) {
  fw_init();
  saved_t sv; hal_flash_read(0, (uint8_t *)&sv, sizeof sv);
  if (sv.magic != MAGIC || sv.sum != checksum(&sv)) { hal_log(LOG_BOOT_UNHOMED, 0, 0); return 0; }
  for (int i = 0; i < NSTRUT; i++) if (sv.pos[i] != INT32_MIN) {
    S[i].zero = hal_encoder(i) - sv.pos[i]; S[i].state = S_IDLE; S[i].homed = 1; boot_mask |= 1 << i;
  }
  uint32_t dead = 0; hal_flash_write(0, (const uint8_t *)&dead, 4);
  hal_log(LOG_BOOT_RESTORED, boot_mask, 0);
  return boot_mask;
}

static void reply(void) {
  st_t st; uint8_t homed = 0; uint8_t out[FR_MAX + 6];
  for (int i = 0; i < NSTRUT; i++) { st.pos[i] = fw_pos(i); st.state[i] = S[i].state; st.fault[i] = S[i].fault; homed |= S[i].homed << i; }
  hal_imu_accel(st.acc); st.boot_mask = boot_mask; st.homed_mask = homed;
  hal_bus_tx(out, fr_encode(out, (uint8_t)P[P_ADDR], C_REPLY, &st, sizeof st));
}
static void handle(const uint8_t *f) {
  if (f[1] != (uint8_t)P[P_ADDR]) return;
  const uint8_t *pl = f + 4;
  if (f[2] == C_SETPOINT && f[3] == sizeof(sp_t)) {
    sp_t sp; for (unsigned i = 0; i < sizeof sp; i++) ((uint8_t *)&sp)[i] = pl[i];
    for (int i = 0; i < NSTRUT; i++) fw_follow(i, sp.pos[i], sp.vel[i]);
  } else if (f[2] == C_HOME && f[3] == 1) fw_home(pl[0]);
  else if (f[2] == C_SHUTDOWN) fw_shutdown();
  reply();
}

EXPORT void fw_tick(void) {
  uint8_t in[FR_MAX + 6]; int n = hal_bus_rx(in, sizeof in);
  for (int k = 0; k < n; k++) if (fr_feed(&rx, in[k])) handle(rx.buf);
  uint32_t now = hal_now_us(), stall_us = (uint32_t)P[P_STALL_MS] * 1000u;
  float dt = (now - last_tick_us) * 1e-6f; last_tick_us = now;
  for (int i = 0; i < NSTRUT; i++) {
    strut_t *s = &S[i];
    int32_t c = hal_encoder(i);
    if (c != s->last_count) { s->last_count = c; s->last_change_us = now; }
    int stalled = now - s->last_change_us >= stall_us;
    if (s->state == S_HOMING) {
      hal_drive(i, -P[P_MAX_DUTY]);
      if (stalled) { s->zero = c; s->homed = 1; stop(i, S_IDLE, F_NONE); hal_log(LOG_HOMED, i, c); }
      else if (now - s->started_us >= (uint32_t)P[P_HOME_TIMEOUT_MS] * 1000u) stop(i, S_FAULT, F_HOME_TIMEOUT);
    } else if (s->state == S_FOLLOW) {
      s->target += s->vel * dt;
      float err = s->target - (float)(c - s->zero);
      float duty = KFF * s->vel + KP * err, lim = (float)P[P_MAX_DUTY], mn = (float)P[P_MIN_DUTY];
      if (duty > lim) duty = lim; if (duty < -lim) duty = -lim;
      if (err > -P[P_DEADBAND] && err < P[P_DEADBAND] && s->vel == 0) { hal_drive(i, 0); s->last_change_us = now; continue; }
      if (duty > -mn && duty < mn) duty = duty < 0 ? -mn : mn;
      hal_drive(i, (int32_t)duty);
      if (stalled && (err > 50 || err < -50)) stop(i, S_FAULT, F_STALL);   // commanded and not moving: collision, a jam, or a load over the limit
    }
  }
}
