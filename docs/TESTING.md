# BlindGuard AI – Testing Strategy

## 1. Unit Tests (Vitest + jsdom)

Chạy: `bun run test` (hoặc `bun run test:watch`).

Phạm vi đã cover:
- **`src/lib/ble/kalman.test.ts`** – Kalman 1D hội tụ trên RSSI nhiễu, công thức `rssiToMeters`, bucket `metersToProximity`.
- **`src/lib/ble/uuids.test.ts`** – GATT UUID không đổi (khớp firmware ESP32), opcode `Commands`, parser telemetry 7 byte (battery clamp, rssi=0→null, distance=0xFFFF→null, type-byte sai → null, frame ngắn → null).
- **`src/lib/detection/labels-vi.test.ts`** – đủ 80 lớp COCO, dịch chuẩn, danh sách HIGH_PRIORITY chứa các vật thể nguy hiểm cho người khiếm thị.

Khi thêm logic mới:
- Tách logic thuần (không DOM/BLE/TFJS) ra file riêng → dễ unit test.
- Mock `navigator.bluetooth`, `MediaDevices`, `SpeechSynthesis` khi cần test hook.

## 2. Integration Tests (Camera + YOLO + TTS)

Không thể tự động hoá đầy đủ trong CI vì cần camera thật. Quy trình thủ công bắt buộc trước mỗi release:

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Vào `/detection`, cấp quyền camera | Khung hình hiển thị, FPS > 8 trên mid-range Android |
| 2 | Chĩa vào người + xe máy | Bounding box vẽ đúng, label tiếng Việt, TTS đọc "phía trước có…" |
| 3 | Chuyển chế độ "Theo lệnh" | Chỉ đọc top objects khi bấm, không spam |
| 4 | Bật cooldown test (2.5s) | Không lặp cùng một thông báo trong 2.5s |
| 5 | Cane đã ghép | Vật nguy hiểm gần → cane rung (haptic level 1-3 theo khoảng cách) |

## 3. User Testing với người khiếm thị (CRITICAL)

Mục tiêu: kiểm chứng UX bằng âm thanh + xúc giác, không bằng mắt.

Protocol:
1. **Recruit** 3-5 người dùng (mix: bẩm sinh / mất thị lực sau, có/chưa dùng smartphone).
2. **Tasks** (không hướng dẫn trực quan):
   - Cài PWA, đăng ký bằng Google.
   - Hoàn thành onboarding chỉ bằng giọng nói + TalkBack/VoiceOver.
   - Mở Detection và đi 10m trong hành lang có chướng ngại.
   - Đặt gậy ngẫu nhiên trong phòng, dùng Find My Cane để tìm.
   - Gọi khẩn cấp.
3. **Đo**: thời gian hoàn thành, số lần phải hỏi trợ giúp, false-positive cảnh báo, mức độ thoải mái (SUS 10 câu).
4. **Critical bug định nghĩa**: bất kỳ thao tác nào không thể hoàn thành chỉ bằng audio/haptic → block release.

## 4. Performance Tests

### FPS (Detection)
- Dùng Chrome DevTools → Performance Monitor trên thiết bị thật (Pixel 6a, Redmi Note 11).
- Mục tiêu: ≥ 10 FPS inference, ≥ 24 FPS render. Đang skip 2/3 frame trong `camera-view.tsx` để tiết kiệm GPU.
- Tự động: `browser--performance_profile` trên `/detection` để check long tasks.

### Battery
- Bật airplane mode + WiFi, sạc đầy, chạy `/detection` liên tục 30 phút, đo % pin trước/sau.
- Ngưỡng chấp nhận: ≤ 25% pin / 30 phút trên Pixel 6a.

### Latency
- TTS: đo `performance.now()` từ lúc detect → lúc `speechSynthesis.speak`. Mục tiêu < 200ms.
- BLE haptic: từ lúc gọi `cane.haptic(3)` → cane rung. Mục tiêu < 150ms (đo bằng video slow-motion).
- AI scene description: từ chụp frame → text trả về. Mục tiêu < 3s với Gemini 2.5 Flash.

## 5. Accessibility Tests

### Screen reader
- **Android**: TalkBack đọc trôi chảy mọi route. Tất cả icon-only Button đã có `aria-label`.
- **iOS**: VoiceOver, kiểm tra rotor navigation.
- **Desktop**: NVDA + Chrome.

### High contrast
- Toggle Windows High Contrast / iOS Smart Invert → đảm bảo dùng token `text-foreground` / `bg-background`, không hardcode màu.
- Tỉ lệ contrast tối thiểu: AA (4.5:1) cho body, AAA (7:1) cho cảnh báo nguy hiểm.

### Voice navigation
- Test các lệnh: "mở nhận diện", "tìm gậy", "mô tả cảnh", "dừng", "cài đặt".
- Test trong môi trường ồn (cafe, đường phố) — Web Speech API recognition có thể fail; fallback bằng nút bấm vật lý trên gậy.

### Tap targets
- Mọi button chính ≥ 44×44px. Đã dùng `h-14` cho primary CTA và `min-h-11 min-w-11` cho icon-only.

## 6. CI Gate (gợi ý)

```yaml
# .github/workflows/test.yml
- run: bun install
- run: bun run lint
- run: bun run test
- run: bun run build
```

Trên PR: block merge nếu unit tests fail. User testing + perf testing chạy thủ công trước mỗi release tag.
