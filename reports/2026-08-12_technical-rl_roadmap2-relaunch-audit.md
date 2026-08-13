# Audit de relance Technical RL — Roadmap 2

Date : 2026-08-12
Périmètre : lot intégrité OAuth/Composio, parenté Drive, cohérence distribuée Drive/PostgreSQL, migrations et preuves CLI.

## Verdict

**PARTIAL global — lot intégrité code PASS, produit complet NO-GO.**

Le goal défini dans `docs/roadmap-2-relaunch-goal.md` est pertinent et doit rester actif. Le lot critique de cohérence Drive/PostgreSQL est maintenant techniquement construit et testable sans navigateur, mais il n'est pas encore déployé sur la base active. Les critères d'adoption, le Google E2E réel et les deux revues hebdomadaires ne sont pas réalisés.

## Résultats du lot

- Machine d'état OAuth exacte, identité obtenue via Google Drive et mutations épinglées sur le compte vérifié.
- Toute réponse Composio `successful: false` est rejetée avant tout compteur ou message de succès.
- Parenté d'un document de suivi existant vérifiée directement dans le dossier du nœud et sous la racine Roadmap 2.
- Registre `Roadmap2DriveOperation` pour provisioning, ressources de nœud, upload, réconciliation, permissions, archive et restauration.
- Clé d'idempotence stable par tentative utilisateur, hash de requête, lease expirant, backoff, résultat fournisseur durable et résultat fonctionnel rejouable.
- Une panne après succès Google place l'opération en `needs_repair`; la reprise saute l'appel fournisseur et rejoue seulement la finalisation PostgreSQL/audit.
- Provisioning retrouvable par marqueur de workspace et upload retrouvable par marqueur d'opération fournisseur.
- CLI `repair:roadmap-2:drive` : file de réparation en lecture seule par défaut; `--finalize=<id>` finalise sous lease un résultat fournisseur déjà enregistré.
- Erreurs durables expurgées des URL, emails, tokens, secrets et clés API; aucun octet de fichier ni email brut conservé dans le registre.
- Archive/restauration utilisent désormais le même mécanisme fournisseur-first et finalisation locale idempotente.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | PASS |
| ESLint ciblé des fichiers modifiés | PASS |
| `npx prisma validate` | PASS |
| `npm run smoke:roadmap-2` | PASS — 65 nœuds / 110 relations |
| `npm run smoke:roadmap-2:drive` | PASS — fournisseur simulé |
| `npm run smoke:roadmap-2:operations` | PASS — pannes, retry, replay, redaction |
| `npm run smoke:roadmap-2:a11y` | PASS — contrat statique, pas runtime connecté |
| `npm run build` | PASS |
| `npm audit --audit-level=low` | PASS — 0 vulnérabilité déclarée |
| Déploiement des 25 migrations sur schéma temporaire vide | PASS |
| Comparaison avec la base active | FAIL contrôlé — 1/25 migration enregistrée, registre absent et dérives antérieures |
| Google Drive réel | NON EXÉCUTÉ — environnement `le-bon-rebond` non connecté |
| Deux revues Dorian/Mathurin | NON EXÉCUTÉ |

## Bloquants P0 restants

1. **Baseline de la base active** : sauvegarde restaurable, clone, résolution explicite des dérives, baseline des 23 migrations historiques, déploiement de la migration du registre puis second `migrate deploy` à vide. Aucune migration active n'a été appliquée pendant cet audit.
2. **Preuve Google réelle** : connexion, provisioning, retry après panne simulée côté application, upload, preview, permissions, archive/restauration, révocation et reconnexion sur un compte de test isolé.
3. **Reprise après rechargement** : une opération avec résultat fournisseur durable est réparable, mais une opération `retryable` avant succès fournisseur requiert encore son entrée sensible. Les refs React perdent aussi leur clé au reload. Il faut un contrat UI/CLI explicite et testable pour reprendre ou redemander le fichier sans doublon.
4. **Préflight structurel obligatoire** : un changement de titre, catégorie ou parent doit présenter et confirmer l'impact Drive avant de créer une divergence PostgreSQL/Drive.
5. **Adoption seed 65** : date d'ancrage, attribution en masse par phase, vue racine + sept phases, expansion progressive et presets de revue.
6. **Pilotage** : KPI sans double comptage et formule visible; vue/filtres mémorisés.
7. **Accessibilité réelle** : Axe runtime connecté, clavier, zoom 200 %, mobile 390 px et cibles de 44 px.
8. **Acceptation business** : deux revues réelles sans tableur, satisfaction ≥ 4/5 et temps de préparation réduit ≥ 30 %.

## Décision

Le code du lot intégrité peut servir de base à la construction suivante. Il ne faut pas annoncer Roadmap 2 comme finalisée ni appliquer la migration à la base active avant le runbook de baseline sur clone. La prochaine étape prioritaire est donc **baseline DB + activation du registre**, puis **onboarding/vue progressive**, avant le **Google E2E et les deux revues**.

## Addendum Technical RL — 13 août 2026

Verdict maintenu : **PARTIAL global**, avec lots intégrité et adoption locale désormais PASS.

- Le contournement de hiérarchie est fermé au niveau UI, Server Action et repository : les relations génériques ne peuvent ni créer ni supprimer `parent_child`; le formulaire structurel signé est le seul chemin utilisateur.
- Les scopes localStorage d’upload sont pseudonymisés; le smoke inspecte clés et valeurs et valide aussi la purge globale des entrées expirées.
- Le seed accepte une date d’ancrage validée et une affectation par chacune des sept phases, contrôlée contre les administrateurs autorisés.
- La vue initiale est limitée à huit éléments, avec expansion par phase, quatre presets et persistance locale des préférences.
- Les KPI excluent racine, phases et niveaux parents : ils portent uniquement sur les livrables feuilles actifs et exposent leur formule.
- `smoke:roadmap-2`, `smoke:roadmap-2:adoption`, `smoke:roadmap-2:operation-keys`, `smoke:roadmap-2:structural-preflight`, `smoke:roadmap-2:operations`, `smoke:roadmap-2:drive`, `smoke:roadmap-2:a11y`, TypeScript, lint et build sont PASS.
- Le smoke navigateur authentifié est PASS en 1440/768/390 px : zéro violation Axe critique/sérieuse, aucun débordement, focus clavier, reflow 200 % et cibles tactiles Roadmap 2 ≥ 44 px. Une première exécution avait révélé un contraste insuffisant des onglets et de petites cibles; les corrections ont été appliquées puis revalidées.
- Le setup d’initialisation est obligatoire jusque dans le repository; aucun fallback à date/responsable implicites ne subsiste. Sur la cible actuelle sans registre, `repair:roadmap-2:drive` retourne maintenant un état JSON explicite `ROADMAP2_DRIVE_OPERATION_NOT_DEPLOYED` et la prochaine action sûre.
- `audit:migrations` reste un **FAIL contrôlé attendu** sur la comparaison active : chaîne propre 25/25, cible 1/25 et registre absent. Aucune mutation n’a été faite sur la cible.

La cible PostgreSQL de production VPS a ensuite été sauvegardée, restaurée en répétition puis portée à 25/25 migrations avec second deploy vide, registre/RLS actifs, 66 nœuds conservés et health PASS. La base Supabase de développement dérivée n’est pas la cible de production.

Bloquants restants : Google réel et deux revues mesurées. Réserve d’exploitation parallèle : le backup global Supabase Storage retourne HTTP 402 et doit être rétabli, alors que le dump PostgreSQL est restaurable et validé.
