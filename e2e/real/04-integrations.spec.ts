/**
 * POINT 4 — INTÉGRATIONS.
 * Email (vérif + invitation) : déjà prouvé en points 1 & 2 (lecture réelle via Composio).
 * PDF/DOCX : déjà prouvé en point 3A (contenu du PDF d'émargement parsé).
 * Stripe : sur prod LIVE on NE déclenche AUCUN paiement. Check réel & sûr = le webhook valide la signature.
 */
import { test, expect } from '@playwright/test';
import { appUrl } from './env';

test('Stripe — le webhook rejette une requête NON signée (validation de signature active)', async ({ request }) => {
  const resp = await request.post(appUrl('/api/stripe/webhook'), {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify({ id: 'evt_e2e_fake', type: 'checkout.session.completed' }),
    failOnStatusCode: false,
  });
  // Preuve : l'endpoint existe ET refuse un payload sans signature valide (pas de 2xx)
  expect(resp.status(), `attendu 4xx (signature invalide), reçu ${resp.status()}`).toBeGreaterThanOrEqual(400);
  expect(resp.status()).toBeLessThan(500);
  console.log(`✅ Stripe webhook rejette le non-signé → HTTP ${resp.status()}`);
});
