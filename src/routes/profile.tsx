import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold">Cá nhân</h1>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border bg-card p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Tài khoản BlindGuard AI</p>
          </div>
        </div>

        <Button
          onClick={async () => { await signOut(); navigate({ to: "/auth/login" }); }}
          variant="outline"
          size="lg"
          className="mt-8 h-14 w-full text-base"
        >
          <LogOut className="h-5 w-5" /> Đăng xuất
        </Button>
      </div>
    </AppShell>
  );
}
