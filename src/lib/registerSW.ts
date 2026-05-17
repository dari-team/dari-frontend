// Registers the PWA service worker after the page loads.
// Auto-prompts to reload when a new version of the SW is waiting.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Only register on https (or localhost) — Vite dev serves http on LAN
  if (
    window.location.protocol !== "https:" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  )
    return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for an updated worker on every page load.
        reg.update().catch(() => {});

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — activate immediately.
              newWorker.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        // Silent failure — site still works without the SW.
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
