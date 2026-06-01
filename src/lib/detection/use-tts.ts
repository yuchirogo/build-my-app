import { useCallback, useEffect, useRef, useState } from "react";

interface SpeakOpts {
  rate?: number;
  volume?: number;
  priority?: boolean; // ngắt câu hiện tại
}

const VOICE_KEY = "blindguard.tts.voiceURI";

export const getPreferredVoiceURI = () => {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(VOICE_KEY); } catch { return null; }
};
export const setPreferredVoiceURI = (uri: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (uri) window.localStorage.setItem(VOICE_KEY, uri);
    else window.localStorage.removeItem(VOICE_KEY);
  } catch {}
};

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const preferred = getPreferredVoiceURI();
  if (preferred) {
    const found = voices.find((v) => v.voiceURI === preferred);
    if (found) return found;
  }
  return (
    voices.find((v) => /google/i.test(v.name) && /vi[-_]?vn/i.test(v.lang)) ||
    voices.find((v) => /google/i.test(v.name) && v.lang.toLowerCase().startsWith("vi")) ||
    voices.find((v) => /vietnam|tiếng việt|viet/i.test(v.name)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith("vi"))
  );
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
    const voice = pickVoice(window.speechSynthesis.getVoices());
    if (voice) u.voice = voice;
    if (opts.priority) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

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

/** Hook trả về danh sách giọng tiếng Việt và giọng đang chọn. */
export function useVietnameseVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedURI, setSelectedURI] = useState<string | null>(() => getPreferredVoiceURI());

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const vi = all.filter((v) => v.lang.toLowerCase().startsWith("vi") || /vietnam|tiếng việt|viet/i.test(v.name));
      setVoices(vi);
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  const selectVoice = useCallback((uri: string | null) => {
    setPreferredVoiceURI(uri);
    setSelectedURI(uri);
  }, []);

  return { voices, selectedURI, selectVoice };
}
