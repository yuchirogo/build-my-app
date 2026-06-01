import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { CameraView } from "@/components/camera-view";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/detection")({
  component: DetectionPage,
});

function DetectionPage() {
  return (
    <ClientOnly fallback={<div className="flex min-h-screen items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}>
      <CameraView />
    </ClientOnly>
  );
}
