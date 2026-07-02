// Đăng ký service worker cho chế độ offline.
// KHÔNG đăng ký trong Lovable preview / iframe / dev để tránh cache sai và trắng trang.
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const isPreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev") ||
    host === "localhost" ||
    host === "127.0.0.1";
  const inIframe = window.self !== window.top;
  const killSwitch = url.searchParams.get("sw") === "off";

  if (isPreview || inIframe || killSwitch || !import.meta.env.PROD) {
    // Dọn dẹp SW cũ nếu có
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => {
        if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister().catch(() => {});
      });
    }).catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW register failed", err);
    });
  });
}
