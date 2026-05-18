import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Đã gửi email khôi phục");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-6 py-8">
        <Link to="/auth/login" aria-label="Quay lại" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-5 w-5" /> Đăng nhập
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Quên mật khẩu</h1>
        <p className="mt-2 text-muted-foreground">Nhập email để nhận liên kết khôi phục.</p>

        {sent ? (
          <div className="mt-8 rounded-2xl border bg-card p-6">
            <p className="text-base">Vui lòng kiểm tra hộp thư <strong>{email}</strong> để đặt lại mật khẩu.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 text-base" />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="h-14 w-full text-base font-semibold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gửi liên kết khôi phục"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
