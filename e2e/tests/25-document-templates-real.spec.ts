/**
 * Real-condition upstream template E2E.
 *
 * This verifies that automatic document generation actually uses the imported
 * DOCX templates when they exist, instead of silently falling back to the
 * built-in PDF renderer.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import type { Role } from '@prisma/client';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma, getDevContext } from '../db-fixture';
import { extractText } from '../parse-doc';
import { expectNoServerError } from '../helpers';
import { GENERATABLE_DOCUMENT_TYPES, PER_LEARNER_DOCUMENT_TYPES } from '../../src/lib/document-types';

const RUN = Date.now().toString().slice(-8);
const TAG = `TPLDOC${RUN}`;
const SHOULD_RUN = process.env.E2E_REAL_TEMPLATE_CATALOG === '1';
const perLearnerTypes = new Set<string>(PER_LEARNER_DOCUMENT_TYPES as readonly string[]);

type Fixture = {
  userId: string;
  organizationId: string;
  originalRole: Role;
  originalOrg: {
    name: string;
    legalName: string | null;
    legalAddress: string | null;
    nda: string | null;
    legalRep: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    siret: string | null;
    website: string | null;
    plan: 'FREE' | 'PRO' | 'PREMIUM';
  };
  trainerId: string;
  roomId: string;
  formationId: string;
  sessionId: string;
  learnerId: string;
  enrollmentId: string;
  templateTypes: string[];
  generatedDocumentIds: string[];
  expected: {
    orgName: string;
    formationTitle: string;
    learnerName: string;
    trainerName: string;
    roomName: string;
  };
};

let fixture: Fixture;

test.describe.configure({ mode: 'serial', timeout: 60 * 60 * 1000 });
test.skip(!SHOULD_RUN, 'Set E2E_REAL_TEMPLATE_CATALOG=1 to run the imported DOCX template loop.');

function futureDate(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function looseText(value: string): string {
  return value.toLowerCase().replace(/[\s\u00a0\u202f'’.,;:()[\]\-–—/]+/g, '');
}

function expectTextContains(text: string, marker: string) {
  expect(looseText(text), `document text should contain "${marker}". Extract: ${text.slice(0, 700)}`).toContain(looseText(marker));
}

async function cleanupStaleTemplateArtifacts(organizationId: string) {
  const staleFormations = await prisma.formation.findMany({
    where: { organizationId, title: { startsWith: 'TPLDOC' } },
    select: { id: true },
  });
  const staleFormationIds = staleFormations.map((f) => f.id);
  const staleSessions = staleFormationIds.length
    ? await prisma.session.findMany({ where: { organizationId, formationId: { in: staleFormationIds } }, select: { id: true } })
    : [];
  const staleSessionIds = staleSessions.map((s) => s.id);
  if (staleSessionIds.length) {
    const staleEnrollments = await prisma.enrollment.findMany({ where: { organizationId, sessionId: { in: staleSessionIds } }, select: { id: true } });
    const staleEnrollmentIds = staleEnrollments.map((e) => e.id);
    if (staleEnrollmentIds.length) await prisma.attendance.deleteMany({ where: { enrollmentId: { in: staleEnrollmentIds } } });
    await prisma.document.deleteMany({ where: { organizationId, sessionId: { in: staleSessionIds } } });
    await prisma.enrollment.deleteMany({ where: { organizationId, sessionId: { in: staleSessionIds } } });
    await prisma.session.deleteMany({ where: { organizationId, id: { in: staleSessionIds } } });
  }
  if (staleFormationIds.length) await prisma.formation.deleteMany({ where: { organizationId, id: { in: staleFormationIds } } });
  await prisma.learner.deleteMany({ where: { organizationId, firstName: { startsWith: 'TPLDOC' } } });
  await prisma.trainer.deleteMany({ where: { organizationId, firstName: { startsWith: 'TPLDOC' } } });
  await prisma.room.deleteMany({ where: { organizationId, name: { startsWith: 'TPLDOC' } } });
}

async function setRole(role: Role) {
  await prisma.membership.updateMany({
    where: { userId: fixture.userId, organizationId: fixture.organizationId },
    data: { role },
  });
}

async function generationForm(page: Page): Promise<Locator> {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: /générer le document|génération/i }) }).first();
  await expect(form, 'manual generation form should be visible').toBeVisible({ timeout: 30_000 });
  return form;
}

async function generateOneAutomaticTemplateDoc(page: Page, type: string) {
  const beforeIds = new Set(
    (await prisma.document.findMany({
      where: { organizationId: fixture.organizationId, sessionId: fixture.sessionId, type: type as never },
      select: { id: true },
    })).map((d) => d.id),
  );

  const form = await generationForm(page);
  await form.locator('select[name="type"]').selectOption(type);
  await form.locator('select[name="sessionId"]').selectOption(fixture.sessionId);
  await form.locator('select[name="templateId"]').selectOption('');
  await form.locator('input[name="manualOverrides"]').evaluate((input, value) => {
    const el = input as HTMLInputElement;
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, JSON.stringify({
    action_prevue: `${TAG} action corrective`,
    actions_liste: `${TAG} action 1\n${TAG} action 2`,
    adaptations: `${TAG} adaptation`,
    adaptations_recommandees: `${TAG} adaptation recommandee`,
    ameliorations: `${TAG} amelioration`,
    annee: '2026',
    artefacts_liste: `${TAG} artefact`,
    beneficiaire_nom: fixture.expected.learnerName,
    besoin_accessibilite: `${TAG} besoin accessibilite`,
    cause: `${TAG} cause`,
    client_nom: fixture.expected.learnerName,
    commentaire: `${TAG} commentaire`,
    commentaires_financement: `${TAG} financement`,
    conditions_annulation: 'Annulation selon CGV.',
    conditions_retractation: 'Delai legal de retractation.',
    consultant_nom: fixture.expected.trainerName,
    date_autorisation: '28 juin 2026',
    date_constitution: '28 juin 2026',
    date_devis: '28 juin 2026',
    date_document: '28 juin 2026',
    date_echeance: '28 juillet 2026',
    date_export: '28 juin 2026',
    date_mi_parcours: '28 juin 2026',
    date_paiement: '28 juin 2026',
    date_reclamation: '28 juin 2026',
    date_signature: '28 juin 2026',
    delai_retractation: '14 jours',
    description: `${TAG} description`,
    destinataire_nom: `${TAG} destinataire`,
    document_version: 'v1',
    duree_bilan: '24 h',
    duree_realisee: '14 h',
    duree_suivie: '14 h',
    financeur_nom: `${TAG} OPCO`,
    heures_realisees: '14 h',
    indicateurs_liste: `${TAG} indicateur`,
    indicateurs_suivi: `${TAG} indicateur suivi`,
    juridiction: 'Tribunal competent',
    lien_paiement: 'https://example.test/paiement',
    modalite_accompagnement: 'Presentiel',
    montant_accorde: '1 500 EUR',
    montant_demande: '1 500 EUR',
    montant_du: '1 500 EUR',
    montant_finance: '1 500 EUR',
    montant_paye: '1 500 EUR',
    motif: `${TAG} motif`,
    nombre_reponses: '1',
    objectif_final: `${TAG} objectif final`,
    objectifs_atteints: `${TAG} objectifs atteints`,
    objectifs_individuels: `${TAG} objectif individuel`,
    objet: `${TAG} objet`,
    probleme_identifie: `${TAG} probleme`,
    questions_liste: `${TAG} question`,
    reponse_apportee: `${TAG} reponse`,
    score: '95%',
    score_moyen: '5/5',
    signataire_client: fixture.expected.learnerName,
    signataire_nom: `${TAG} responsable`,
    statut_dossier: 'Complet',
    statuts: 'En cours',
    synthese_globale: `${TAG} synthese globale`,
    taux_satisfaction: '95%',
    test_positionnement_resultat: `${TAG} resultat positionnement`,
    travaux_personnels: `${TAG} travail personnel`,
    validite_devis: '30 jours',
  }));

  await form.getByRole('button', { name: /^générer le document$/i }).click();

  let doc = null as Awaited<ReturnType<typeof prisma.document.findFirst>> | null;
  for (let i = 0; i < 120 && !doc; i += 1) {
    await page.waitForTimeout(1_000);
    doc = await prisma.document.findFirst({
      where: {
        organizationId: fixture.organizationId,
        sessionId: fixture.sessionId,
        type: type as never,
        id: { notIn: [...beforeIds] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  expect(doc, `${type} should persist one generated document`).toBeTruthy();
  await expect((await generationForm(page)).getByRole('button', { name: /^générer le document$/i })).toBeEnabled({ timeout: 30_000 });
  return doc!;
}

async function assertTemplateDocument(page: Page, docId: string, type: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { template: true } });
  expect(doc, `${type} document should exist`).toBeTruthy();
  expect(doc!.templateId, `${type} must be backed by imported template`).toBeTruthy();
  expect(doc!.template?.engine).toBe('DOCX');
  expect(doc!.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  expect(doc!.fileName).toMatch(/\.docx$/);
  expect(doc!.completionStatus).toBe('COMPLETE');
  expect(doc!.completionScore).toBeGreaterThanOrEqual(95);
  expect(doc!.missingVariables).toEqual([]);
  if (perLearnerTypes.has(type)) expect(doc!.enrollmentId).toBe(fixture.enrollmentId);

  const response = await page.request.get(`/api/documents/${docId}/download`);
  expect(response.ok(), `${type} download should be authorized`).toBeTruthy();
  const buffer = Buffer.from(await response.body());
  expect(buffer.length, `${type} DOCX should be a real file`).toBeGreaterThan(1_500);
  const text = await extractText(buffer, response.headers()['content-type']);

  expectTextContains(text, fixture.expected.orgName);
  expectTextContains(text, fixture.expected.formationTitle);
  expect(text, `${type} should not expose raw docxtemplater tags`).not.toMatch(/\{[a-zA-Z0-9_. -]+\}/);
  expect(text, `${type} should not expose readable missing placeholders`).not.toContain('[À compléter');
  expect(text, `${type} should not expose JS nullish values`).not.toMatch(/\bundefined\b|\bnull\b/i);
}

test.beforeAll(async () => {
  const { userId, organizationId } = await getDevContext();
  await cleanupStaleTemplateArtifacts(organizationId);
  const membership = await prisma.membership.findFirstOrThrow({
    where: { userId, organizationId, status: 'ACTIVE' },
    select: { role: true },
  });
  const originalOrg = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, legalName: true, legalAddress: true, nda: true, legalRep: true, publicEmail: true, publicPhone: true, siret: true, website: true, plan: true },
  });
  const templates = await prisma.documentTemplate.findMany({
    where: { organizationId: null, engine: 'DOCX', status: 'ACTIVE', sourceFileUrl: { not: null } },
    select: { type: true, sourceFileUrl: true },
    orderBy: { type: 'asc' },
  });
  const templateTypes = [...new Set(
    templates
      .filter((t) => t.sourceFileUrl && existsSync(resolve('storage', t.sourceFileUrl)))
      .map((t) => t.type),
  )].filter((type) => GENERATABLE_DOCUMENT_TYPES.includes(type));
  expect(templateTypes.length, 'imported upstream DOCX templates expected').toBeGreaterThan(0);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: `${TAG} Centre Template`,
      legalName: `${TAG} Legal SAS`,
      legalAddress: `${TAG} 18 rue du Modele`,
      nda: `NDA-${RUN}`,
      legalRep: `${TAG} Responsable`,
      publicEmail: `centre-${RUN}@template.test`,
      publicPhone: '0590000044',
      siret: `SIRET${RUN}`,
      website: `https://template-${RUN}.example.test`,
      plan: 'PREMIUM',
    },
  });
  await prisma.membership.updateMany({ where: { userId, organizationId }, data: { role: 'OWNER' } });

  const trainer = await prisma.trainer.create({
    data: { organizationId, firstName: TAG, lastName: 'Formateur Template', email: `trainer-${RUN}@template.test`, active: true },
  });
  const room = await prisma.room.create({
    data: { organizationId, name: `${TAG} Salle Template`, type: 'SALLE', capacity: 12, location: `${TAG} Campus` },
  });
  const formation = await prisma.formation.create({
    data: {
      organizationId,
      title: `${TAG} Formation Template`,
      slug: `${TAG.toLowerCase()}-formation-template`,
      shortDescription: `${TAG} resume`,
      objectives: `${TAG} objectif mesurable`,
      targetAudience: `${TAG} public cible`,
      prerequisites: `${TAG} prerequis`,
      program: `${TAG} programme detaille`,
      durationDays: 2,
      durationHours: 14,
      price: 150000,
      modality: 'PRESENTIEL',
      level: 'INTERMEDIAIRE',
      status: 'PUBLIE',
      isPublic: false,
    },
  });
  const learner = await prisma.learner.create({
    data: { organizationId, firstName: TAG, lastName: 'Apprenant Template', company: `${TAG} Entreprise`, email: `learner-${RUN}@template.test` },
  });
  const session = await prisma.session.create({
    data: {
      organizationId,
      formationId: formation.id,
      trainerId: trainer.id,
      roomId: room.id,
      startDate: futureDate(75),
      endDate: futureDate(76),
      slots: ['MATIN', 'APRES_MIDI'],
      capacity: 8,
      pricePerLearner: 150000,
      breakEvenSeats: 2,
      status: 'OUVERTE',
      trainerConfirmed: true,
    },
  });
  const enrollment = await prisma.enrollment.create({
    data: { organizationId, learnerId: learner.id, sessionId: session.id, status: 'CONFIRME', score: 95 },
  });

  fixture = {
    userId,
    organizationId,
    originalRole: membership.role,
    originalOrg,
    trainerId: trainer.id,
    roomId: room.id,
    formationId: formation.id,
    sessionId: session.id,
    learnerId: learner.id,
    enrollmentId: enrollment.id,
    templateTypes,
    generatedDocumentIds: [],
    expected: {
      orgName: `${TAG} Centre Template`,
      formationTitle: `${TAG} Formation Template`,
      learnerName: `${TAG} Apprenant Template`,
      trainerName: `${TAG} Formateur Template`,
      roomName: `${TAG} Salle Template`,
    },
  };
});

test.afterAll(async () => {
  if (!fixture) return;
  await prisma.membership.updateMany({ where: { userId: fixture.userId, organizationId: fixture.organizationId }, data: { role: fixture.originalRole } }).catch(() => null);
  await prisma.document.deleteMany({ where: { id: { in: fixture.generatedDocumentIds } } }).catch(() => null);
  await prisma.document.deleteMany({ where: { organizationId: fixture.organizationId, sessionId: fixture.sessionId } }).catch(() => null);
  await prisma.enrollment.deleteMany({ where: { id: fixture.enrollmentId } }).catch(() => null);
  await prisma.session.deleteMany({ where: { id: fixture.sessionId } }).catch(() => null);
  await prisma.learner.deleteMany({ where: { id: fixture.learnerId } }).catch(() => null);
  await prisma.trainer.deleteMany({ where: { id: fixture.trainerId } }).catch(() => null);
  await prisma.room.deleteMany({ where: { id: fixture.roomId } }).catch(() => null);
  await prisma.formation.deleteMany({ where: { id: fixture.formationId } }).catch(() => null);
  await prisma.organization.update({ where: { id: fixture.organizationId }, data: fixture.originalOrg }).catch(() => null);
  await prisma.$disconnect();
});

test('OWNER centre: genere tous les types couverts par templates amont sans fallback PDF', async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  await setRole('OWNER');
  await page.goto('/documents');
  await page.waitForLoadState('networkidle');
  await expectNoServerError(page);

  for (const type of fixture.templateTypes) {
    const doc = await generateOneAutomaticTemplateDoc(page, type);
    fixture.generatedDocumentIds.push(doc.id);
    await assertTemplateDocument(page, doc.id, type);
  }
});
