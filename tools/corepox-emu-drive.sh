#!/usr/bin/env bash
# Drive the shipped Corepox in the emulator. Coordinates are 1080x2340 device px.
set -uo pipefail
A=vendor/android-sdk/platform-tools/adb
D=emulator-5554
case "${1:-}" in
  tap)  timeout 30 $A -s $D shell input tap "$2" "$3" ;;
  swipe) timeout 30 $A -s $D shell input swipe "$2" "$3" "$4" "$5" "${6:-300}" ;;
  shot) timeout 60 $A -s $D exec-out screencap -p > "$2" ;;
  skip) for i in $(seq 1 "${2:-3}"); do timeout 30 $A -s $D shell input tap 913 2135; sleep 3; done ;;
  log)  timeout 60 $A -s $D logcat -d -s Unity:V | tail -"${2:-40}" ;;
esac
