# Đóng gói BlindGuard AI thành APK Android

Sandbox Lovable **không** build được APK (cần Android SDK + JDK 17 + Gradle). Tài liệu này hướng dẫn build trên máy local hoặc CI.

## 1. Yêu cầu môi trường (máy local)

- Node 20+ và Bun (hoặc npm)
- **JDK 17** (Temurin/Zulu)
- **Android Studio** + Android SDK Platform 34 + Build-Tools 34
- Biến môi trường: `ANDROID_HOME`, `JAVA_HOME`

## 2. Chuẩn bị build web (SPA mode)

Capacitor cần thư mục tĩnh `dist/`. Hiện app dùng TanStack Start (SSR). Có 2 cách:

**Cách A — dùng bản đã publish** (đơn giản nhất): trỏ Capacitor về URL đã publish thay vì `dist/`.
Sửa `capacitor.config.ts`:
```ts
server: { url: "https://huggy-project-plan.lovable.app", cleartext: false }
```
Ưu: không cần build SSR → APK. Nhược: cần Internet để chạy app.

**Cách B — build SPA tĩnh** (hoạt động offline): thêm script build SPA bằng Vite riêng, output ra `dist/`. Xem mục "Build SPA" bên dưới.

## 3. Tạo project Android (lần đầu)

```bash
git clone <repo>
cd blindguard-ai
bun install
# Tạo dist/ trống nếu dùng Cách A:
mkdir -p dist && echo "<!doctype html><title>BlindGuard</title>" > dist/index.html

bunx cap add android
bunx cap sync android
```

Lệnh `cap add android` sẽ tạo thư mục `android/` với project Gradle.

## 4. Khai báo quyền Android

Mở `android/app/src/main/AndroidManifest.xml`, thêm vào trong `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Bluetooth Low Energy -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
  android:usesPermissionFlags="neverForLocation" tools:targetApi="s" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
```

Đừng quên thêm `xmlns:tools="http://schemas.android.com/tools"` ở thẻ `<manifest>` gốc.

## 5. Build APK debug

```bash
bunx cap sync android
cd android
./gradlew assembleDebug
```

APK xuất tại: `android/app/build/outputs/apk/debug/app-debug.apk`

Cài lên máy:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 6. Kiểm chứng popup quyền

Mở app trên Android → bấm onboarding bước "Cho phép Camera" → sẽ hiện hộp thoại hệ thống:

> **Cho phép BlindGuard AI chụp ảnh và quay video?**
> [TỪ CHỐI] [CHO PHÉP]

Tiếp theo là popup microphone, rồi khi vào màn "Tìm gậy" sẽ hiện popup Bluetooth scan/connect. Đúng như mockup bạn gửi.

## 7. Build APK release (ký số)

```bash
keytool -genkey -v -keystore blindguard.keystore -alias blindguard \
  -keyalg RSA -keysize 2048 -validity 10000
cd android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=$PWD/../blindguard.keystore \
  -Pandroid.injected.signing.store.password=*** \
  -Pandroid.injected.signing.key.alias=blindguard \
  -Pandroid.injected.signing.key.password=***
```

## 8. Build SPA tĩnh (cho Cách B)

TanStack Start mặc định SSR. Để có bundle tĩnh thuần, tạo `vite.spa.config.ts` riêng chỉ build React app, hoặc dùng tính năng `prerender` của TanStack Start cho mọi route. Đây là việc cấu hình thêm — khuyến nghị dùng **Cách A** cho lần build APK đầu tiên.

## 9. Lưu ý quan trọng

- **Web Bluetooth** trên Capacitor WebView **không hoạt động**. Plugin `@capacitor-community/bluetooth-le` đã được code (`src/lib/native/permissions.ts`) gọi `BleClient.initialize()` để xin quyền đúng cách. Khi cần kết nối thật trên APK, nên thay `src/lib/ble/cane-client.ts` bằng wrapper dùng `BleClient` thay vì `navigator.bluetooth`.
- **Lovable AI Gateway** (Scene Description) cần Internet. Offline mode chỉ hoạt động cho YOLO detection.
- **TensorFlow.js + WebGL** chạy tốt trong Capacitor WebView (Chromium).

## 10. CI tự động build APK (tuỳ chọn)

Dùng GitHub Actions với `actions/setup-java@v4` + `android-actions/setup-android@v3`. Mẫu workflow xem `.github/workflows/android.yml` (chưa tạo — tạo khi cần).
