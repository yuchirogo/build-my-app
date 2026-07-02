import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Settings2, RefreshCw } from "lucide-react";
import type { CameraError } from "@/lib/native/camera-flow";
import { openAppSettings } from "@/lib/native/camera-flow";
import { useState } from "react";

interface Props {
  error: CameraError;
  onRetry: () => void;
  /** Nếu cần reload để trình duyệt reset trạng thái Prompt (một số bản Chrome). */
  onReload?: () => void;
}

/**
 * Hộp thoại hướng dẫn khi camera bị từ chối / lỗi.
 * Có nút Thử lại, mở Cài đặt hệ thống (native), và tải lại trang (web).
 */
export function CameraPermissionHelp({ error, onRetry, onReload }: Props) {
  const [opening, setOpening] = useState(false);

  const handleOpenSettings = async () => {
    setOpening(true);
    try {
      const ok = await openAppSettings();
      if (!ok) {
        // Không mở được — người dùng phải tự vào Settings
      }
    } finally {
      setOpening(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="camperm-title"
      aria-describedby="camperm-desc"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center text-white backdrop-blur-sm"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20 text-secondary">
        <AlertTriangle className="h-8 w-8" aria-hidden />
      </div>
      <h2 id="camperm-title" className="text-xl font-bold">
        {error.title}
      </h2>
      <p id="camperm-desc" className="max-w-md text-base leading-relaxed text-white/85">
        {error.message}
      </p>

      {error.steps.length > 0 && (
        <ol className="mx-auto max-w-md list-decimal space-y-1 rounded-xl bg-white/5 p-4 pl-6 text-left text-sm text-white/90">
          {error.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      <div className="mt-2 flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <Button
          onClick={onRetry}
          size="lg"
          className="h-14 flex-1 text-base font-semibold"
        >
          <RotateCcw className="h-5 w-5" /> Thử lại
        </Button>

        {error.canOpenSettings && (
          <Button
            onClick={handleOpenSettings}
            size="lg"
            variant="secondary"
            className="h-14 flex-1 text-base font-semibold"
            disabled={opening}
          >
            <Settings2 className="h-5 w-5" /> Mở cài đặt
          </Button>
        )}

        {!error.canOpenSettings && onReload && (
          <Button
            onClick={onReload}
            size="lg"
            variant="secondary"
            className="h-14 flex-1 text-base font-semibold"
          >
            <RefreshCw className="h-5 w-5" /> Tải lại trang
          </Button>
        )}
      </div>
    </div>
  );
}
