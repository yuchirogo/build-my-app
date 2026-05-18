import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/scene-description")({
  component: Scene,
});

function Scene() {
  return (
    <AppShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <Sparkles className="h-16 w-16 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Mô tả khung cảnh</h1>
        <p className="mt-2 text-muted-foreground">Tính năng sẽ có ở Phase 4.</p>
      </div>
    </AppShell>
  );
}
