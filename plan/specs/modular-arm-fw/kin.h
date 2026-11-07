// Link and stack kinematics, the same conventions as the notebook's hexKit and stackKit.
#pragma once
#include <stdint.h>
typedef struct { float R[3][3], t[3]; } xf_t;              // rigid transform, mm
typedef struct { float x, y, z, rx, ry, rz; } pose_t;      // z from the nominal height h; rot is Rz*Ry*Rx
typedef struct { float rb, rp, sepB, sepP, h, Lmin, Lmax, cone, baseOff, topOff; } geo_t;

void  xf_id(xf_t *a);
void  xf_rot(xf_t *a, float rx, float ry, float rz);
void  xf_trans(xf_t *a, float x, float y, float z);
void  xf_mul(xf_t *out, const xf_t *a, const xf_t *b);
void  xf_apply(const xf_t *a, const float p[3], float out[3]);
void  link_top(const geo_t *g, const pose_t *p, xf_t *top);
void  link_legs(const geo_t *g, const pose_t *p, float a[6][3], float b[6][3]);
void  link_ik(const geo_t *g, const pose_t *p, float L[6]);
int   link_fk(const geo_t *g, const float L[6], pose_t *p);   // Newton from *p; 0 = converged
int   link_ok(const geo_t *g, const pose_t *p);               // lengths in range and inside the joint cones
int   solve(int n, float *A, float *b);                       // A (n x n, row major) x = b, in place; 0 = ok
