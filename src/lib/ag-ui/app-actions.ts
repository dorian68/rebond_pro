// Registre d'actions frontend contrôlées (CDC §9.4). Déclenchées uniquement
// via des événements Custom typés émis par le backend AG-UI.

export type AppActionDeps = {
  navigate: (path: string) => void;
  refresh: () => void;
  toast: (message: string, type?: "info" | "success" | "warn" | "error") => void;
};

const SAFE_PATH = /^\/[a-zA-Z0-9/_-]*$/;
const DRAFT_TARGETS = ["formation", "session", "prospect", "learner", "beneficiary", "trainer"] as const;

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
    case "app.form_draft": {
      const target = String(v.target ?? "");
      const path = String(v.path ?? "");
      const fields = v.fields && typeof v.fields === "object" ? v.fields : {};
      if (!DRAFT_TARGETS.includes(target as never) || !SAFE_PATH.test(path)) return false;
      try {
        window.localStorage.setItem(`lbr.document-intake.${target}`, JSON.stringify({
          target,
          fields,
          confidence: typeof v.confidence === "number" ? v.confidence : 0.75,
          missingFields: Array.isArray(v.missingFields) ? v.missingFields : [],
          warnings: Array.isArray(v.warnings) ? v.warnings : ["Brouillon préparé depuis Socrate."],
          evidence: Array.isArray(v.evidence) ? v.evidence : [],
          storedAt: Date.now(),
        }));
        deps.toast("Brouillon prêt : ouverture du formulaire.", "success");
        deps.navigate(path);
        return true;
      } catch {
        return false;
      }
    }
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
