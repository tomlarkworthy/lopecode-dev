# Calibration shots, phone (CPH2399), 2026-08-10

Eleven 1080x1920 luma frames of the printed mat, rescued out of a live page over
adb+CDP before a reload could destroy them (they exist nowhere else: `shots` is
in-memory only). Raw `.gray` is width*height bytes, row-major, one byte per
pixel, no header — the shape `traceFrame`/`calibrate` take.

`profile.json` is what the notebook had already fitted from these and stored in
localStorage on the github.io origin.

`.png` is the archive: 8-bit grayscale, lossless, and byte-identical to the raw
luma on round-trip (verified). The `.gray` files are the same bytes unwrapped,
kept out of git because the PNGs already hold them.

`calshots-survey.ts` reads this directory and re-runs the real `calibrate`.
