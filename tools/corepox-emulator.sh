#!/bin/bash
# Stand up a throwaway Android emulator and run the shipped Corepox APK in it.
#
# Why an emulator and not the phone on the desk: the phone is Tom's, and adb
# finding a device is not permission to install on it. Everything here lives
# under vendor/android-sdk (gitignored) -- SDK, JDK, AVD -- so nothing is
# installed on the machine and nothing is written under $HOME, which the
# sandbox blocks anyway (that is why homebrew cannot run from here).
#
#   tools/corepox-emulator.sh setup     # sdk packages + avd, once
#   tools/corepox-emulator.sh boot      # start it, wait for boot, install the apk
#   tools/corepox-emulator.sh shot out.png
#   tools/corepox-emulator.sh tap X Y
#   tools/corepox-emulator.sh stop
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD/vendor/android-sdk
export JAVA_HOME=$(ls -d "$ROOT"/jdk-*/Contents/Home 2>/dev/null | head -1)
export PATH="$JAVA_HOME/bin:$ROOT/cmdline-tools/latest/bin:$ROOT/platform-tools:$ROOT/emulator:$PATH"
export ANDROID_SDK_ROOT=$ROOT ANDROID_HOME=$ROOT
export ANDROID_USER_HOME=$ROOT/.android ANDROID_AVD_HOME=$ROOT/.android/avd
IMG="system-images;android-31;google_apis;arm64-v8a"
AVD=corepox
SERIAL=emulator-5554

case "${1:-}" in
setup)
  mkdir -p "$ANDROID_AVD_HOME"
  # `yes |` makes sdkmanager exit on SIGPIPE, which set -e then treats as failure
  yes | sdkmanager --sdk_root="$ROOT" --licenses >/dev/null || true
  sdkmanager --sdk_root="$ROOT" "platform-tools" "emulator" "$IMG"
  echo no | avdmanager create avd -n "$AVD" -k "$IMG" -d pixel_5 --force
  # Unity wants a real GPU path; swiftshader is the fallback if host fails.
  echo "hw.lcd.density=440"  >> "$ANDROID_AVD_HOME/$AVD.avd/config.ini"
  echo "hw.keyboard=yes"     >> "$ANDROID_AVD_HOME/$AVD.avd/config.ini"
  ;;
boot)
  emulator -avd "$AVD" -no-snapshot -no-boot-anim -no-audio -gpu swiftshader_indirect \
           -netdelay none -netspeed full >"$ROOT/emulator.log" 2>&1 &
  adb -s "$SERIAL" wait-for-device
  until [ "$(adb -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do
    sleep 3
  done
  adb -s "$SERIAL" install-multiple -r \
      vendor/corepox_apk/xapk/larkworthy.corepox.apk \
      vendor/corepox_apk/xapk/config.arm64_v8a.apk
  adb -s "$SERIAL" shell monkey -p larkworthy.corepox -c android.intent.category.LAUNCHER 1
  ;;
shot)  adb -s "$SERIAL" exec-out screencap -p > "${2:-tools/screenshots/emu.png}" ;;
tap)   adb -s "$SERIAL" shell input tap "$2" "$3" ;;
swipe) adb -s "$SERIAL" shell input swipe "$2" "$3" "$4" "$5" "${6:-300}" ;;
log)   adb -s "$SERIAL" logcat -d -s Unity:* | tail -40 ;;
stop)  adb -s "$SERIAL" emu kill 2>/dev/null || true ;;
*)     sed -n '3,14p' "$0" ;;
esac
