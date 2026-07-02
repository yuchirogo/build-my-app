// Quy trình xin quyền camera cho cả web (Chrome/Safari/Edge) và APK (Capacitor).
// Trả về stream khi thành công, hoặc một đối tượng lỗi có phân loại + hướng dẫn tiếng Việt
// theo từng nền tảng (iOS Safari / Android Chrome / Android APK / desktop).

import { openMediaStream, type OpenOptions } from "./media-capture";
import { isNative } from "./permissions";


export type CameraErrorKind =
  | "insecure-context"
  | "unsupported"
  | "denied"
  | "dismissed"
  | "in-use"
  | "no-camera"
  | "overconstrained"
  | "unknown";

export interface CameraError {
  kind: CameraErrorKind;
  title: string;
  message: string;
  steps: string[];
  canOpenSettings: boolean;
  raw?: unknown;
}

export interface CameraSuccess {
  stream: MediaStream;
}

export type Platform = "ios-safari" | "ios-webview" | "android-chrome" | "android-apk" | "desktop-web";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop-web";
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const native = isNative();
  if (native && android) return "android-apk";
  if (native && iOS) return "ios-webview";
  if (iOS) return "ios-safari";
  if (android) return "android-chrome";
  return "desktop-web";
}

/** Có phải bối cảnh bảo mật? Camera yêu cầu HTTPS hoặc localhost. */
export function isSecure(): boolean {
  if (typeof window === "undefined") return true;
  return window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

/** Hướng dẫn mở lại quyền theo nền tảng. */
function stepsForDenied(p: Platform): string[] {
  switch (p) {
    case "android-apk":
      return [
        "Mở Cài đặt điện thoại → Ứng dụng → BlindGuard AI.",
        "Chọn Quyền (Permissions) → Máy ảnh (Camera).",
        "Chọn 'Chỉ khi dùng ứng dụng' hoặc 'Cho phép'.",
        "Quay lại ứng dụng và bấm 'Thử lại'.",
      ];
    case "android-chrome":
      return [
        "Bấm biểu tượng khoá 🔒 bên trái thanh địa chỉ Chrome.",
        "Chọn Quyền (Permissions) → Máy ảnh → Cho phép.",
        "Tải lại trang rồi bấm 'Thử lại'.",
      ];
    case "ios-safari":
      return [
        "Vào Cài đặt (Settings) → Safari → Máy ảnh.",
        "Chọn 'Cho phép' cho trang web này.",
        "Hoặc chạm biểu tượng 'aA' trên thanh địa chỉ → Cài đặt trang web → Máy ảnh → Cho phép.",
        "Quay lại và bấm 'Thử lại'.",
      ];
    case "ios-webview":
      return [
        "Vào Cài đặt (Settings) → BlindGuard AI → Máy ảnh → Bật.",
        "Quay lại ứng dụng và bấm 'Thử lại'.",
      ];
    default:
      return [
        "Nhấn biểu tượng khoá 🔒 hoặc camera 🎥 bên trái thanh địa chỉ.",
        "Đặt quyền Máy ảnh sang 'Cho phép'.",
        "Tải lại trang và bấm 'Thử lại'.",
      ];
  }
}

function classify(err: unknown, p: Platform): CameraError {
  const anyErr = err as any;
  const name: string = anyErr?.name || "";
  const msg: string = anyErr?.message || String(err);

  if (!isSecure()) {
    return {
      kind: "insecure-context",
      title: "Trang không bảo mật (HTTP)",
      message: "Trình duyệt chỉ cho dùng camera trên HTTPS hoặc localhost.",
      steps: [
        "Mở lại ứng dụng bằng địa chỉ HTTPS.",
        "Nếu đang thử nội bộ, dùng http://localhost thay vì IP.",
      ],
      canOpenSettings: false,
      raw: err,
    };
  }

  if (name === "NotAllowedError" || /denied|permission/i.test(msg)) {
    // NotAllowed có 2 case: người dùng bấm Deny, hoặc đóng popup (dismissed)
    const dismissed = /dismiss/i.test(msg);
    return {
      kind: dismissed ? "dismissed" : "denied",
      title: dismissed ? "Bạn đã đóng hộp thoại quyền" : "Quyền camera bị từ chối",
      message: dismissed
        ? "Hãy bấm 'Thử lại' và chọn 'Cho phép' khi hệ thống hỏi."
        : "Ứng dụng cần quyền Máy ảnh để nhận diện vật thể. Vui lòng cấp lại quyền theo hướng dẫn.",
      steps: stepsForDenied(p),
      canOpenSettings: p === "android-apk" || p === "ios-webview",
      raw: err,
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError" || /not.?found/i.test(msg)) {
    return {
      kind: "no-camera",
      title: "Không tìm thấy camera",
      message: "Thiết bị không có camera phù hợp hoặc camera bị vô hiệu hoá.",
      steps: [
        "Kiểm tra camera có bị tắt trong Cài đặt bảo mật/riêng tư không.",
        "Trên máy tính, thử rút và cắm lại webcam.",
      ],
      canOpenSettings: false,
      raw: err,
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError" || /in use|busy|readable/i.test(msg)) {
    return {
      kind: "in-use",
      title: "Camera đang được ứng dụng khác dùng",
      message: "Đóng các ứng dụng khác (Zoom, Meet, Camera hệ thống…) rồi thử lại.",
      steps: [
        "Đóng tất cả tab / ứng dụng đang dùng camera.",
        "Khoá màn hình rồi mở lại điện thoại (nếu ở Android).",
        "Bấm 'Thử lại'.",
      ],
      canOpenSettings: false,
      raw: err,
    };
  }

  if (name === "OverconstrainedError" || /overconstrained|constraint/i.test(msg)) {
    return {
      kind: "overconstrained",
      title: "Cấu hình camera không phù hợp",
      message: "Thiết bị không hỗ trợ độ phân giải/khung hình yêu cầu. Sẽ thử với cấu hình thấp hơn.",
      steps: ["Bấm 'Thử lại' để dùng cấu hình mặc định."],
      canOpenSettings: false,
      raw: err,
    };
  }

  if (/getUserMedia|not supported|unsupported/i.test(msg)) {
    return {
      kind: "unsupported",
      title: "Trình duyệt không hỗ trợ camera",
      message: "Hãy dùng Chrome/Edge (Android), Safari (iOS) hoặc bản Chrome/Edge mới trên desktop.",
      steps: [
        "Cập nhật trình duyệt lên phiên bản mới nhất.",
        "Với iOS: dùng Safari 14 trở lên.",
      ],
      canOpenSettings: false,
      raw: err,
    };
  }

  return {
    kind: "unknown",
    title: "Không bật được camera",
    message: msg || "Đã xảy ra lỗi không xác định.",
    steps: ["Bấm 'Thử lại'. Nếu vẫn lỗi, khởi động lại ứng dụng."],
    canOpenSettings: p === "android-apk" || p === "ios-webview",
    raw: err,
  };
}

/**
 * Mở camera với fallback thông minh:
 *  1) Thử camera sau (environment) + 60fps.
 *  2) Nếu overconstrained → dùng cấu hình mặc định.
 *  3) Nếu vẫn lỗi → dùng ràng buộc tối thiểu {video: true}.
 * Trả về stream hoặc CameraError đã phân loại + hướng dẫn.
 */
export async function acquireCamera(): Promise<CameraSuccess | { error: CameraError }> {
  const p = detectPlatform();

  if (!isSecure()) {
    return { error: classify(new Error("Insecure context"), p) };
  }
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { error: classify(new Error("getUserMedia not supported"), p) };
  }

  const attempts: OpenOptions[] = [
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60, min: 30 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    { video: true, audio: false },
  ];

  let lastErr: unknown = null;
  for (const opts of attempts) {
    try {
      const { stream } = await openMediaStream(opts);
      return { stream };
    } catch (e) {
      lastErr = e;
      const kind = classify(e, p).kind;
      // Nếu bị từ chối quyền hay thiết bị đang bận thì đừng thử tiếp — trả lỗi ngay.
      if (kind === "denied" || kind === "dismissed" || kind === "no-camera" || kind === "in-use" || kind === "unsupported" || kind === "insecure-context") {
        return { error: classify(e, p) };
      }
      // Với overconstrained / unknown → thử cấu hình kế tiếp.
    }
  }
  return { error: classify(lastErr ?? new Error("unknown"), p) };
}

/** Mở màn Cài đặt của ứng dụng (chỉ trên native, nếu plugin có sẵn). */
export async function openAppSettings(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    // Ưu tiên plugin capacitor-native-settings nếu đã cài trong APK
    const pkg = "capacitor-native-settings";
    const mod: any = await import(/* @vite-ignore */ pkg).catch(() => null);
    if (mod?.NativeSettings?.openAndroid) {
      await mod.NativeSettings.openAndroid({ option: "application_details" });
      return true;
    }
    if (mod?.NativeSettings?.openIOS) {
      await mod.NativeSettings.openIOS({ option: "app" });
      return true;
    }
  } catch (e) {
    console.warn("openAppSettings", e);
  }
  // Không có plugin → người dùng cần vào Cài đặt thủ công theo hướng dẫn
  return false;
}

