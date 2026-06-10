import { useEffect, useRef, useState } from "react";
import { requestCameraPermission } from "@/lib/native/permissions";
import { useDetector, estimateDistance, Detection } from "@/lib/detection/use-detector";
import { useVietnameseTTS } from "@/lib/detection/use-tts";
import { useCane } from "@/hooks/use-cane";
import { HIGH_PRIORITY, toVietnamese } from "@/lib/detection/labels-vi";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, ScanLine, Volume2, VolumeX, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "realtime" | "ondemand";

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<Mode>("realtime");
  const [muted, setMuted] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);

  const { ready: modelReady, error: modelError, detect } = useDetector(0.5);
  const { speak, speakThrottled, stop: stopTts } = useVietnameseTTS();
  const cane = useCane();
  const lastHapticRef = useRef(0);

  // Refs để vòng lặp đọc giá trị mới nhất
  const modeRef = useRef(mode);
  const mutedRef = useRef(muted);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, min: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (e: any) {
      setCamError(e?.message ?? "Không truy cập được camera");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setActive(false);
    setDetections([]);
    stopTts();
  };

  // Tự động xin quyền & bật camera ngay khi vào trang để hộp thoại "Cho phép camera" hiện lập tức
  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detections mới nhất (ref) để render loop đọc mà không re-render
  const latestDetRef = useRef<Detection[]>([]);

  // === Render loop: vẽ overlay ở tốc độ tối đa của màn hình (~60fps) ===
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let frames = 0;
    let lastFpsTs = performance.now();
    const render = () => {
      drawOverlay(latestDetRef.current);
      frames++;
      const now = performance.now();
      if (now - lastFpsTs >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastFpsTs)));
        frames = 0;
        lastFpsTs = now;
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    rafRef.current = raf;
    return () => cancelAnimationFrame(raf);
  }, [active]);

  // === Inference loop: chạy độc lập, lặp ngay khi xong (không block render) ===
  useEffect(() => {
    if (!active || !modelReady) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }
        try {
          const results = await detect(video);
          if (cancelled) break;
          latestDetRef.current = results;
          setDetections(results);
          if (modeRef.current === "realtime" && !mutedRef.current) {
            announce(results, video.videoHeight);
          }
        } catch {
          /* bỏ qua frame lỗi */
        }
        // Nhường thread để UI/camera mượt
        await new Promise((r) => setTimeout(r, 0));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, modelReady]);

  const announce = (results: Detection[], frameH: number) => {
    // Ưu tiên vật cao mức nguy hiểm, lấy 2 lớn nhất
    const sorted = [...results].sort((a, b) => b.bbox[3] - a.bbox[3]);
    const high = sorted.filter((d) => HIGH_PRIORITY.has(d.label)).slice(0, 1);
    const others = sorted.filter((d) => !HIGH_PRIORITY.has(d.label)).slice(0, 1);
    [...high, ...others].forEach((d) => {
      const dist = estimateDistance(d.bbox[3], frameH);
      const text = `${toVietnamese(d.label)} ở phía trước, khoảng cách ${dist}`;
      speakThrottled(d.label, text, { priority: HIGH_PRIORITY.has(d.label) });
    });
    // Haptic feedback trên gậy theo mức nguy hiểm (throttle 800ms)
    if (cane.connected && high.length > 0) {
      const now = Date.now();
      if (now - lastHapticRef.current > 800) {
        const dist = estimateDistance(high[0].bbox[3], frameH);
        const level = dist === "gần" ? 3 : dist === "trung bình" ? 2 : 1;
        cane.haptic(level as 1 | 2 | 3).catch(() => {});
        lastHapticRef.current = now;
      }
    }
  };

  const drawOverlay = (results: Detection[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 4;
    ctx.font = "20px Inter, sans-serif";
    results.forEach((d) => {
      const [x, y, bw, bh] = d.bbox;
      const isHigh = HIGH_PRIORITY.has(d.label);
      ctx.strokeStyle = isHigh ? "#F59E0B" : "#10B981";
      ctx.strokeRect(x, y, bw, bh);
      const label = `${toVietnamese(d.label)} ${(d.score * 100).toFixed(0)}%`;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = isHigh ? "#F59E0B" : "#10B981";
      ctx.fillRect(x, Math.max(0, y - 28), tw, 28);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(label, x + 6, Math.max(20, y - 8));
    });
  };

  const onDemand = async () => {
    const video = videoRef.current;
    if (!video) return;
    const results = await detect(video);
    setDetections(results);
    drawOverlay(results);
    if (results.length === 0) {
      speak("Không phát hiện vật thể nào trước mặt", { priority: true });
      return;
    }
    const top = [...results].sort((a, b) => b.bbox[3] - a.bbox[3]).slice(0, 3);
    const sentence = top
      .map((d) => `${toVietnamese(d.label)} ${estimateDistance(d.bbox[3], video.videoHeight)}`)
      .join(", ");
    speak(`Phía trước có ${sentence}`, { priority: true });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 bg-black/80 px-4 py-3">
        <h1 className="text-lg font-semibold">Nhận diện vật thể</h1>
        <div className="flex items-center gap-2 text-xs">
          {modelReady ? (
            <span className="rounded-full bg-accent/20 px-2 py-1 text-accent">Mô hình sẵn sàng · {fps} fps</span>
          ) : modelError ? (
            <span className="rounded-full bg-destructive/20 px-2 py-1 text-destructive">Lỗi mô hình</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Đang tải mô hình…
            </span>
          )}
        </div>
      </div>

      {/* Camera frame */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          aria-label="Khung hình camera"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        {!active && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Camera className="h-16 w-16 text-white/60" aria-hidden />
            <p className="text-base text-white/80">Nhấn nút bên dưới để bật camera</p>
          </div>
        )}

        {false && camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-secondary" aria-hidden />
            <p className="text-base">{camError}</p>
            <p className="text-sm text-white/70">Vui lòng cấp quyền camera trong cài đặt trình duyệt.</p>
          </div>
        )}

        {/* Danh sách detections (cho caregiver/low vision) */}
        {active && detections.length > 0 && (
          <div className="absolute left-3 top-3 max-w-[60%] space-y-1">
            {detections.slice(0, 4).map((d, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium backdrop-blur",
                  HIGH_PRIORITY.has(d.label) ? "bg-secondary/90 text-secondary-foreground" : "bg-accent/90 text-accent-foreground"
                )}
              >
                {toVietnamese(d.label)} · {(d.score * 100).toFixed(0)}%
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 bg-black/90 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2" role="tablist" aria-label="Chế độ nhận diện">
          <ModeButton active={mode === "realtime"} onClick={() => setMode("realtime")}>
            Liên tục
          </ModeButton>
          <ModeButton active={mode === "ondemand"} onClick={() => setMode("ondemand")}>
            Theo lệnh
          </ModeButton>
        </div>

        <div className="flex gap-2">
          {!active ? (
            <Button
              onClick={startCamera}
              size="lg"
              className="h-16 flex-1 text-base font-semibold"
              disabled={!modelReady}
            >
              <Camera className="h-6 w-6" /> Bật camera
            </Button>
          ) : mode === "ondemand" ? (
            <Button
              onClick={onDemand}
              size="lg"
              className="h-16 flex-1 bg-accent text-accent-foreground text-base font-semibold hover:bg-accent/90"
            >
              <ScanLine className="h-6 w-6" /> Nhận diện ngay
            </Button>
          ) : (
            <Button
              onClick={() => setMuted((m) => !m)}
              size="lg"
              variant="secondary"
              className="h-16 flex-1 text-base font-semibold"
            >
              {muted ? <><VolumeX className="h-6 w-6" /> Bật tiếng</> : <><Volume2 className="h-6 w-6" /> Tắt tiếng</>}
            </Button>
          )}

          {active && (
            <Button
              onClick={stopCamera}
              size="lg"
              variant="destructive"
              className="h-16 px-5"
              aria-label="Tắt camera"
            >
              <CameraOff className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/20"
      )}
    >
      {children}
    </button>
  );
}
