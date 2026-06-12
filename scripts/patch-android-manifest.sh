#!/usr/bin/env bash
# Tự động thêm các <uses-permission> Android cần thiết vào AndroidManifest.xml
# sau khi bạn chạy `bunx cap add android`. Idempotent — chạy lại nhiều lần đều an toàn.
#
# Sử dụng:
#   chmod +x scripts/patch-android-manifest.sh
#   ./scripts/patch-android-manifest.sh

set -euo pipefail

MANIFEST="android/app/src/main/AndroidManifest.xml"

if [ ! -f "$MANIFEST" ]; then
  echo "❌ Không tìm thấy $MANIFEST. Hãy chạy: bunx cap add android"
  exit 1
fi

# Danh sách quyền cần có (Camera, Mic, BLE, Network)
PERMS=(
  "android.permission.CAMERA"
  "android.permission.RECORD_AUDIO"
  "android.permission.MODIFY_AUDIO_SETTINGS"
  "android.permission.INTERNET"
  "android.permission.ACCESS_NETWORK_STATE"
  "android.permission.BLUETOOTH_CONNECT"
  "android.permission.WAKE_LOCK"
  "android.permission.VIBRATE"
)

# Bảo đảm xmlns:tools có mặt (cần cho BLUETOOTH_SCAN flags)
if ! grep -q 'xmlns:tools=' "$MANIFEST"; then
  sed -i.bak 's|<manifest |<manifest xmlns:tools="http://schemas.android.com/tools" |' "$MANIFEST"
  echo "✅ Đã thêm xmlns:tools"
fi

added=0
for p in "${PERMS[@]}"; do
  if ! grep -q "$p" "$MANIFEST"; then
    sed -i.bak "s|<application |    <uses-permission android:name=\"$p\" />\n    <application |" "$MANIFEST"
    echo "  + $p"
    added=$((added + 1))
  fi
done

# BLUETOOTH_SCAN với cờ neverForLocation (Android 12+)
if ! grep -q 'BLUETOOTH_SCAN' "$MANIFEST"; then
  sed -i.bak 's|<application |    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" tools:targetApi="s" />\n    <application |' "$MANIFEST"
  echo "  + BLUETOOTH_SCAN (neverForLocation)"
  added=$((added + 1))
fi

# uses-feature
for f in "android.hardware.camera" "android.hardware.microphone" "android.hardware.bluetooth_le"; do
  if ! grep -q "$f" "$MANIFEST"; then
    sed -i.bak "s|<application |    <uses-feature android:name=\"$f\" android:required=\"true\" />\n    <application |" "$MANIFEST"
    echo "  + feature $f"
  fi
done

rm -f "$MANIFEST.bak"

echo ""
if [ "$added" -eq 0 ]; then
  echo "✅ Manifest đã đầy đủ quyền — không cần thay đổi."
else
  echo "✅ Đã thêm $added quyền vào $MANIFEST"
fi

echo ""
echo "Bước tiếp theo:"
echo "  bunx cap sync android"
echo "  cd android && ./gradlew assembleDebug"
