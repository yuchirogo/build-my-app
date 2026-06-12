import { useCallback, useEffect, useRef, useState } from "react";
import { requestMicrophonePermission } from "@/lib/native/permissions";

export interface VoiceCommand {
  match: RegExp;
  action: () => void;
  label: string;
}

interface Options {
  enabled: boolean;
  commands: VoiceCommand[];
  onTranscript?: (text: string) => void;
}

/**
 * SpeechRecognition wrapper tiếng Việt với auto-restart.
 * Khớp lệnh bằng regex, ví dụ /mở (nhận diện|camera)/.
 */
export function useVoiceCommand({ enabled, commands, onTranscript }: Options) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const recRef = useRef<any>(null);
  const commandsRef = useRef(commands);
  useEffect(() => { commandsRef.current = commands; }, [commands]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  useEffect(() => {
    if (!enabled || !supported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        const text = (r[0].transcript as string).trim().toLowerCase();
        setLastTranscript(text);
        onTranscript?.(text);
        const cmd = commandsRef.current.find((c) => c.match.test(text));
        if (cmd) {
          try { cmd.action(); } catch (err) { console.error(err); }
        }
      }
    };
    rec.onend = () => {
      // Auto-restart nếu vẫn enabled
      if (enabled) {
        try { rec.start(); } catch {}
      } else {
        setListening(false);
      }
    };
    rec.onerror = (e: any) => {
      console.warn("SpeechRecognition error", e.error);
    };

    let cancelled = false;
    (async () => {
      // Xin quyền RECORD_AUDIO trước khi gọi SpeechRecognition (popup native trên Android)
      const perm = await requestMicrophonePermission();
      if (cancelled) return;
      if (perm !== "granted") {
        console.warn("Microphone permission not granted, voice command disabled");
        return;
      }
      try {
        rec.start();
        setListening(true);
      } catch {}
    })();

    return () => {
      cancelled = true;
      try { rec.onend = null; rec.stop(); } catch {}
      setListening(false);
    };
  }, [enabled, supported, onTranscript]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
  }, []);

  return { supported, listening, lastTranscript, stop };
}
