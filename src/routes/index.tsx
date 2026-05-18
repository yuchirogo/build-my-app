import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, isOnboardingComplete } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Eye, Bluetooth, Mic, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: isOnboardingComplete() ? "/dashboard" : "/onboarding" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
            <Eye className="h-10 w-10" aria-hidden />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            BlindGuard AI
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Đôi mắt thông minh đồng hành cùng bạn trên mọi nẻo đường
          </p>
        </header>

        <ul className="mb-10 space-y-4" aria-label="Tính năng chính">
          <Feature icon={Eye} title="Nhận diện vật thể" desc="Phát hiện chướng ngại vật theo thời gian thực bằng AI." />
          <Feature icon={Mic} title="Phản hồi tiếng Việt" desc="Thông báo bằng giọng nói rõ ràng, tự nhiên." />
          <Feature icon={Bluetooth} title="Gậy thông minh" desc="Kết nối Bluetooth, tìm gậy khi bị thất lạc." />
          <Feature icon={ShieldCheck} title="An toàn & riêng tư" desc="Mọi xử lý ưu tiên trên thiết bị của bạn." />
        </ul>

        <div className="mt-auto space-y-3">
          <Button asChild size="lg" className="h-14 w-full text-base font-semibold">
            <Link to="/auth/register">Bắt đầu ngay</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-14 w-full text-base">
            <Link to="/auth/login">Đã có tài khoản? Đăng nhập</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <li className="flex gap-4 rounded-2xl border bg-card p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}
