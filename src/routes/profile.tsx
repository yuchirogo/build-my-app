import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  return (
    <AppShell>
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold">Cá nhân</h1>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border bg-card p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold">Khách</p>
            <p className="text-xs text-muted-foreground">Đang dùng BlindGuard AI ở chế độ không cần đăng nhập</p>
          </div>
        </div>

        <Button asChild variant="outline" size="lg" className="mt-8 h-14 w-full text-base">
          <Link to="/settings"><SettingsIcon className="h-5 w-5" /> Mở cài đặt</Link>
        </Button>
      </div>
    </AppShell>
  );
}
