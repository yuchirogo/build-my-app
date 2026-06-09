// Lớp trừu tượng xin quyền: chạy native trên APK (Capacitor), fallback web khi ở trình duyệt/PWA.
// Nguyên tắc: CHỈ xin quyền hệ thống khi thực sự cần (lazy) và CHỈ trên Android 8+ (API 26).
// Nếu quyền đã được cấp trước đó thì không hiện lại popup.

import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export type PermResult = "granted" | "denied" | "prompt" | "unsupported";

/** Trả về Android SDK version (vd 26 = Android 8). null nếu không lấy được hoặc không phải Android. */
async function getAndroidSdk(): Promise<number | null> {
  if (!isNative()) return null;
  if (Capacitor.getPlatform() !== "android") return null;
  try {
    const { Device } = await import("@capacitor/device");
    const info = await Device.getInfo();
    // androidSDKVersion có sẵn trên platform android
    const sdk = (info as any).androidSDKVersion as number | undefined;
    return typeof sdk === "number" ? sdk : null;
  } catch {
    return null;
  }
}

/** True nếu nền tảng yêu cầu xin quyền runtime (Android 8+ / API 26+). iOS luôn cần xin. */
async function shouldRequestRuntimePermission(): Promise<boolean> {
  if (!isNative()) return true; // web/PWA luôn cần prompt qua getUserMedia
  if (Capacitor.getPlatform() === "ios") return true;
  const sdk = await getAndroidSdk();
  // sdk null = không xác định, mặc định cứ xin cho an toàn.
  if (sdk === null) return true;
  return sdk >= 26; // Android 8.0 trở lên
}

/** Xin quyền CAMERA — chỉ hiện popup nếu chưa được cấp. */
export async function requestCameraPermission(): Promise<PermResult> {
  if (isNative()) {
    try {
      const { Camera } = await import("@capacitor/camera");
      const current = await Camera.checkPermissions();
      if (current.camera === "granted") return "granted";
      if (!(await shouldRequestRuntimePermission())) return "granted";
      const res = await Camera.requestPermissions({ permissions: ["camera"] });
      return res.camera === "granted" ? "granted" : "denied";
    } catch (e) {
      console.warn("Camera permission error", e);
      return "denied";
    }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/** Xin quyền BLUETOOTH — chỉ khi người dùng vào màn liên quan BLE. */
export async function requestBluetoothPermission(): Promise<PermResult> {
  if (isNative()) {
    try {
      const { BleClient } = await import("@capacitor-community/bluetooth-le");
      if (!(await shouldRequestRuntimePermission())) {
        // Android <8: vẫn cần initialize nhưng không có popup runtime
        await BleClient.initialize({ androidNeverForLocation: true });
        return "granted";
      }
      await BleClient.initialize({ androidNeverForLocation: true });
      return "granted";
    } catch (e) {
      console.warn("BLE permission error", e);
      return "denied";
    }
  }
  return typeof navigator !== "undefined" && (navigator as any).bluetooth ? "prompt" : "unsupported";
}

/** Xin quyền microphone — chỉ khi bật voice command/STT. */
export async function requestMicrophonePermission(): Promise<PermResult> {
  if (isNative() && !(await shouldRequestRuntimePermission())) {
    return "granted";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/**
 * KHÔNG dùng ở app start. Chỉ gọi khi người dùng chủ động kích hoạt
 * một chức năng cần đầy đủ camera + mic + BLE cùng lúc.
 */
export async function requestAllPermissions(): Promise<Record<string, PermResult>> {
  const results: Record<string, PermResult> = {};
  results.camera = await requestCameraPermission();
  results.microphone = await requestMicrophonePermission();
  results.bluetooth = await requestBluetoothPermission();
  return results;
}
