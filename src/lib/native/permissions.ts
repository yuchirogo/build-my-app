// Lớp trừu tượng xin quyền: chạy native trên APK (Capacitor), fallback web khi ở trình duyệt/PWA.
// Khi đóng gói APK, Android sẽ hiển thị hộp thoại "Cho phép Permission" gốc của hệ điều hành.

import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export type PermResult = "granted" | "denied" | "prompt" | "unsupported";

/** Xin quyền CAMERA. Trên Android sẽ bật popup hệ thống. */
export async function requestCameraPermission(): Promise<PermResult> {
  if (isNative()) {
    try {
      const { Camera } = await import("@capacitor/camera");
      // Bước 1: check trước
      let perm = await Camera.checkPermissions();
      // Bước 2: nếu chưa granted thì request (popup native)
      if (perm.camera !== "granted") {
        perm = await Camera.requestPermissions({ permissions: ["camera"] });
      }
      return perm.camera === "granted" ? "granted" : "denied";
    } catch (e) {
      console.warn("Camera permission error", e);
      return "denied";
    }
  }
  // Web fallback: gọi getUserMedia để trình duyệt hiện popup
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/** Xin quyền BLUETOOTH (BLUETOOTH_SCAN + BLUETOOTH_CONNECT + LOCATION trên Android 12-). */
export async function requestBluetoothPermission(): Promise<PermResult> {
  if (isNative()) {
    try {
      const { BleClient } = await import("@capacitor-community/bluetooth-le");
      // initialize() sẽ tự kích hoạt popup quyền runtime trên Android
      await BleClient.initialize({ androidNeverForLocation: true });
      return "granted";
    } catch (e) {
      console.warn("BLE permission error", e);
      return "denied";
    }
  }
  // Web fallback: Web Bluetooth chỉ có thể xin quyền bằng cử chỉ người dùng (nút bấm)
  return typeof navigator !== "undefined" && (navigator as any).bluetooth ? "prompt" : "unsupported";
}

/** Xin quyền microphone (RECORD_AUDIO). Trên Android sẽ bật popup hệ thống. */
export async function requestMicrophonePermission(): Promise<PermResult> {
  if (isNative()) {
    // Ưu tiên dùng plugin SpeechRecognition nếu có (xin RECORD_AUDIO native)
    try {
      const pkg = "@capacitor-community/speech-recognition";
      const mod: any = await import(/* @vite-ignore */ pkg).catch(() => null);
      if (mod?.SpeechRecognition) {
        const SR = mod.SpeechRecognition;
        const check = await SR.checkPermissions?.();
        const status = check?.speechRecognition ?? check?.record_audio;
        if (status === "granted") return "granted";
        const req = await SR.requestPermissions?.();
        const after = req?.speechRecognition ?? req?.record_audio;
        if (after === "granted") return "granted";
      }
    } catch (e) {
      console.warn("SpeechRecognition permission error", e);
    }
    // Fallback: getUserMedia trên Capacitor WebView cũng kích hoạt popup RECORD_AUDIO
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return "granted";
    } catch {
      return "denied";
    }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/** Tự động xin Camera + Microphone (+ Bluetooth nếu native) ngay khi app khởi động. */
export async function requestAllPermissions(): Promise<Record<string, PermResult>> {
  const results: Record<string, PermResult> = {};
  if (isNative()) {
    try {
      const { Camera } = await import("@capacitor/camera");
      const camRes = await Camera.requestPermissions({ permissions: ["camera"] });
      results.camera = camRes.camera === "granted" ? "granted" : "denied";
    } catch {
      results.camera = "denied";
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      results.microphone = "granted";
    } catch {
      results.microphone = "denied";
    }
    results.bluetooth = await requestBluetoothPermission();
  } else {
    results.camera = await requestCameraPermission();
    results.microphone = await requestMicrophonePermission();
    results.bluetooth = "prompt";
  }
  return results;
}
