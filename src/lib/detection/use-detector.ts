import { useEffect, useRef, useState } from "react";

export interface Detection {
  label: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h (pixel)
}

interface DetectorHandle {
  ready: boolean;
  error: string | null;
  detect: (video: HTMLVideoElement) => Promise<Detection[]>;
}

/**
 * Object detector mạnh dùng YOLOv9 (gelan-c_all) chạy qua transformers.js + WebGPU/WASM,
 * thay thế COCO-SSD trước đây. Nhận diện tốt hơn các vật nhỏ, độ chính xác cao hơn rõ rệt.
 * Lần đầu tải mô hình mất ~30-60s (model ~50MB), sau đó cache offline.
 */
export function useDetector(minScore = 0.4): DetectorHandle {
  const pipeRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const busyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { pipeline, env } = await import("@huggingface/transformers");
        // Cho phép tải model từ HF hub, cache trong browser
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        // Ưu tiên WebGPU (nhanh hơn), fallback WASM
        let device: "webgpu" | "wasm" = "wasm";
        try {
          if (typeof navigator !== "undefined" && (navigator as any).gpu) device = "webgpu";
        } catch {}
        const pipe = await pipeline("object-detection", "Xenova/gelan-c_all", {
          device,
          dtype: device === "webgpu" ? "fp16" : "q8",
        });
        if (cancelled) return;
        pipeRef.current = pipe;
        // Canvas dùng chung để trích frame từ video
        if (typeof document !== "undefined") {
          canvasRef.current = document.createElement("canvas");
        }
        setReady(true);
      } catch (e: any) {
        console.error("YOLO load error:", e);
        setError(e?.message ?? "Không tải được mô hình YOLOv9");
      }
    })();
    return () => {
      cancelled = true;
      pipeRef.current?.dispose?.();
      pipeRef.current = null;
    };
  }, []);

  const detect = async (video: HTMLVideoElement): Promise<Detection[]> => {
    const pipe = pipeRef.current;
    const canvas = canvasRef.current;
    if (!pipe || !canvas || video.readyState < 2 || busyRef.current) return [];
    busyRef.current = true;
    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return [];
      // Hạ độ phân giải để tăng FPS, vẫn đủ chính xác cho 90% trường hợp
      const target = 640;
      const scale = target / Math.max(vw, vh);
      const w = Math.round(vw * scale);
      const h = Math.round(vh * scale);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return [];
      ctx.drawImage(video, 0, 0, w, h);

      const { RawImage } = await import("@huggingface/transformers");
      const image = await RawImage.fromCanvas(canvas as any);
      const output: any[] = await pipe(image, { threshold: minScore, percentage: false });

      // Quy đổi bbox về toạ độ video gốc
      const sx = vw / w;
      const sy = vh / h;
      const dets: Detection[] = output.map((o) => {
        const b = o.box;
        const x = b.xmin * sx;
        const y = b.ymin * sy;
        const bw = (b.xmax - b.xmin) * sx;
        const bh = (b.ymax - b.ymin) * sy;
        return { label: String(o.label), score: o.score, bbox: [x, y, bw, bh] };
      });
      // Lọc lại theo ngưỡng (an toàn) và sắp theo độ tự tin
      return dets.filter((d) => d.score >= minScore).sort((a, b) => b.score - a.score);
    } catch (e) {
      console.warn("YOLO detect error:", e);
      return [];
    } finally {
      busyRef.current = false;
    }
  };

  return { ready, error, detect };
}

/**
 * Ước lượng khoảng cách tương đối từ chiều cao bbox so với khung hình.
 */
export function estimateDistance(bboxHeight: number, frameHeight: number): "gần" | "trung bình" | "xa" {
  const ratio = bboxHeight / frameHeight;
  if (ratio > 0.5) return "gần";
  if (ratio > 0.2) return "trung bình";
  return "xa";
}
