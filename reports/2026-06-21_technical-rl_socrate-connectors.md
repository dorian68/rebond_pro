# Technical RL Report — Socrate Connectors

Date: 2026-06-21

## Scope

Implémentation locale du socle connecteurs externes via Composio, backend-first et CLI-testable.

## Delivered

- Registre central des connecteurs dans `src/lib/connectors.ts`.
- Couche serveur Composio dans `src/server/connectors.ts`.
- Action OAuth depuis le cockpit dans `src/server/connectors-actions.ts`.
- Callback `/integrations/composio/callback`.
- Onglet `Paramètres > Connecteurs`.
- UX scindée en `Mes connexions` et `Connexions du centre`.
- Outils Socrate :
  - `list_external_connectors`
  - `list_external_calendar_events`
  - `search_external_documents`
  - `import_external_document`
  - `create_external_email_draft`
- Garde-fous :
  - Google Calendar et Microsoft Calendar en lecture seule.
  - Drive, OneDrive et SharePoint en recherche/import.
  - Gmail et Outlook en création de brouillons uniquement.
  - Aucun outil d'envoi direct exposé.
  - Import fichier et brouillon email soumis à validation humaine.
  - Accès persona verrouillé : pas de connecteurs pour visitor/platform_admin.
  - Vérification d'un compte Composio actif avant chaque exécution.
  - Identité Composio personnelle : `lbr_user_<userId>`.
  - Identité Composio centre : `lbr_org_<organizationId>`.
  - Connexions centre limitées aux rôles OWNER/ADMIN.
  - Validation serveur des entrées vides avant appel externe (query, fileId, destinataires, objet, corps).
  - État vide explicite pour les rôles qui ne peuvent pas utiliser les connecteurs.

## Configuration

`COMPOSIO_API_KEY` est requis côté serveur.

Les slugs d'outils Composio peuvent être surchargés via les variables `COMPOSIO_TOOL_*` documentées dans `.env.example`.

## Verification

- `npm run smoke:connectors` PASS
- `npm run smoke:persona` PASS
- `npm run smoke:admin-agents` PASS
- `npx tsc --noEmit` PASS
- ESLint ciblé PASS
- `npm run build` PASS

## Residual Risk

Les slugs par défaut des outils Composio peuvent varier selon workspace/toolkit. Les variables `COMPOSIO_TOOL_*` permettent d'ajuster sans changer le code.

Non déployé.
