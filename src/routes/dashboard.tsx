import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Link } from "@tanstack/react-router";
import { ScanEye, Compass, Sparkles, Bluetooth } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const actions = [
  { to: "/detection", icon: ScanEye, title: "Nhận diện vật thể", desc: "Bật camera và bắt đầu nhận diện", tone: "primary" },
  { to: "/find-cane", icon: Compass, title: "Tìm gậy của tôi", desc: "Định vị gậy thông minh", tone: "secondary" },
  { to: "/scene-description", icon: Sparkles, title: "Mô tả khung cảnh", desc: "AI mô tả xung quanh bạn", tone: "accent" },
];

function Dashboard() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "bạn";

  return (
    <AppShell>
      <div className="px-6 py-8">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">Xin chào,</p>
          <h1 className="mt-1 text-2xl font-bold">{name}</h1>
        </header>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bluetooth className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Gậy thông minh</p>
            <p className="text-xs text-muted-foreground">Chưa kết nối</p>
          </div>
        </div>

        <h2 className="mb-3 text-base font-semibold">Hành động nhanh</h2>
        <ul className="space-y-3">
          {actions.map(({ to, icon: Icon, title, desc, tone }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/5 active:scale-[0.99]"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                    tone === "primary" ? "bg-primary text-primary-foreground" :
                    tone === "secondary" ? "bg-secondary text-secondary-foreground" :
                    "bg-accent text-accent-foreground"
                  }`}
                >
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
