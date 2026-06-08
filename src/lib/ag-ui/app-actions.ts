// Registre d'actions frontend contrôlées (CDC §9.4). Déclenchées uniquement
// via des événements Custom typés émis par le backend AG-UI.

export type AppActionDeps = {
  navigate: (path: string) => void;
  refresh: () => void;
  toast: (message: string, type?: "info" | "success" | "warn" | "error") => void;
};

const SAFE_PATH = /^\/[a-zA-Z0-9/_-]*$/;

export function dispatchAppAction(name: string, value: unknown, deps: AppActionDeps): boolean {
  const v = (value ?? {}) as Record<string, unknown>;
  switch (name) {
    case "app.navigate": {
      const path = String(v.path ?? "");
      if (SAFE_PATH.test(path)) { deps.navigate(path); return true; }
      return false;
    }
    case "app.refresh":
      deps.refresh();
      return true;
    case "app.toast":
      deps.toast(String(v.message ?? ""), (v.type as "info" | "success" | "warn" | "error") ?? "info");
      return true;
    case "app.highlight": {
      const selector = String(v.selector ?? "");
      if (typeof document !== "undefined" && selector) {
        const el = document.querySelector(selector);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el instanceof HTMLElement) {
          el.style.transition = "outline .3s";
          el.style.outline = "2px solid var(--primary)";
          setTimeout(() => { el.style.outline = ""; }, 1600);
        }
        return true;
      }
      return false;
    }
    default:
      return false;
  }
}
