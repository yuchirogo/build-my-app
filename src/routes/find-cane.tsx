import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/find-cane")({
  component: FindCane,
});

function FindCane() {
  return (
    <AppShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <Compass className="h-16 w-16 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Tìm gậy của tôi</h1>
        <p className="mt-2 text-muted-foreground">Tính năng sẽ có ở Phase 3.</p>
      </div>
    </AppShell>
  );
}
