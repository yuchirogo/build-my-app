import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 1) {
      toast.error("Vui lòng nhập mật khẩu");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tạo tài khoản thành công");
    navigate({ to: "/onboarding" });
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Không thể đăng nhập với Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-6 py-8">
        <Link to="/" aria-label="Quay lại" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-5 w-5" /> Quay lại
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Tạo tài khoản</h1>
        <p className="mt-2 text-muted-foreground">Bắt đầu hành trình cùng BlindGuard AI</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 text-base" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">Mật khẩu</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 text-base" autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">Ít nhất 6 ký tự</p>
          </div>
          <Button type="submit" size="lg" disabled={loading} className="h-14 w-full text-base font-semibold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Đăng ký"}
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
          Đã có tài khoản?{" "}
          <Link to="/auth/login" className="font-semibold text-primary">Đăng nhập</Link>
        </p>
      </main>
    </div>
  );
}
