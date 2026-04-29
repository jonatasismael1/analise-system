const CLEANUP_FLAG = "clinicpro_sw_cleanup_v2";

export function cleanupLegacyServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        if (registrations.length > 0 && navigator.serviceWorker.controller && sessionStorage.getItem(CLEANUP_FLAG) !== "done") {
          sessionStorage.setItem(CLEANUP_FLAG, "done");
          window.location.reload();
        }
      } catch (error) {
        console.warn("Não foi possível limpar o service worker antigo.", error);
      }
    })();
  });
}
