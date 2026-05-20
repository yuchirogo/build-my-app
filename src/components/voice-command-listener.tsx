import { useNavigate } from "@tanstack/react-router";
import { useSettings } from "@/hooks/use-settings";
import { useVoiceCommand } from "@/hooks/use-voice-command";
import { useVietnameseTTS } from "@/lib/detection/use-tts";
import { useMemo } from "react";

/**
 * Lắng nghe lệnh giọng nói toàn app. Đặt trong AppShell.
 */
export function VoiceCommandListener() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { speak, stop } = useVietnameseTTS();

  const commands = useMemo(() => [
    { label: "Mở nhận diện", match: /(mở|bật).*(nhận diện|camera)/, action: () => { speak("Mở nhận diện", { priority: true }); navigate({ to: "/detection" }); } },
    { label: "Tìm gậy", match: /tìm.*gậy/, action: () => { speak("Đang mở tìm gậy", { priority: true }); navigate({ to: "/find-cane" }); } },
    { label: "Mô tả cảnh", match: /mô tả.*(cảnh|xung quanh)/, action: () => { speak("Đang mở mô tả khung cảnh", { priority: true }); navigate({ to: "/scene-description" }); } },
    { label: "Về trang chính", match: /(về|mở).*(trang chính|chính|dashboard|trang chủ)/, action: () => navigate({ to: "/dashboard" }) },
    { label: "Cài đặt", match: /(mở )?cài đặt/, action: () => navigate({ to: "/settings" }) },
    { label: "Dừng", match: /^(dừng|tắt tiếng|im lặng)/, action: () => stop() },
  ], [navigate, speak, stop]);

  useVoiceCommand({ enabled: settings.voiceCommandEnabled, commands });
  return null;
}
