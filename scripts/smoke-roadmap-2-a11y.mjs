import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const client = read("src/app/admin/roadmap-2/roadmap2-client.tsx");
const graph = read("src/app/admin/roadmap-2/roadmap2-graph.tsx");
const detail = read("src/app/admin/roadmap-2/roadmap2-detail.tsx");
const list = read("src/app/admin/roadmap-2/roadmap2-list.tsx");
const labels = read("src/lib/roadmap2.ts");
const css = read("src/app/admin/roadmap-2/roadmap2.module.css");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function step(label, details) {
  console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) }));
}

try {
  assert(client.includes('role="tablist"') && client.includes('role="tab"') && client.includes('aria-selected='), "Les changements de vue doivent exposer la sémantique onglets.");
  assert(client.includes('aria-live="polite"') && client.includes('role="status"'), "Les sauvegardes et erreurs doivent être annoncées.");
  assert(client.includes('aria-label="Rechercher un nœud"'), "La recherche doit avoir un label accessible.");
  assert(client.includes('aria-label="Choisir une roadmap"') && client.includes('aria-label="Renommer la roadmap active"'), "Le sélecteur de roadmap et son action de renommage doivent être nommés.");
  assert(client.includes('aria-labelledby="workspace-config-title"') && client.includes('Créer une roadmap vide'), "La création d’une roadmap doit utiliser un dialogue accessible.");
  assert(client.includes('event.key === "Escape"') && client.includes('event.key !== "Tab"') && client.includes("modalReturnFocusRef.current.focus()"), "Les dialogues de configuration doivent gérer Escape, confiner Tab et restituer le focus.");
  assert(client.includes('aria-label="Contenu du dossier Google Drive"') && client.includes('aria-label="Actualiser le contenu Drive"'), "L’explorateur Drive doit être identifié et ses actions iconiques nommées.");
  step("landmarks_and_announcements");

  assert(graph.includes('tabIndex={0}') && graph.includes('event.key === "Enter"') && graph.includes('edgesFocusable'), "Le graphe doit exposer un accès clavier.");
  assert(detail.includes('event.key === "Escape"') && detail.includes('event.key !== "Tab"') && detail.includes("previousFocusRef.current?.focus()") && detail.includes('aria-modal="true"') && detail.includes('aria-label="Fermer le panneau"'), "Le panneau doit confiner Tab, restaurer le focus, être fermable au clavier et annoncé comme modal.");
  assert(detail.includes("onDrop={handleDrop}") && detail.includes('role="button"') && detail.includes("tabIndex={nodeDriveBusy ? -1 : 0}") && detail.includes('aria-disabled={Boolean(nodeDriveBusy)}'), "La zone de dépôt doit rester utilisable et désactivable de façon sémantique au clavier.");
  assert(detail.includes('event.key === "Enter" || event.key === " "') && detail.includes('type="file" multiple') && detail.includes('aria-label="Sélectionner les fichiers à ajouter au dossier Google Drive de ce nœud"'), "Entrée, Espace et le sélecteur multiple doivent offrir une alternative complète au glisser-déposer.");
  assert(list.includes("alternative accessible au glisser-déposer") && list.includes("aria-label={`Statut de"), "La Liste doit fournir l'alternative accessible aux interactions de graphe.");
  step("keyboard_alternative");

  assert(graph.includes("ROADMAP2_STATUS_LABELS[node.status]") && list.includes("ROADMAP2_STATUS_LABELS[node.status]"), "Le statut ne doit pas être communiqué par la couleur seule.");
  assert(graph.includes('Icon name="alert-triangle"') && css.includes("border: 2px dashed"), "Un blocage doit avoir un signal non chromatique.");
  assert(css.includes(":focus-visible") && css.includes("outline: 3px solid"), "Le focus visible doit être explicite.");
  step("non_color_status_and_focus");

  for (const width of ["1250px", "800px", "700px", "520px"]) assert(css.includes(`max-width: ${width}`), `Breakpoint manquant : ${width}.`);
  assert(css.includes("prefers-reduced-motion: reduce"), "Le mouvement réduit doit être respecté.");
  assert(css.includes(".roadmapTable td::before") && css.includes("content: attr(data-label)"), "La liste mobile doit rester lisible sans tableau horizontal critique.");
  assert(css.includes("overflow: auto") && css.includes("timelineScroll"), "Les débordements de timeline doivent rester contrôlés.");
  step("responsive_and_reduced_motion");

  assert(detail.includes('target="_blank" rel="noopener noreferrer"'), "Les liens Drive doivent s'ouvrir de manière sécurisée.");
  assert(client.includes('driveStatus?.connected ? "Gérer"') && client.includes("setDriveConfigOpen(true)"), "Le dossier Drive racine doit rester gérable après sa configuration.");
  assert(client.includes("Connecter Google Drive") && client.includes("Aucun token Google n’est envoyé au navigateur"), "La connexion Google doit être explicite et rassurante sur la conservation des jetons.");
  assert(detail.includes("Préparer l’espace Drive") && detail.includes("Liens Drive et aide avancée"), "La création Drive doit être accessible dans le détail du nœud sans supprimer la saisie manuelle.");
  assert(detail.includes("Glissez-déposez vos fichiers") && detail.includes('aria-label={`Afficher un aperçu de ${file.name}`}') && detail.includes('aria-label={`Ouvrir ${file.name} dans Google Drive`}'), "L’ajout, l’aperçu privé et l’ouverture Drive doivent être trois actions compréhensibles et nommées.");
  assert(detail.includes('role="dialog" aria-modal="true" aria-labelledby="roadmap2-file-preview-title" aria-describedby="roadmap2-file-preview-help"'), "Le lecteur de fichier doit être annoncé comme un dialogue privé avec titre et aide.");
  assert((detail.match(/<iframe sandbox="" referrerPolicy="no-referrer"/g) ?? []).length >= 2, "Les lecteurs PDF et texte doivent interdire les scripts et supprimer le référent.");
  assert(detail.includes('document.addEventListener("keydown", handlePreviewKeys, true)') && detail.includes("event.stopPropagation()") && detail.includes("trigger?.focus()") && detail.includes("Échap ferme uniquement cet aperçu"), "Échap doit fermer le lecteur avant le panneau et restituer le focus au fichier sélectionné.");
  assert(detail.includes("Vérification de Google Drive") && detail.includes("momentanément indisponible") && css.includes("label:focus-within"), "La vérification Drive et le focus du sélecteur de fichiers doivent être perceptibles sans faux état de déconnexion.");
  assert(css.includes(".workspace [data-private-export]") && css.includes("display: none !important"), "L'export de synthèse doit exclure les contenus privés.");
  step("private_links_and_export");

  assert(labels.includes('dependency: "Prérequis pour"') && detail.includes('"A pour prérequis"'), "Le sens source → cible des dépendances doit être explicite dans le graphe et le détail.");
  assert(detail.includes("remoteVersionChanged") && detail.includes("Recharger la version reçue") && detail.includes("baseVersion"), "Un brouillon ouvert doit détecter et bloquer une version distante plus récente.");
  assert(detail.includes("ownerUserId: null") && detail.includes('required value={form.ownerUserId'), "Un nouveau nœud ne doit pas être attribué silencieusement au premier utilisateur trié.");
  step("operability_and_conflict_feedback");

  step("roadmap_2_accessibility_smoke_complete");
} catch (error) {
  console.error(JSON.stringify({ step: "roadmap_2_accessibility_smoke", status: "fail", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
