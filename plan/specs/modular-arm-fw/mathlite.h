// The few libm functions the kinematics need, in single precision, for a freestanding build (wasm32 here, Cortex-M33 later).
#pragma once
#define PI_F 3.14159265358979f
static inline float m_abs(float x) { return x < 0 ? -x : x; }
static inline float m_sqrt(float x) { return __builtin_sqrtf(x); }
static inline float m_wrap(float x) { // to [-pi, pi]
  float k = (float)(int)(x / (2 * PI_F)); x -= k * 2 * PI_F;
  if (x > PI_F) x -= 2 * PI_F; else if (x < -PI_F) x += 2 * PI_F;
  return x;
}
static inline float m_sin(float x) { // Taylor to x^15 on [-pi/2, pi/2]
  x = m_wrap(x);
  if (x > PI_F / 2) x = PI_F - x; else if (x < -PI_F / 2) x = -PI_F - x;
  float x2 = x * x, t = x, s = x;
  for (int n = 1; n <= 7; n++) { t *= -x2 / ((2 * n) * (2 * n + 1)); s += t; }
  return s;
}
static inline float m_cos(float x) { return m_sin(x + PI_F / 2); }
static inline float m_atan(float x) { // reduce to |x| <= 0.268 (tan 15 deg), then the series
  int neg = x < 0; if (neg) x = -x;
  int inv = x > 1; if (inv) x = 1 / x;
  int sh = x > 0.2679492f; const float t15 = 0.5773503f; // tan 30
  if (sh) x = (x - t15) / (1 + t15 * x);
  float x2 = x * x, t = x, s = x;
  for (int n = 1; n <= 6; n++) { t *= -x2; s += t / (2 * n + 1); }
  if (sh) s += PI_F / 6;
  if (inv) s = PI_F / 2 - s;
  return neg ? -s : s;
}
static inline float m_atan2(float y, float x) {
  if (x > 0) return m_atan(y / x);
  if (x < 0) return y >= 0 ? m_atan(y / x) + PI_F : m_atan(y / x) - PI_F;
  return y > 0 ? PI_F / 2 : y < 0 ? -PI_F / 2 : 0;
}
static inline float m_acos(float x) { if (x > 1) x = 1; if (x < -1) x = -1; return m_atan2(m_sqrt(1 - x * x), x); }
