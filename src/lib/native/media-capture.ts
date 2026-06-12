// Lớp trừu tượng mở camera / micro:
// - Trên APK (Capacitor / Android WebView): xin quyền hệ thống NATIVE qua plugin,
//   sau đó dùng getUserMedia của WebView (đã có quyền RECORD_AUDIO / CAMERA hệ điều hành cấp).
// - Trên trình duyệt thường (Edge/Chrome/Firefox): rơi về luồng web chuẩn (popup của trình duyệt).
//
// Mục đích: khi đóng gói thành APK và cài trên máy Android, ứng dụng KHÔNG phụ thuộc vào
// popup quyền của trình duyệt — Android sẽ hiển thị hộp thoại quyền hệ thống thật.

import { Capacitor } from "@capacitor/core";
import {
  isNative,
  requestCameraPermission,
  requestMicrophonePermission,
} from "./permissions";

export type CaptureKind = "camera" | "microphone" | "both";

export interface OpenOptions {
  video?: MediaTrackConstraints | boolean;
  audio?: MediaTrackConstraints | boolean;
}

export interface OpenResult {
  stream: MediaStream;
  source: "native-webview" | "web";
}

/**
 * Yêu cầu quyền hệ thống Android (nếu native) hoặc trình duyệt (nếu web).
 * Trả về true khi tất cả các quyền cần thiết đã `granted`.
 */
export async function ensureNativePermissions(kind: CaptureKind): Promise<boolean> {
  const need: Array<Promise<string>> = [];
  if (kind === "camera" || kind === "both") need.push(requestCameraPermission());
  if (kind === "microphone" || kind === "both") need.push(requestMicrophonePermission());
  const results = await Promise.all(need);
  return results.every((r) => r === "granted");
}

/**
 * Mở MediaStream camera/micro:
 * 1) Xin quyền hệ thống Android trước (nếu chạy trong APK).
 * 2) Sau đó gọi getUserMedia của WebView (Android sẽ KHÔNG hỏi lại — đã có quyền OS).
 *
 * Trên web: bỏ qua bước 1; getUserMedia sẽ tự bật popup của trình duyệt.
 */
export async function openMediaStream(opts: OpenOptions): Promise<OpenResult> {
  const wantVideo = !!opts.video;
  const wantAudio = !!opts.audio;
  const kind: CaptureKind =
    wantVideo && wantAudio ? "both" : wantVideo ? "camera" : "microphone";

  if (isNative()) {
    const ok = await ensureNativePermissions(kind);
    if (!ok) {
      throw new Error(
        kind === "camera"
          ? "Người dùng từ chối quyền Camera của hệ thống Android."
          : kind === "microphone"
            ? "Người dùng từ chối quyền Microphone (RECORD_AUDIO) của hệ thống Android."
            : "Người dùng từ chối quyền Camera hoặc Microphone của hệ thống Android.",
      );
    }
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Thiết bị / WebView không hỗ trợ getUserMedia.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: opts.video ?? false,
    audio: opts.audio ?? false,
  });

  return {
    stream,
    source: isNative() ? "native-webview" : "web",
  };
}

/** Dọn dẹp stream an toàn (idempotent). */
export function closeMediaStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    /* ignore */
  }
}

/** Tiện ích: trả về tên runtime để hiển thị / log. */
export function getRuntimeLabel(): string {
  try {
    if (isNative()) return `Android APK (${Capacitor.getPlatform()})`;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "Web · Edge";
    if (/Chrome\//.test(ua)) return "Web · Chrome";
    if (/Firefox\//.test(ua)) return "Web · Firefox";
    if (/Safari\//.test(ua)) return "Web · Safari";
  }
  return "Web";
}
