import { Link, useLocation } from "@tanstack/react-router";
import { Home, ScanEye, Compass, Settings as SettingsIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Trang chủ", icon: Home },
  { to: "/detection", label: "Nhận diện", icon: ScanEye },
  { to: "/find-cane", label: "Tìm gậy", icon: Compass },
  { to: "/settings", label: "Cài đặt", icon: SettingsIcon },
  { to: "/profile", label: "Cá nhân", icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
