import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { CaneClient } from "@/lib/ble/cane-client";
import { Kalman1D, rssiToMeters, metersToProximity } from "@/lib/ble/kalman";
import { CaneTelemetry } from "@/lib/ble/uuids";

interface CaneCtx {
  supported: boolean;
  connected: boolean;
  pairing: boolean;
  telemetry: CaneTelemetry | null;
  smoothedRssi: number | null;
  distanceM: number | null;
  proximity: "rất gần" | "gần" | "vừa" | "xa" | null;
  pair: () => Promise<void>;
  disconnect: () => Promise<void>;
  forget: () => void;
  haptic: (level: 0 | 1 | 2 | 3) => Promise<void>;
  findModeOn: () => Promise<void>;
  findModeOff: () => Promise<void>;
  error: string | null;
}

const Ctx = createContext<CaneCtx | undefined>(undefined);

export function CaneProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<CaneClient | null>(null);
  const kalmanRef = useRef<Kalman1D>(new Kalman1D());
  const [supported, setSupported] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [telemetry, setTelemetry] = useState<CaneTelemetry | null>(null);
  const [smoothedRssi, setSmoothedRssi] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = CaneClient.isSupported();
    setSupported(ok);
    if (!ok) return;

    const client = new CaneClient();
    clientRef.current = client;

    const offState = client.onStateChange((c) => {
      setConnected(c);
      if (!c) {
        setTelemetry(null);
        setSmoothedRssi(null);
        kalmanRef.current.reset();
      }
    });
    const offTelem = client.onTelemetry((t) => {
      setTelemetry(t);
      if (t.rssi !== null) {
        setSmoothedRssi(kalmanRef.current.update(t.rssi));
      }
    });

    // Auto-reconnect lúc mở app
    client.reconnectKnown().catch(() => {});

    return () => {
      offState();
      offTelem();
      client.disconnect();
    };
  }, []);

  const value = useMemo<CaneCtx>(() => {
    const distanceM = smoothedRssi !== null ? rssiToMeters(smoothedRssi) : null;
    const proximity = distanceM !== null && distanceM > 0 ? metersToProximity(distanceM) : null;
    return {
      supported,
      connected,
      pairing,
      telemetry,
      smoothedRssi,
      distanceM,
      proximity,
      error,
      pair: async () => {
        setError(null);
        setPairing(true);
        try {
          await clientRef.current?.pair();
        } catch (e: any) {
          setError(e?.message ?? "Ghép nối thất bại");
        } finally {
          setPairing(false);
        }
      },
      disconnect: async () => {
        await clientRef.current?.disconnect();
      },
      forget: () => {
        clientRef.current?.forgetDevice();
        setConnected(false);
        setTelemetry(null);
      },
      haptic: async (level) => { await clientRef.current?.haptic(level); },
      findModeOn: async () => { await clientRef.current?.findModeOn(); },
      findModeOff: async () => { await clientRef.current?.findModeOff(); },
    };
  }, [supported, connected, pairing, telemetry, smoothedRssi, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCane() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCane phải dùng trong CaneProvider");
  return c;
}
