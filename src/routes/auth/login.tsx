import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { isOnboardingComplete } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đăng nhập thành công");
    navigate({ to: isOnboardingComplete() ? "/dashboard" : "/onboarding" });
  };

  const isLovableHost =
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith(".lovable.app") ||
      window.location.hostname.endsWith(".lovable.dev"));

  const onGoogle = async () => {
    if (!isLovableHost) {
      toast.error(
        "Đăng nhập Google chỉ hoạt động trên Preview/Published (*.lovable.app). Khi chạy local hãy dùng Email/Mật khẩu."
      );
      return;
    }
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setLoading(false);
        toast.error("Không thể đăng nhập với Google");
        return;
      }
      if (result.redirected) return;
      navigate({ to: isOnboardingComplete() ? "/dashboard" : "/onboarding" });
    } catch {
      setLoading(false);
      toast.error("Đăng nhập Google không khả dụng ở môi trường này");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-6 py-8">
        <Link to="/" aria-label="Quay lại" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-5 w-5" /> Quay lại
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Đăng nhập</h1>
        <p className="mt-2 text-muted-foreground">Chào mừng bạn quay trở lại</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 text-base" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">Mật khẩu</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 text-base" autoComplete="current-password" />
          </div>
          <Link to="/auth/forgot-password" className="block text-right text-sm font-medium text-primary">
            Quên mật khẩu?
          </Link>
          <Button type="submit" size="lg" disabled={loading} className="h-14 w-full text-base font-semibold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Đăng nhập"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">HOẶC</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button onClick={onGoogle} variant="outline" size="lg" disabled={loading} className="h-14 w-full text-base">
          Tiếp tục với Google
        </Button>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link to="/auth/register" className="font-semibold text-primary">Đăng ký</Link>
        </p>
      </main>
    </div>
  );
}
