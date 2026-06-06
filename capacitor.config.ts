import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.blindguard.app",
  appName: "BlindGuard AI",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Camera: {
      permissionType: "camera",
      allowEditing: false,
      saveToGallery: false,
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
  android: {
    allowMixedContent: true,
  },
};

export default config;
