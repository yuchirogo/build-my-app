import type { CapacitorConfig } from "@capacitor/cli";

// Cấu hình build APK Android cho BlindGuard AI.
// LƯU Ý: Sandbox Lovable KHÔNG build được APK (cần Android SDK + JDK + Gradle).
// Xem docs/ANDROID-BUILD.md để build trên máy local hoặc GitHub Actions.
const config: CapacitorConfig = {
  appId: "ai.blindguard.app",
  appName: "BlindGuard AI",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  plugins: {
    Camera: {
      // Khai báo loại quyền để Android hiển thị popup runtime đúng cách
      permissionType: "camera",
    },
    BluetoothLe: {
      displayStrings: {
        scanning: "Đang quét gậy thông minh…",
        cancel: "Hủy",
        availableDevices: "Thiết bị khả dụng",
        noDeviceFound: "Không tìm thấy thiết bị",
      },
    },
  },
};

export default config;
