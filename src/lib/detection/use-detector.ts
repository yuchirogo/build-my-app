import { useEffect, useRef, useState } from "react";

export interface Detection {
  label: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h
}

interface DetectorHandle {
  ready: boolean;
  error: string | null;
  detect: (video: HTMLVideoElement) => Promise<Detection[]>;
}

/**
 * Load TFJS + COCO-SSD lazily ở client.
 * Kiến trúc giống YOLOv8n (80 lớp COCO) — có thể swap sang YOLOv8 TFJS sau.
 */
export function useDetector(minScore = 0.5): DetectorHandle {
  const modelRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }
        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (cancelled) return;
        modelRef.current = model;
        setReady(true);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Không tải được mô hình");
      }
    })();
    return () => {
      cancelled = true;
      modelRef.current?.dispose?.();
      modelRef.current = null;
    };
  }, []);

  const detect = async (video: HTMLVideoElement): Promise<Detection[]> => {
    const model = modelRef.current;
    if (!model || video.readyState < 2) return [];
    const preds = await model.detect(video, 20, minScore);
    return preds.map((p: any) => ({
      label: p.class,
      score: p.score,
      bbox: p.bbox as [number, number, number, number],
    }));
  };

  return { ready, error, detect };
}

/**
 * Ước lượng khoảng cách tương đối từ chiều cao bbox so với khung hình.
 * Không chính xác như ToF, chỉ để gợi ý gần/xa.
 */
export function estimateDistance(bboxHeight: number, frameHeight: number): "gần" | "trung bình" | "xa" {
  const ratio = bboxHeight / frameHeight;
  if (ratio > 0.5) return "gần";
  if (ratio > 0.2) return "trung bình";
  return "xa";
}
