import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { describeScene } from "@/lib/scene/describe.functions";
import { useVietnameseTTS } from "@/lib/detection/use-tts";
import { closeMediaStream } from "@/lib/native/media-capture";
import { acquireCamera, type CameraError } from "@/lib/native/camera-flow";
import { CameraPermissionHelp } from "@/components/camera-permission-help";
import { useSettings } from "@/hooks/use-settings";
import { Camera, Sparkles, Loader2, CameraOff } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/scene-description")({
  component: () => (
    <AppShell>
      <ClientOnlyScene />
    </AppShell>
  ),
});

function ClientOnlyScene() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Scene />;
}

function Scene() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [starting, setStarting] = useState(false);
  const [description, setDescription] = useState<string>("");
  const describe = useServerFn(describeScene);
  const { speak } = useVietnameseTTS();
  const { settings } = useSettings();

  useEffect(() => () => stop(), []);

  const start = async () => {
    setError(null);
    setStarting(true);
    try {
      const res = await acquireCamera();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      streamRef.current = res.stream;
      if (videoRef.current) {
        videoRef.current.srcObject = res.stream;
        try { await videoRef.current.play(); } catch { /* iOS */ }
      }
      setActive(true);
    } finally {
      setStarting(false);
    }
  };


  const stop = () => {
    closeMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setLoading(true);
    try {
      const canvas = document.createElement("canvas");
      // Giảm kích thước để gửi nhanh
      const maxW = 800;
      const scale = Math.min(1, maxW / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      speak("Đang phân tích khung cảnh", { priority: true, rate: settings.speechRate, volume: settings.volume });
      const { description } = await describe({ data: { imageBase64: dataUrl } });
      setDescription(description);
      speak(description, { priority: true, rate: settings.speechRate, volume: settings.volume });
    } catch (e: any) {
      const msg = e?.message ?? "Không mô tả được khung cảnh";
      toast.error(msg);
      if (msg.includes("429")) speak("Quá nhiều yêu cầu, thử lại sau", { priority: true });
      else if (msg.includes("402")) speak("Hết tín dụng AI, vui lòng nạp thêm", { priority: true });
      else speak("Có lỗi xảy ra, hãy thử lại", { priority: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-black text-white">
      <div className="flex items-center justify-between bg-black/80 px-4 py-3">
        <h1 className="text-lg font-semibold">Mô tả khung cảnh</h1>
        <Sparkles className="h-5 w-5 text-accent" aria-hidden />
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" aria-label="Khung hình camera" />
        {!active && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Camera className="h-16 w-16 text-white/60" aria-hidden />
            <p>Bật camera để bắt đầu</p>
          </div>
        )}
        {error && (
          <CameraPermissionHelp
            error={error}
            onRetry={start}
            onReload={() => window.location.reload()}
          />
        )}

        {description && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/80 p-3 backdrop-blur">
            <p className="text-base leading-relaxed">{description}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 bg-black/90 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {!active ? (
          <Button onClick={start} disabled={starting} size="lg" className="h-16 w-full text-base font-semibold" aria-label="Bật camera để mô tả cảnh">
            {starting ? <><Loader2 className="h-6 w-6 animate-spin" /> Đang xin quyền camera…</> : <><Camera className="h-6 w-6" /> Bật camera</>}
          </Button>

        ) : (
          <div className="flex gap-2">
            <Button
              onClick={capture}
              disabled={loading}
              size="lg"
              className="h-16 flex-1 bg-accent text-accent-foreground text-base font-semibold hover:bg-accent/90"
            >
              {loading ? <><Loader2 className="h-6 w-6 animate-spin" /> Đang mô tả…</> : <><Sparkles className="h-6 w-6" /> Mô tả ngay</>}
            </Button>
            <Button onClick={stop} variant="destructive" size="lg" className="h-16 px-5" aria-label="Tắt camera">
              <CameraOff className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
