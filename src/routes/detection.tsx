import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, isOnboardingComplete } from "@/hooks/use-auth";
import { CameraView } from "@/components/camera-view";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/detection")({
  component: DetectionPage,
});

function DetectionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isOnboardingComplete()) navigate({ to: "/onboarding" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <ClientOnly fallback={<div className="flex min-h-screen items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}>
      <CameraView />
    </ClientOnly>
  );
}
