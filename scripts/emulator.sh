#!/usr/bin/env bash
# Starts the Android emulator as its own process so it keeps running after the terminal
# command (or `npx cap run android`) finishes. Uses 1.5 GB RAM to fit laptops with 16 GB.
SDK="${ANDROID_HOME:-$HOME/Android/sdk}"
AVD="${1:-Pixel_5_API_34}"
if "$SDK/platform-tools/adb" devices | grep -q "^emulator-"; then echo "Emulator already running"; exit 0; fi
setsid nohup "$SDK/emulator/emulator" -avd "$AVD" -memory 1536 -gpu host -no-audio -no-boot-anim >/tmp/beekey-emulator.log 2>&1 < /dev/null &
echo "Starting $AVD … waiting for it to boot"
"$SDK/platform-tools/adb" wait-for-device
until [ "$("$SDK/platform-tools/adb" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 2; done
echo "Emulator ready"
