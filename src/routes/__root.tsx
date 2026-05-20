import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { CaneProvider } from "@/hooks/use-cane";
import { SettingsProvider } from "@/hooks/use-settings";
import { VoiceCommandListener } from "@/components/voice-command-listener";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { name: "theme-color", content: "#1E3A8A" },
      { title: "BlindGuard AI - Hỗ trợ người khiếm thị" },
      { name: "description", content: "Ứng dụng hỗ trợ người khiếm thị nhận diện vật thể và kết nối gậy thông minh." },
      { name: "author", content: "BlindGuard AI" },
      { property: "og:title", content: "BlindGuard AI - Hỗ trợ người khiếm thị" },
      { property: "og:description", content: "Ứng dụng hỗ trợ người khiếm thị nhận diện vật thể và kết nối gậy thông minh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "BlindGuard AI - Hỗ trợ người khiếm thị" },
      { name: "twitter:description", content: "Ứng dụng hỗ trợ người khiếm thị nhận diện vật thể và kết nối gậy thông minh." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1c04c0f9-b144-40c1-8106-defff2f1c628/id-preview-4d918992--abfa69f2-f597-4089-9fd7-71d7a9f99791.lovable.app-1779070611573.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1c04c0f9-b144-40c1-8106-defff2f1c628/id-preview-4d918992--abfa69f2-f597-4089-9fd7-71d7a9f99791.lovable.app-1779070611573.png" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { registerServiceWorker(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <CaneProvider>
            <VoiceCommandListener />
            <Outlet />
            <Toaster position="top-center" />
          </CaneProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
