// RS-485 frames between the arm controller (master) and the links. sync, addr, cmd, len, payload, crc16 (CCITT, little-endian).
#pragma once
#include <stdint.h>
#define FR_SYNC 0x7E
#define FR_MAX 64
enum { C_STATUS = 1, C_SETPOINT = 2, C_HOME = 3, C_SHUTDOWN = 4, C_REPLY = 0x80 };
typedef struct __attribute__((packed)) { int32_t pos[6]; int16_t vel[6]; } sp_t;   // counts from the stop, counts/s
typedef struct __attribute__((packed)) {
  int32_t pos[6]; uint8_t state[6], fault[6]; int16_t acc[3]; uint8_t boot_mask, homed_mask;
} st_t;                                                                              // acc in milli-g, top plate frame
typedef struct { uint8_t buf[FR_MAX + 6]; int n; } rx_t;

uint16_t crc16(const uint8_t *p, int n);
int  fr_encode(uint8_t *out, uint8_t addr, uint8_t cmd, const void *payload, uint8_t len);
int  fr_feed(rx_t *r, uint8_t byte);   // 1 when r->buf holds a whole frame with a good crc
