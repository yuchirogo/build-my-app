import { useRef, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useVietnameseTTS } from "@/lib/detection/use-tts";
import { Phone, PhoneOff, MapPin, MessageSquare, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getCurrentLocation, buildEmergencyMessage, mapsLink } from "@/lib/emergency/location";
import { toast } from "sonner";

/**
 * Nút khẩn cấp:
 *  - Chạm nhanh: gọi điện ngay (tel:)
 *  - Giữ 1.2 giây: gửi SMS kèm vị trí GPS + đọc to
 *  - Nút phụ: chỉ chia sẻ vị trí (Web Share nếu có)
 */
export function EmergencyButton() {
  const { settings } = useSettings();
  const { speak } = useVietnameseTTS();
  const [busy, setBusy] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const heldRef = useRef(false);

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

  const sendSms = async () => {
    setBusy(true);
    speak("Đang gửi tin nhắn khẩn cấp kèm vị trí", { priority: true });
    try {
      const coords = await getCurrentLocation();
      const body = buildEmergencyMessage(settings.emergencyName, coords);
      // sms: URI — Android/iOS mở app tin nhắn với nội dung soạn sẵn
      const url = `sms:${settings.emergencyPhone}${/iphone|ipad|mac/i.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(body)}`;
      window.location.href = url;
      toast.success(coords ? "Đã đính kèm vị trí" : "Không lấy được GPS, đã gửi tin");
    } catch {
      toast.error("Không mở được ứng dụng tin nhắn");
    } finally {
      setBusy(false);
    }
  };

  const shareLocation = async () => {
    setBusy(true);
    try {
      const coords = await getCurrentLocation();
      if (!coords) {
        toast.error("Không lấy được vị trí GPS");
        speak("Không lấy được vị trí", { priority: true });
        return;
      }
      const text = buildEmergencyMessage(settings.emergencyName, coords);
      const link = mapsLink(coords);
      if (navigator.share) {
        await navigator.share({ title: "Vị trí khẩn cấp", text, url: link }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(text).catch(() => {});
        toast.success("Đã sao chép vị trí vào bộ nhớ tạm");
      }
      speak("Đã chia sẻ vị trí", { priority: true });
    } finally {
      setBusy(false);
    }
  };

  const onPointerDown = () => {
    heldRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      heldRef.current = true;
      sendSms();
    }, 1200);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (heldRef.current) {
      e.preventDefault();
      return;
    }
    // Chạm nhanh: gọi
    speak(`Đang gọi ${settings.emergencyName || "người thân"}`, { priority: true });
    window.location.href = `tel:${settings.emergencyPhone}`;
  };
  const onPointerCancel = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return (
    <div className="space-y-2">
      <button
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerCancel}
        onPointerCancel={onPointerCancel}
        disabled={busy}
        className="flex w-full items-center gap-3 rounded-2xl bg-destructive p-4 text-left text-destructive-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-70"
        aria-label={`Gọi khẩn cấp tới ${settings.emergencyName || settings.emergencyPhone}. Giữ 1 giây để gửi tin nhắn kèm vị trí.`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive-foreground/15">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" aria-hidden />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Gọi khẩn cấp</p>
          <p className="text-xs opacity-90">
            {settings.emergencyName ? `${settings.emergencyName} · ` : ""}{settings.emergencyPhone}
          </p>
          <p className="mt-0.5 text-[11px] opacity-75">Giữ 1 giây để gửi SMS kèm vị trí GPS</p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={sendSms}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium transition-colors hover:bg-muted/30 disabled:opacity-60"
        >
          <MessageSquare className="h-4 w-4" aria-hidden /> Gửi SMS
        </button>
        <button
          onClick={shareLocation}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium transition-colors hover:bg-muted/30 disabled:opacity-60"
        >
          <MapPin className="h-4 w-4" aria-hidden /> Chia sẻ vị trí
        </button>
      </div>
    </div>
  );
}
