import { useCallback, useEffect, useRef } from "react";

interface SpeakOpts {
  rate?: number;
  volume?: number;
  priority?: boolean; // ngắt câu hiện tại
}

export function useVietnameseTTS() {
  const lastSpokenRef = useRef<Map<string, number>>(new Map());
  const COOLDOWN_MS = 2500;

  const speak = useCallback((text: string, opts: SpeakOpts = {}) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "vi-VN";
    u.rate = opts.rate ?? 1.05;
    u.volume = opts.volume ?? 1;
    const voices = window.speechSynthesis.getVoices();
    // Ưu tiên giọng "chị Google" tiếng Việt (Google Tiếng Việt - nữ)
    const vi =
      voices.find((v) => /google/i.test(v.name) && /vi[-_]?vn/i.test(v.lang)) ||
      voices.find((v) => /google/i.test(v.name) && v.lang.toLowerCase().startsWith("vi")) ||
      voices.find((v) => /vietnam|tiếng việt|viet/i.test(v.name)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("vi"));
    if (vi) u.voice = vi;
    if (opts.priority) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  // Phát thanh có chống lặp: cùng nội dung không nói lại trong COOLDOWN_MS
  const speakThrottled = useCallback(
    (key: string, text: string, opts?: SpeakOpts) => {
      const now = Date.now();
      const last = lastSpokenRef.current.get(key) ?? 0;
      if (now - last < COOLDOWN_MS) return;
      lastSpokenRef.current.set(key, now);
      speak(text, opts);
    },
    [speak]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    // Warm-up voices (một số trình duyệt nạp voices không đồng bộ)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const handler = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener?.("voiceschanged", handler);
      return () => {
        window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
        stop();
      };
    }
    return () => stop();
  }, [stop]);

  return { speak, speakThrottled, stop };
}
