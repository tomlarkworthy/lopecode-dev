#include "proto.h"
uint16_t crc16(const uint8_t *p, int n) {
  uint16_t c = 0xFFFF;
  for (int i = 0; i < n; i++) { c ^= (uint16_t)p[i] << 8; for (int k = 0; k < 8; k++) c = c & 0x8000 ? (uint16_t)((c << 1) ^ 0x1021) : (uint16_t)(c << 1); }
  return c;
}
int fr_encode(uint8_t *o, uint8_t addr, uint8_t cmd, const void *payload, uint8_t len) {
  o[0] = FR_SYNC; o[1] = addr; o[2] = cmd; o[3] = len;
  for (int i = 0; i < len; i++) o[4 + i] = ((const uint8_t *)payload)[i];
  uint16_t c = crc16(o + 1, 3 + len); o[4 + len] = (uint8_t)c; o[5 + len] = (uint8_t)(c >> 8);
  return 6 + len;
}
int fr_feed(rx_t *r, uint8_t b) {
  if (r->n == 0 && b != FR_SYNC) return 0;
  r->buf[r->n++] = b;
  if (r->n >= 4 && r->buf[3] > FR_MAX) { r->n = 0; return 0; }
  if (r->n >= 4 && r->n == 6 + r->buf[3]) {
    int len = r->buf[3]; uint16_t c = crc16(r->buf + 1, 3 + len);
    int ok = r->buf[4 + len] == (uint8_t)c && r->buf[5 + len] == (uint8_t)(c >> 8);
    r->n = 0; return ok;
  }
  return 0;
}
