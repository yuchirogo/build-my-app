import { useSettings } from "@/hooks/use-settings";
import { useVietnameseTTS } from "@/lib/detection/use-tts";
import { Phone, PhoneOff } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function EmergencyButton() {
  const { settings } = useSettings();
  const { speak } = useVietnameseTTS();
  const hasContact = settings.emergencyPhone.trim().length > 0;

  if (!hasContact) {
    return (
      <Link
        to="/settings"
        className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-card p-4 text-muted-foreground transition-colors hover:bg-muted/30"
      >
        <PhoneOff className="h-5 w-5" aria-hidden />
        <p className="text-sm">Thêm liên hệ khẩn cấp trong Cài đặt</p>
      </Link>
    );
  }

  const onClick = () => {
    speak(`Đang gọi ${settings.emergencyName || "người thân"}`, { priority: true });
  };

  return (
    <a
      href={`tel:${settings.emergencyPhone}`}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl bg-destructive p-4 text-destructive-foreground shadow-md transition-transform active:scale-[0.98]"
      aria-label={`Gọi khẩn cấp tới ${settings.emergencyName}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive-foreground/15">
        <Phone className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Gọi khẩn cấp</p>
        <p className="text-xs opacity-90">
          {settings.emergencyName ? `${settings.emergencyName} · ` : ""}{settings.emergencyPhone}
        </p>
      </div>
    </a>
  );
}
