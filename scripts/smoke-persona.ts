import "./_env";
import { resolvePersona, isToolAllowed } from "../src/lib/ag-ui/persona";

function step(label: string, details?: unknown) { console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) })); }
function assert(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }

try {
  // Résolution du persona
  assert(resolvePersona({ hasSession: false, role: null, isPlatformAdmin: false }) === "visitor", "Sans session → visitor.");
  assert(resolvePersona({ hasSession: true, role: "LEARNER", pathname: "/espace", isPlatformAdmin: false }) === "beneficiary", "LEARNER → beneficiary.");
  assert(resolvePersona({ hasSession: true, role: "TRAINER", pathname: "/trainer", isPlatformAdmin: false }) === "trainer", "TRAINER → trainer.");
  assert(resolvePersona({ hasSession: true, role: "OWNER", pathname: "/dashboard", isPlatformAdmin: false }) === "center", "OWNER → center.");
  assert(resolvePersona({ hasSession: true, role: "OWNER", pathname: "/admin", isPlatformAdmin: true }) === "platform_admin", "Admin sur /admin → platform_admin.");
  assert(resolvePersona({ hasSession: true, role: "OWNER", pathname: "/admin", isPlatformAdmin: false }) === "center", "Non-admin sur /admin → center (pas god-mode).");
  step("persona_resolution");

  // Périmètre d'outils par persona (sécurité)
  assert(isToolAllowed("visitor", "search_catalog") && !isToolAllowed("visitor", "create_formation"), "Visiteur : catalogue oui, création non.");
  assert(isToolAllowed("visitor", "bilan_info") && !isToolAllowed("visitor", "get_dashboard_metrics"), "Visiteur : pas d'accès tenant.");
  assert(isToolAllowed("beneficiary", "get_my_bilan") && !isToolAllowed("beneficiary", "delete_session"), "Bénéficiaire : son bilan oui, suppression session non.");
  assert(isToolAllowed("trainer", "get_my_trainer_planning") && !isToolAllowed("trainer", "create_prospect"), "Formateur : planning oui, CRM non.");
  assert(isToolAllowed("center", "create_formation") && isToolAllowed("center", "delete_session"), "Centre : périmètre complet.");
  assert(isToolAllowed("platform_admin", "platform_overview") && !isToolAllowed("platform_admin", "create_formation"), "Admin : lecture cross-tenant oui, écriture non.");
  step("tool_scoping_security");

  step("persona_smoke_complete");
} catch (e) {
  console.error(JSON.stringify({ step: "persona_smoke", status: "fail", error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
