import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ScanEye } from "lucide-react";

export const Route = createFileRoute("/detection")({
  component: Detection,
});

function Detection() {
  return (
    <AppShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <ScanEye className="h-16 w-16 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Nhận diện vật thể</h1>
        <p className="mt-2 text-muted-foreground">Tính năng sẽ có ở Phase 2.</p>
      </div>
    </AppShell>
  );
}
