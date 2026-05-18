import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, isOnboardingComplete } from "@/hooks/use-auth";
import { BottomNav } from "./bottom-nav";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth/login" });
    } else if (!isOnboardingComplete()) {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-md">{children}</main>
      <BottomNav />
    </div>
  );
}
