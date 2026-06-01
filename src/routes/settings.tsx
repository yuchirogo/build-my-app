import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useSettings } from "@/hooks/use-settings";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVietnameseTTS, useVietnameseVoices } from "@/lib/detection/use-tts";
import { Volume2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update } = useSettings();
  const { speak } = useVietnameseTTS();
  const { voices, selectedURI, selectVoice } = useVietnameseVoices();

  return (
    <AppShell>
      <div className="space-y-8 px-6 py-8">
        <h1 className="text-2xl font-bold">Cài đặt</h1>

        <Section title="Giọng nói">
          <Row label="Giọng đọc">
            <Select
              value={selectedURI ?? "__auto__"}
              onValueChange={(v) => selectVoice(v === "__auto__" ? null : v)}
            >
              <SelectTrigger className="h-12 text-base" aria-label="Chọn giọng đọc">
                <SelectValue placeholder="Tự động (chị Google)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">Tự động (ưu tiên chị Google)</SelectItem>
                {voices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {voices.length === 0 && (
              <p className="text-xs text-muted-foreground">Thiết bị chưa có giọng tiếng Việt. Hãy cài thêm trong cài đặt hệ thống.</p>
            )}
          </Row>
          <Row label={`Tốc độ đọc: ${settings.speechRate.toFixed(2)}x`}>
            <Slider
              value={[settings.speechRate]}
              min={0.5} max={1.5} step={0.05}
              onValueChange={([v]) => update({ speechRate: v })}
              aria-label="Tốc độ đọc"
            />
          </Row>
          <Row label={`Âm lượng: ${Math.round(settings.volume * 100)}%`}>
            <Slider
              value={[settings.volume]}
              min={0} max={1} step={0.05}
              onValueChange={([v]) => update({ volume: v })}
              aria-label="Âm lượng"
            />
          </Row>
          <Button
            variant="outline" size="lg"
            className="h-12 w-full"
            onClick={() => speak("Đây là giọng đọc mẫu của BlindGuard AI", { rate: settings.speechRate, volume: settings.volume, priority: true })}
          >
            <Volume2 className="h-5 w-5" /> Nghe thử
          </Button>
        </Section>

        <Section title="Tính năng">
          <Toggle
            label="Rung haptic trên gậy"
            desc="Gậy rung khi có vật nguy hiểm"
            checked={settings.hapticEnabled}
            onChange={(v) => update({ hapticEnabled: v })}
          />
          <Toggle
            label="Lệnh giọng nói"
            desc='Nói "mở nhận diện", "tìm gậy", "mô tả cảnh"…'
            checked={settings.voiceCommandEnabled}
            onChange={(v) => update({ voiceCommandEnabled: v })}
          />
          <Toggle
            label="Chế độ ngoại tuyến"
            desc="Tải mô hình về máy để dùng khi mất mạng"
            checked={settings.offlineMode}
            onChange={(v) => update({ offlineMode: v })}
          />
        </Section>

        <Section title="Liên hệ khẩn cấp">
          <div className="space-y-2">
            <Label htmlFor="ename">Tên người thân</Label>
            <Input id="ename" value={settings.emergencyName} onChange={(e) => update({ emergencyName: e.target.value })} placeholder="Ví dụ: Mẹ" className="h-12 text-base" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ephone">Số điện thoại</Label>
            <Input id="ephone" type="tel" inputMode="tel" value={settings.emergencyPhone} onChange={(e) => update({ emergencyPhone: e.target.value })} placeholder="0901234567" className="h-12 text-base" />
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4">
      <div className="flex-1">
        <p className="text-base font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
