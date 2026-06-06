import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export interface Settings {
  speechRate: number; // 0.5 - 1.5
  volume: number; // 0 - 1
  hapticEnabled: boolean;
  voiceCommandEnabled: boolean;
  emergencyName: string;
  emergencyPhone: string;
  offlineMode: boolean;
}

const DEFAULTS: Settings = {
  speechRate: 1.05,
  volume: 1,
  hapticEnabled: true,
  voiceCommandEnabled: false,
  emergencyName: "",
  emergencyPhone: "",
  offlineMode: false,
};

const KEY = "blindguard.settings.v1";

const Ctx = createContext<{
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
