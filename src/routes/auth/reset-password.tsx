import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Mật khẩu cần ít nhất 6 ký tự");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đổi mật khẩu thành công");
    navigate({ to: "/auth/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-6 py-8">
        <h1 className="text-3xl font-bold">Đặt mật khẩu mới</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">Mật khẩu mới</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 text-base" autoComplete="new-password" />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="h-14 w-full text-base font-semibold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Cập nhật mật khẩu"}
          </Button>
        </form>
      </main>
    </div>
  );
}
