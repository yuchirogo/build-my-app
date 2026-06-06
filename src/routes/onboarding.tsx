import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Bluetooth, Eye, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setOnboardingComplete } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const steps = [
  {
    icon: Eye,
    title: "Chào mừng đến BlindGuard AI",
    desc: "Trợ thủ AI giúp bạn di chuyển độc lập và an toàn mỗi ngày.",
    cta: "Tiếp tục",
  },
  {
    icon: Bluetooth,
    title: "Ghép nối gậy thông minh",
    desc: "Kết nối với gậy ESP32 qua Bluetooth. Bạn có thể bỏ qua và làm sau.",
    cta: "Tiếp tục",
  },
  {
    icon: Sparkles,
    title: "Sẵn sàng!",
    desc: "Bạn đã hoàn tất thiết lập. Hãy bắt đầu khám phá BlindGuard AI.",
    cta: "Bắt đầu sử dụng",
  },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const completeOnboarding = () => {
    setOnboardingComplete();
    navigate({ to: "/dashboard" });
  };

  const handlePrimary = () => {
    if (isLast) {
      completeOnboarding();
      return;
    }

    setStep((value) => value + 1);
  };

  const handleSkip = () => {
    if (isLast) {
      return;
    }

    setStep((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          >
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  index <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {!isLast && (
            <button
              type="button"
              onClick={completeOnboarding}
              className="text-sm font-medium text-muted-foreground"
            >
              Bỏ qua
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-14 w-14" aria-hidden />
          </div>

          <h1 className="text-2xl font-bold text-foreground">{current.title}</h1>
          <p className="mt-4 max-w-sm text-base text-muted-foreground">{current.desc}</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handlePrimary}
            size="lg"
            className="h-14 w-full text-base font-semibold"
          >
            <span className="inline-flex items-center gap-2">
              {current.cta}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </span>
          </Button>

          {!isLast && (
            <Button onClick={handleSkip} variant="ghost" size="lg" className="h-12 w-full">
              Bỏ qua bước này
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
