// Hardware the firmware touches. On the RP2350 these are Pico SDK calls; in the twin they are wasm imports from the plant.
#pragma once
#include <stdint.h>
#define NSTRUT 6
uint32_t hal_now_us(void);
void     hal_log(int32_t code, int32_t a, int32_t b);
int      hal_bus_rx(uint8_t *p, int max);              // bytes received since the last call
void     hal_bus_tx(const uint8_t *p, int n);          // half-duplex: the plant holds the line for n byte times
// link board only
int32_t  hal_encoder(int32_t ch);                       // quadrature count since power-up, + = extending
void     hal_drive(int32_t ch, int32_t duty_permille);  // -1000..1000, + extends; 0 brakes
void     hal_current_limit(int32_t ch, int32_t ma);     // the driver's regulation current (DRV8215 chops at it)
int32_t  hal_current_ma(int32_t ch);                    // IPROPI through the ADC, magnitude
void     hal_imu_accel(int16_t *mg);                    // 3 values, milli-g, top plate frame
void     hal_flash_read(uint32_t off, uint8_t *p, uint32_t n);
void     hal_flash_write(uint32_t off, const uint8_t *p, uint32_t n);
// arm controller only
void     hal_grip(int32_t on);
