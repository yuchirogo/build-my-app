import { useEffect, useRef, useState } from "react";
import { COCO_CLASSES } from "./coco-classes";

export interface Detection {
  label: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h (theo pixel video)
}

interface DetectorHandle {
  ready: boolean;
  error: string | null;
  detect: (video: HTMLVideoElement) => Promise<Detection[]>;
}

// YOLOv8n web model (graph model TFJS) — chính xác hơn coco-ssd, vẫn nhẹ
// Nguồn: https://github.com/Hyuto/yolov8-tfjs (mirror trên jsDelivr)
const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/Hyuto/yolov8-tfjs@master/public/yolov8n_web_model/model.json";
const INPUT_SIZE = 640;

/**
 * Tải YOLOv8n (TFJS graph model). Tự fallback backend: webgl → wasm → cpu
 * để chạy được trên gần như mọi thiết bị (mobile, low-end, iOS Safari).
 */
export function useDetector(minScore = 0.35, iouThreshold = 0.45): DetectorHandle {
  const modelRef = useRef<any>(null);
  const tfRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        // Thử backend theo thứ tự: webgl (nhanh) → wasm → cpu
        const backends = ["webgl", "wasm", "cpu"];
        let chosen = "cpu";
        for (const b of backends) {
          try {
            if (b === "wasm") await import(/* @vite-ignore */ ("@tensorflow/tfjs-backend-wasm" as string)).catch(() => null);
            await tf.setBackend(b);
            await tf.ready();
            chosen = b;
            break;
          } catch {
            /* try next */
          }
        }
        // Warmup + load
        const model = await tf.loadGraphModel(MODEL_URL);
        // Warmup 1 lần để JIT compile shader, lần detect đầu sẽ không lag
        const dummy = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
        const out = model.execute(dummy) as any;
        tf.dispose(out);
        tf.dispose(dummy);
        if (cancelled) {
          model.dispose?.();
          return;
        }
        tfRef.current = tf;
        modelRef.current = model;
        setReady(true);
        console.info("[YOLOv8] sẵn sàng – backend:", chosen);
      } catch (e: any) {
        console.error("[YOLOv8] load lỗi:", e);
        setError(e?.message ?? "Không tải được mô hình YOLOv8");
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
    const tf = tfRef.current;
    if (!model || !tf || video.readyState < 2) return [];

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return [];

    // Letterbox preprocess: resize giữ tỉ lệ về 640x640, pad màu xám
    const { input, ratio, padX, padY } = tf.tidy(() => {
      const img = tf.browser.fromPixels(video);
      const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
      const nw = Math.round(vw * scale);
      const nh = Math.round(vh * scale);
      const resized = tf.image.resizeBilinear(img, [nh, nw]);
      const pX = Math.floor((INPUT_SIZE - nw) / 2);
      const pY = Math.floor((INPUT_SIZE - nh) / 2);
      const padded = resized.pad(
        [[pY, INPUT_SIZE - nh - pY], [pX, INPUT_SIZE - nw - pX], [0, 0]],
        114
      );
      const normalized = padded.div(255).expandDims(0);
      return { input: normalized, ratio: scale, padX: pX, padY: pY };
    });

    let raw: any;
    try {
      raw = await model.executeAsync(input);
    } catch {
      raw = model.execute(input);
    }
    input.dispose();

    // Output YOLOv8: [1, 84, 8400] — 4 box + 80 class
    const output = Array.isArray(raw) ? raw[0] : raw;
    const data = await output.data();
    const [, channels, anchors] = output.shape;
    tf.dispose(raw);

    const numClasses = channels - 4;
    const candidates: Detection[] = [];

    for (let i = 0; i < anchors; i++) {
      // Tìm class có score cao nhất
      let bestScore = 0;
      let bestCls = -1;
      for (let c = 0; c < numClasses; c++) {
        const s = data[(4 + c) * anchors + i];
        if (s > bestScore) {
          bestScore = s;
          bestCls = c;
        }
      }
      if (bestScore < minScore) continue;

      const cx = data[0 * anchors + i];
      const cy = data[1 * anchors + i];
      const w = data[2 * anchors + i];
      const h = data[3 * anchors + i];

      // Bỏ padding & scale về tọa độ video gốc
      const x = (cx - w / 2 - padX) / ratio;
      const y = (cy - h / 2 - padY) / ratio;
      const bw = w / ratio;
      const bh = h / ratio;

      candidates.push({
        label: COCO_CLASSES[bestCls] ?? "object",
        score: bestScore,
        bbox: [
          Math.max(0, x),
          Math.max(0, y),
          Math.min(vw - Math.max(0, x), bw),
          Math.min(vh - Math.max(0, y), bh),
        ],
      });
    }

    return nms(candidates, iouThreshold).slice(0, 20);
  };

  return { ready, error, detect };
}

// Non-Max Suppression (per class)
function nms(dets: Detection[], iouTh: number): Detection[] {
  const byClass = new Map<string, Detection[]>();
  for (const d of dets) {
    if (!byClass.has(d.label)) byClass.set(d.label, []);
    byClass.get(d.label)!.push(d);
  }
  const kept: Detection[] = [];
  for (const arr of byClass.values()) {
    arr.sort((a, b) => b.score - a.score);
    const picked: Detection[] = [];
    for (const d of arr) {
      if (picked.some((p) => iou(p.bbox, d.bbox) > iouTh)) continue;
      picked.push(d);
    }
    kept.push(...picked);
  }
  return kept.sort((a, b) => b.score - a.score);
}

function iou(a: [number, number, number, number], b: [number, number, number, number]) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw);
  const y2 = Math.min(ay + ah, by + bh);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = aw * ah + bw * bh - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Ước lượng khoảng cách tương đối từ chiều cao bbox so với khung hình.
 */
export function estimateDistance(
  bboxHeight: number,
  frameHeight: number
): "gần" | "trung bình" | "xa" {
  const ratio = bboxHeight / frameHeight;
  if (ratio > 0.5) return "gần";
  if (ratio > 0.2) return "trung bình";
  return "xa";
}
