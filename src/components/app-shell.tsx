import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isOnboardingComplete } from "@/hooks/use-auth";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOnboardingComplete()) navigate({ to: "/onboarding" });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-md">{children}</main>
      <BottomNav />
    </div>
  );
}
