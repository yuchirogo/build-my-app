import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useCane } from "@/hooks/use-cane";
import { useVietnameseTTS } from "@/lib/detection/use-tts";
import { Button } from "@/components/ui/button";
import { Compass, Bluetooth, BluetoothOff, Loader2, AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/find-cane")({
  component: FindCanePage,
});

function FindCanePage() {
  const cane = useCane();
  const { speak, speakThrottled, stop: stopTts } = useVietnameseTTS();
  const [findMode, setFindMode] = useState(false);
  const [voice, setVoice] = useState(true);

  // Bật / tắt find mode trên gậy khi vào / rời trang
  useEffect(() => {
    if (findMode && cane.connected) {
      cane.findModeOn().catch(() => {});
    }
    return () => {
      if (cane.connected) cane.findModeOff().catch(() => {});
      stopTts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findMode, cane.connected]);

  // Phát thanh khoảng cách định kỳ khi đang tìm
  useEffect(() => {
    if (!findMode || !voice || !cane.proximity) return;
    const text = `Gậy của bạn ở ${cane.proximity}${cane.distanceM ? `, khoảng ${cane.distanceM.toFixed(1)} mét` : ""}`;
    speakThrottled("cane-distance", text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cane.proximity, cane.distanceM, findMode, voice]);

  if (!cane.supported) {
    return (
      <AppShell>
        <div className="px-6 py-10 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-secondary" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold">Trình duyệt không hỗ trợ</h1>
          <p className="mt-2 text-muted-foreground">
            Tính năng kết nối gậy cần Web Bluetooth. Hãy dùng Chrome / Edge trên Android hoặc desktop.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold">Tìm gậy của tôi</h1>

        {!cane.connected ? (
          <DisconnectedCard onPair={cane.pair} pairing={cane.pairing} error={cane.error} />
        ) : (
          <ConnectedCard
            findMode={findMode}
            voice={voice}
            onToggleFind={() => setFindMode((v) => !v)}
            onToggleVoice={() => setVoice((v) => !v)}
            onPing={async () => {
              try {
                await cane.haptic(3);
                speak("Đã rung gậy", { priority: true });
                toast.success("Đã gửi tín hiệu rung");
              } catch {
                toast.error("Không gửi được lệnh");
              }
            }}
            onDisconnect={async () => {
              setFindMode(false);
              await cane.disconnect();
            }}
            proximity={cane.proximity}
            distanceM={cane.distanceM}
            rssi={cane.smoothedRssi}
            battery={cane.telemetry?.batteryPercent ?? null}
          />
        )}
      </div>
    </AppShell>
  );
}

function DisconnectedCard({ onPair, pairing, error }: { onPair: () => void; pairing: boolean; error: string | null }) {
  return (
    <div className="mt-6 rounded-2xl border bg-card p-6 text-center">
      <BluetoothOff className="mx-auto h-14 w-14 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold">Chưa kết nối gậy</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Bật gậy thông minh và bấm nút bên dưới để ghép nối qua Bluetooth.
      </p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button onClick={onPair} disabled={pairing} size="lg" className="mt-6 h-14 w-full text-base font-semibold">
        {pairing ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Bluetooth className="h-5 w-5" /> Ghép nối gậy</>}
      </Button>
    </div>
  );
}

function ConnectedCard({
  findMode, voice, onToggleFind, onToggleVoice, onPing, onDisconnect,
  proximity, distanceM, rssi, battery,
}: {
  findMode: boolean;
  voice: boolean;
  onToggleFind: () => void;
  onToggleVoice: () => void;
  onPing: () => void;
  onDisconnect: () => void;
  proximity: string | null;
  distanceM: number | null;
  rssi: number | null;
  battery: number | null;
}) {
  // Mức "đầy" của vòng tròn proximity (0-1)
  const intensity = distanceM ? Math.max(0.1, Math.min(1, 1 - distanceM / 10)) : 0.1;
  const proximityColor =
    proximity === "rất gần" ? "bg-accent" :
    proximity === "gần" ? "bg-primary" :
    proximity === "vừa" ? "bg-secondary" :
    "bg-muted";

  return (
    <>
      <div className="mt-6 rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Bluetooth className="h-5 w-5 text-accent" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium">Đã kết nối</p>
            <p className="text-xs text-muted-foreground">
              {battery !== null ? `Pin ${battery}%` : "Đang đồng bộ…"}
              {rssi !== null && ` · RSSI ${Math.round(rssi)} dBm`}
            </p>
          </div>
        </div>
      </div>

      {/* Vòng tròn proximity */}
      <div className="mt-6 flex flex-col items-center">
        <div
          className="relative flex h-56 w-56 items-center justify-center"
          role="status"
          aria-live="polite"
          aria-label={`Khoảng cách đến gậy: ${proximity ?? "đang đo"}`}
        >
          <div
            className={`absolute inset-0 rounded-full ${proximityColor} transition-all duration-500`}
            style={{ opacity: 0.15 + intensity * 0.6, transform: `scale(${0.6 + intensity * 0.4})` }}
          />
          <div className={`relative flex h-32 w-32 items-center justify-center rounded-full ${proximityColor} text-primary-foreground transition-all`}>
            <Compass
              className={`h-14 w-14 ${findMode ? "animate-pulse" : ""}`}
              aria-hidden
            />
          </div>
        </div>
        <p className="mt-6 text-xl font-bold capitalize">
          {proximity ?? "Đang đo…"}
        </p>
        {distanceM !== null && distanceM > 0 && (
          <p className="text-sm text-muted-foreground">
            Khoảng {distanceM.toFixed(1)} mét
          </p>
        )}
      </div>

      <div className="mt-8 space-y-3">
        <Button
          onClick={onToggleFind}
          size="lg"
          className={`h-14 w-full text-base font-semibold ${findMode ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}`}
        >
          {findMode ? "Dừng tìm gậy" : "Bắt đầu tìm gậy"}
        </Button>

        <div className="flex gap-3">
          <Button onClick={onPing} variant="outline" size="lg" className="h-14 flex-1 text-base">
            Rung gậy
          </Button>
          <Button onClick={onToggleVoice} variant="outline" size="lg" className="h-14 px-4" aria-label="Bật tắt thông báo giọng nói">
            {voice ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>

        <Button onClick={onDisconnect} variant="ghost" size="lg" className="h-12 w-full text-muted-foreground">
          Ngắt kết nối
        </Button>
      </div>
    </>
  );
}
