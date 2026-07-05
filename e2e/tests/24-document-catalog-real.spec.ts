/**
 * Real-condition document catalog E2E.
 *
 * This spec is intentionally long and must be enabled explicitly:
 *   $env:E2E_REAL_DOCUMENT_CATALOG='1'
 *
 * It drives the real /documents dashboard UI and verifies every generatable
 * document type, not only a single happy-path template.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import type { Role } from '@prisma/client';
import { prisma, getDevContext } from '../db-fixture';
import { extractText } from '../parse-doc';
import { expectNoServerError } from '../helpers';
import { DOC_LABELS, GENERATABLE_DOCUMENT_TYPES, PER_LEARNER_DOCUMENT_TYPES } from '../../src/lib/document-types';
import { DOCUMENT_CATALOG_BY_TYPE } from '../../src/lib/document-catalog';

const RUN = Date.now().toString().slice(-8);
const TAG = `REALDOC${RUN}`;
const SHOULD_RUN = process.env.E2E_REAL_DOCUMENT_CATALOG === '1';
const perLearnerTypes = new Set<string>(PER_LEARNER_DOCUMENT_TYPES as readonly string[]);

type Snapshot = {
  values?: Record<string, unknown>;
  availableVariables?: string[];
  unknownVariables?: string[];
  completionStatus?: string;
  completionScore?: number;
};

type Fixture = {
  userId: string;
  organizationId: string;
  originalRole: Role;
  originalLinkedTrainerId: string | null;
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
  poisonOrganizationId: string;
  trainerId: string;
  secondTrainerId: string;
  roomId: string;
  formationId: string;
  moduleIds: string[];
  sessionId: string;
  learnerId: string;
  enrollmentId: string;
  expected: {
    orgName: string;
    orgLegalName: string;
    orgNda: string;
    orgSiret: string;
    formationTitle: string;
    formationObjective: string;
    learnerName: string;
    learnerCompany: string;
    trainerName: string;
    secondTrainerName: string;
    roomName: string;
    poisonOrgName: string;
    poisonFormationTitle: string;
  };
  generatedDocumentIds: string[];
};

let fixture: Fixture;

test.describe.configure({ mode: 'serial', timeout: 60 * 60 * 1000 });
test.skip(!SHOULD_RUN, 'Set E2E_REAL_DOCUMENT_CATALOG=1 to run the full real-condition 78-document generation loop.');

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
  expect(looseText(text), `document text should contain "${marker}". Extract: ${text.slice(0, 600)}`).toContain(looseText(marker));
}

function expectTextNotContains(text: string, marker: string) {
  expect(looseText(text), `document text must not contain cross-tenant marker "${marker}". Extract: ${text.slice(0, 600)}`).not.toContain(looseText(marker));
}

async function setRole(role: Role) {
  await prisma.membership.updateMany({
    where: { userId: fixture.userId, organizationId: fixture.organizationId },
    data: { role },
  });
}

const derivedContextKeys = new Set([
  'org_name', 'org_legal_name', 'org_legal_address', 'org_nda', 'org_siret', 'org_email', 'org_phone', 'org_website',
  'centre_nom', 'centre_adresse', 'centre_siret', 'centre_nda', 'centre_email', 'centre_phone',
  'formation_title', 'formation_titre', 'formation_duration_days', 'formation_duration_hours', 'formation_duree',
  'formation_program', 'formation_programme', 'formation_objectives', 'formation_objectifs', 'objectifs_pedagogiques',
  'formation_modality', 'formation_modalite', 'formation_tarif', 'formation_resume', 'formation_public',
  'formation_prerequis', 'formation_prerequisites', 'formation_target_audience', 'formation_niveau',
  'competences_liste', 'competences_visees', 'competence_visee', 'modules_liste', 'module_titre', 'module_duree',
  'module_objectifs', 'module_formateurs', 'session_date', 'session_dates', 'session_date_range', 'session_start_date',
  'session_end_date', 'session_location', 'session_lieu', 'session_schedule', 'session_horaires', 'horaires',
  'trainer_name', 'trainer_email', 'formateur_nom', 'formateur_email', 'trainer_specialities', 'domaine_expertise',
  'room_name', 'lieu', 'lieux', 'horaire', 'periode', 'semaine', 'jour', 'date_entree', 'date_debut_accompagnement',
  'date_fin_formation', 'learner_name', 'learner_company', 'learner_email', 'learner_phone',
  'apprenant_nom', 'apprenant_email', 'apprenant_phone', 'apprenant_entreprise', 'beneficiaire_nom',
  'company_name', 'client_nom', 'client_entreprise', 'entreprise_nom', 'amountText', 'prix_total', 'prix_unitaire',
  'montant', 'total_ht', 'ligne_total_ht', 'total_ttc', 'quantite', 'apprenants_liste', 'nombre_apprenants',
  'generatedAt', 'date_generation', 'date_document', 'date_signature', 'date_facture', 'annee', 'document_reference',
  'facture_numero', 'devis_numero', 'reference', 'signataire_nom', 'signature_nom', 'signataire_centre',
  'referent_nom', 'referent_handicap', 'referent_pedagogique', 'contact_referent', 'contact_reclamation',
  'heures_prevues', 'heures_prevues_jour', 'conditions_paiement', 'payment_terms', 'tva', 'version_cgv',
]);

function manualValueFor(key: string): string {
  if (/date|echeance|validite/i.test(key)) return '28 juin 2026';
  if (/montant|prix|total|tarif/i.test(key)) return '1 500 EUR';
  if (/heure/i.test(key)) return '14 h';
  if (/taux|rating|score/i.test(key)) return '95%';
  if (/email/i.test(key)) return `contact-${RUN}@real-e2e.test`;
  if (/url|lien/i.test(key)) return `https://example.test/${TAG.toLowerCase()}`;
  if (/numero|numéro|reference|référence/i.test(key)) return `${TAG}-${key.toUpperCase()}`;
  return `${TAG} ${key.replace(/_/g, ' ')}`;
}

function buildManualOverrides(): Record<string, string> {
  const keys = new Set<string>();
  for (const type of GENERATABLE_DOCUMENT_TYPES) {
    const cat = DOCUMENT_CATALOG_BY_TYPE[type];
    for (const key of cat?.recommendedVariables ?? []) {
      if (!derivedContextKeys.has(key)) keys.add(key);
    }
  }
  return Object.fromEntries([...keys].map((key) => [key, manualValueFor(key)]));
}

const manualOverrides = buildManualOverrides();

async function cleanupStaleRealDocArtifacts(organizationId: string) {
  const staleFormations = await prisma.formation.findMany({
    where: { organizationId, title: { startsWith: 'REALDOC' } },
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
    await prisma.sessionModuleAssignment.deleteMany({ where: { sessionId: { in: staleSessionIds } } });
    await prisma.session.deleteMany({ where: { organizationId, id: { in: staleSessionIds } } });
  }
  if (staleFormationIds.length) {
    const staleModules = await prisma.formationModule.findMany({ where: { organizationId, formationId: { in: staleFormationIds } }, select: { id: true } });
    const staleModuleIds = staleModules.map((m) => m.id);
    if (staleModuleIds.length) await prisma.formationModuleTrainer.deleteMany({ where: { moduleId: { in: staleModuleIds } } });
    await prisma.formationModule.deleteMany({ where: { organizationId, formationId: { in: staleFormationIds } } });
    await prisma.formation.deleteMany({ where: { organizationId, id: { in: staleFormationIds } } });
  }
  await prisma.learner.deleteMany({ where: { organizationId, firstName: { startsWith: 'REALDOC' } } });
  await prisma.trainer.deleteMany({ where: { organizationId, firstName: { startsWith: 'REALDOC' } } });
  await prisma.room.deleteMany({ where: { organizationId, name: { startsWith: 'REALDOC' } } });
  await prisma.organization.deleteMany({ where: { name: { startsWith: 'REALDOC' }, slug: { contains: 'poison' } } });

  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
  if (org?.name.startsWith('REALDOC')) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: 'Mon Centre de Formation',
        legalName: 'Mon Centre de Formation',
        legalAddress: null,
        nda: null,
        legalRep: null,
        publicEmail: null,
        publicPhone: null,
        siret: null,
        website: null,
        plan: 'PRO',
      },
    });
  }
}

async function setManualOverrides(form: Locator) {
  const serialized = JSON.stringify(manualOverrides);
  await form.locator('input[name="manualOverrides"]').evaluate((input, value) => {
    const el = input as HTMLInputElement;
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, serialized);
}

async function generationForm(page: Page): Promise<Locator> {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: /générer le document|génération/i }) }).first();
  await expect(form, 'manual generation form should be visible').toBeVisible({ timeout: 30_000 });
  return form;
}

async function generateOneDocumentFromUi(page: Page, type: string) {
  const beforeIds = new Set(
    (await prisma.document.findMany({
      where: { organizationId: fixture.organizationId, sessionId: fixture.sessionId, type: type as never },
      select: { id: true },
    })).map((d) => d.id),
  );

  const form = await generationForm(page);
  await form.locator('select[name="type"]').selectOption(type);
  await form.locator('select[name="sessionId"]').selectOption(fixture.sessionId);
  await form.locator('select[name="templateId"]').selectOption('__builtin');
  await setManualOverrides(form);

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

function variablesFor(type: string): string[] {
  return DOCUMENT_CATALOG_BY_TYPE[type]?.recommendedVariables ?? [];
}

function requiresAny(type: string, patterns: RegExp[]): boolean {
  return variablesFor(type).some((key) => patterns.some((pattern) => pattern.test(key)));
}

async function assertGeneratedDocument(page: Page, docId: string, type: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  expect(doc, `${type} document should exist`).toBeTruthy();
  expect(doc!.organizationId).toBe(fixture.organizationId);
  expect(doc!.sessionId).toBe(fixture.sessionId);
  expect(doc!.status).toBe('GENERE');
  expect(doc!.completionStatus, `${type} should be complete with real + manual context`).toBe('COMPLETE');
  expect(doc!.completionScore).toBeGreaterThanOrEqual(95);
  expect(doc!.missingVariables).toEqual([]);
  if (perLearnerTypes.has(type)) {
    expect(doc!.enrollmentId, `${type} should target the enrolled learner`).toBe(fixture.enrollmentId);
  }

  const snapshot = doc!.generationContextSnapshot as Snapshot;
  expect(snapshot.completionStatus).toBe('COMPLETE');
  expect(snapshot.completionScore).toBeGreaterThanOrEqual(95);
  expect(snapshot.values).toMatchObject({
    org_name: fixture.expected.orgName,
    org_legal_name: fixture.expected.orgLegalName,
    org_nda: fixture.expected.orgNda,
    org_siret: fixture.expected.orgSiret,
    centre_nom: fixture.expected.orgName,
    formation_title: fixture.expected.formationTitle,
    formation_titre: fixture.expected.formationTitle,
    learner_name: fixture.expected.learnerName,
    apprenant_nom: fixture.expected.learnerName,
    beneficiaire_nom: fixture.expected.learnerName,
    learner_company: fixture.expected.learnerCompany,
    company_name: fixture.expected.learnerCompany,
    trainer_name: fixture.expected.trainerName,
    formateur_nom: fixture.expected.trainerName,
    session_location: fixture.expected.roomName,
    session_lieu: fixture.expected.roomName,
    room_name: fixture.expected.roomName,
  });
  expect(snapshot.values?.org_name).not.toBe(fixture.expected.poisonOrgName);
  expect(snapshot.values?.formation_title).not.toBe(fixture.expected.poisonFormationTitle);

  const response = await page.request.get(`/api/documents/${docId}/download`);
  expect(response.ok(), `${type} download should be authorized`).toBeTruthy();
  const buffer = Buffer.from(await response.body());
  expect(buffer.length, `${type} document file should not be empty`).toBeGreaterThan(600);
  const text = await extractText(buffer, response.headers()['content-type']);

  expectTextContains(text, fixture.expected.orgName);
  expectTextContains(text, fixture.expected.formationTitle);
  if (requiresAny(type, [/learner/i, /apprenant/i, /beneficiaire/i, /bénéficiaire/i, /client_nom/i, /apprenants_liste/i])) {
    expectTextContains(text, fixture.expected.learnerName);
  }
  if (requiresAny(type, [/company/i, /entreprise/i, /client_entreprise/i])) {
    expectTextContains(text, fixture.expected.learnerCompany);
  }
  if (requiresAny(type, [/trainer/i, /formateur/i])) {
    expectTextContains(text, fixture.expected.trainerName);
  }
  if (requiresAny(type, [/location/i, /lieu/i, /room/i])) {
    expectTextContains(text, fixture.expected.roomName);
  }
  expectTextNotContains(text, fixture.expected.poisonOrgName);
  expectTextNotContains(text, fixture.expected.poisonFormationTitle);
}

test.beforeAll(async () => {
  const { userId, organizationId } = await getDevContext();
  await cleanupStaleRealDocArtifacts(organizationId);
  const membership = await prisma.membership.findFirstOrThrow({
    where: { userId, organizationId, status: 'ACTIVE' },
    select: { role: true },
  });
  const originalOrg = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, legalName: true, legalAddress: true, nda: true, legalRep: true, publicEmail: true, publicPhone: true, siret: true, website: true, plan: true },
  });
  const originalLinkedTrainer = await prisma.trainer.findUnique({
    where: { userId },
    select: { id: true },
  }).catch(() => null);
  if (originalLinkedTrainer) {
    await prisma.trainer.update({ where: { id: originalLinkedTrainer.id }, data: { userId: null } });
  }

  const expected = {
    orgName: `${TAG} Centre Formation`,
    orgLegalName: `${TAG} Formation Legal SAS`,
    orgNda: `NDA-${RUN}`,
    orgSiret: `SIRET${RUN}`,
    formationTitle: `${TAG} Formation exhaustive documents`,
    formationObjective: `${TAG} Objectif pedagogique traceable`,
    learnerName: `${TAG} Apprenant Reel`,
    learnerCompany: `${TAG} Entreprise Cliente`,
    trainerName: `${TAG} Formateur Principal`,
    secondTrainerName: `${TAG} Formatrice Module`,
    roomName: `${TAG} Salle Contexte`,
    poisonOrgName: `${TAG} Poison Center`,
    poisonFormationTitle: `${TAG} Poison Formation`,
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: expected.orgName,
      legalName: expected.orgLegalName,
      legalAddress: `${TAG} 42 avenue des Tests Reels`,
      nda: expected.orgNda,
      legalRep: `${TAG} Responsable Legal`,
      publicEmail: `centre-${RUN}@real-e2e.test`,
      publicPhone: '0590000011',
      siret: expected.orgSiret,
      website: `https://centre-${RUN}.example.test`,
      plan: 'PREMIUM',
    },
  });
  await prisma.membership.updateMany({
    where: { userId, organizationId },
    data: { role: 'OWNER' },
  });

  const poison = await prisma.organization.create({
    data: {
      name: expected.poisonOrgName,
      slug: `${TAG.toLowerCase()}-poison`,
      legalName: `${TAG} Poison Legal`,
      legalAddress: `${TAG} Poison Address`,
      nda: `POISON-${RUN}`,
      marketplaceStatus: 'APPROVED',
    },
  });
  await prisma.formation.create({
    data: {
      organizationId: poison.id,
      title: expected.poisonFormationTitle,
      slug: `${TAG.toLowerCase()}-poison-formation`,
      status: 'PUBLIE',
      modality: 'DISTANCIEL',
      level: 'AVANCE',
      price: 999999,
      durationHours: 99,
    },
  });

  const trainer = await prisma.trainer.create({
    data: {
      organizationId,
      userId,
      firstName: TAG,
      lastName: 'Formateur Principal',
      email: `trainer-main-${RUN}@real-e2e.test`,
      phone: '0590000022',
      specialities: ['E2E', 'Qualiopi', 'Documents'],
      bio: `${TAG} bio formateur documentee`,
      active: true,
    },
  });
  const secondTrainer = await prisma.trainer.create({
    data: {
      organizationId,
      firstName: TAG,
      lastName: 'Formatrice Module',
      email: `trainer-module-${RUN}@real-e2e.test`,
      specialities: ['Module avance', 'Evaluation'],
      active: true,
    },
  });
  const room = await prisma.room.create({
    data: {
      organizationId,
      name: expected.roomName,
      type: 'SALLE',
      capacity: 14,
      location: `${TAG} Campus Reel`,
    },
  });
  const formation = await prisma.formation.create({
    data: {
      organizationId,
      title: expected.formationTitle,
      slug: `${TAG.toLowerCase()}-formation-exhaustive`,
      shortDescription: `${TAG} resume public formation`,
      longDescription: `${TAG} description longue formation`,
      objectives: `${expected.formationObjective}\n${TAG} competence operationnelle`,
      targetAudience: `${TAG} public cible centre`,
      prerequisites: `${TAG} prerequis positionnement`,
      program: `${TAG} Module 1 contexte\n${TAG} Module 2 pratique`,
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
    data: {
      organizationId,
      firstName: TAG,
      lastName: 'Apprenant Reel',
      company: expected.learnerCompany,
      email: `learner-${RUN}@real-e2e.test`,
      phone: '0590000033',
    },
  });

  const moduleOne = await prisma.formationModule.create({
    data: {
      organizationId,
      formationId: formation.id,
      title: `${TAG} Module contexte`,
      description: `${TAG} module avec formateur principal`,
      durationHours: 7,
      position: 1,
    },
  });
  const moduleTwo = await prisma.formationModule.create({
    data: {
      organizationId,
      formationId: formation.id,
      title: `${TAG} Module evaluation`,
      description: `${TAG} module avec formatrice secondaire`,
      durationHours: 7,
      position: 2,
    },
  });
  await prisma.formationModuleTrainer.create({ data: { moduleId: moduleOne.id, trainerId: trainer.id } });
  await prisma.formationModuleTrainer.create({ data: { moduleId: moduleTwo.id, trainerId: secondTrainer.id } });

  const session = await prisma.session.create({
    data: {
      organizationId,
      formationId: formation.id,
      trainerId: trainer.id,
      roomId: room.id,
      startDate: futureDate(60),
      endDate: futureDate(61),
      slots: ['MATIN', 'APRES_MIDI'],
      capacity: 10,
      pricePerLearner: 150000,
      breakEvenSeats: 2,
      status: 'OUVERTE',
      trainerConfirmed: true,
      notes: `${TAG} notes de session reelle`,
    },
  });
  await prisma.sessionModuleAssignment.create({ data: { organizationId, sessionId: session.id, moduleId: moduleOne.id, trainerId: trainer.id } });
  await prisma.sessionModuleAssignment.create({ data: { organizationId, sessionId: session.id, moduleId: moduleTwo.id, trainerId: secondTrainer.id } });

  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId,
      learnerId: learner.id,
      sessionId: session.id,
      status: 'CONFIRME',
      score: 95,
      satisfactionRating: 5,
      satisfactionComment: `${TAG} retour satisfaction`,
    },
  });
  await prisma.attendance.create({ data: { enrollmentId: enrollment.id, date: futureDate(60), slot: 'MATIN', present: true } });
  await prisma.attendance.create({ data: { enrollmentId: enrollment.id, date: futureDate(60), slot: 'APRES_MIDI', present: true } });

  fixture = {
    userId,
    organizationId,
    originalRole: membership.role,
    originalLinkedTrainerId: originalLinkedTrainer?.id ?? null,
    originalOrg,
    poisonOrganizationId: poison.id,
    trainerId: trainer.id,
    secondTrainerId: secondTrainer.id,
    roomId: room.id,
    formationId: formation.id,
    moduleIds: [moduleOne.id, moduleTwo.id],
    sessionId: session.id,
    learnerId: learner.id,
    enrollmentId: enrollment.id,
    expected,
    generatedDocumentIds: [],
  };
});

test.afterAll(async () => {
  if (!fixture) return;
  await prisma.membership.updateMany({
    where: { userId: fixture.userId, organizationId: fixture.organizationId },
    data: { role: fixture.originalRole },
  }).catch(() => null);
  await prisma.document.deleteMany({ where: { id: { in: fixture.generatedDocumentIds } } }).catch(() => null);
  await prisma.document.deleteMany({ where: { organizationId: fixture.organizationId, sessionId: fixture.sessionId } }).catch(() => null);
  await prisma.attendance.deleteMany({ where: { enrollmentId: fixture.enrollmentId } }).catch(() => null);
  await prisma.enrollment.deleteMany({ where: { id: fixture.enrollmentId } }).catch(() => null);
  await prisma.sessionModuleAssignment.deleteMany({ where: { sessionId: fixture.sessionId } }).catch(() => null);
  await prisma.session.deleteMany({ where: { id: fixture.sessionId } }).catch(() => null);
  await prisma.formationModuleTrainer.deleteMany({ where: { moduleId: { in: fixture.moduleIds } } }).catch(() => null);
  await prisma.formationModule.deleteMany({ where: { id: { in: fixture.moduleIds } } }).catch(() => null);
  await prisma.learner.deleteMany({ where: { id: fixture.learnerId } }).catch(() => null);
  await prisma.trainer.deleteMany({ where: { id: { in: [fixture.trainerId, fixture.secondTrainerId] } } }).catch(() => null);
  if (fixture.originalLinkedTrainerId) {
    await prisma.trainer.update({ where: { id: fixture.originalLinkedTrainerId }, data: { userId: fixture.userId } }).catch(() => null);
  }
  await prisma.room.deleteMany({ where: { id: fixture.roomId } }).catch(() => null);
  await prisma.formation.deleteMany({ where: { id: fixture.formationId } }).catch(() => null);
  await prisma.organization.deleteMany({ where: { id: fixture.poisonOrganizationId } }).catch(() => null);
  await prisma.organization.update({ where: { id: fixture.organizationId }, data: fixture.originalOrg }).catch(() => null);
  await prisma.$disconnect();
});

test('formateur lie: le portail formateur voit la session reelle du centre', async ({ page }) => {
  await setRole('OWNER');
  await page.goto('/trainer');
  await page.waitForLoadState('networkidle');
  await expectNoServerError(page);
  await expect(page.getByRole('heading', { name: new RegExp(TAG, 'i') })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(fixture.expected.formationTitle)).toBeVisible({ timeout: 20_000 });
});

test('OWNER centre: genere les 78 types de documents depuis le dashboard reel', async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  await setRole('OWNER');
  await page.goto('/documents');
  await page.waitForLoadState('networkidle');
  await expectNoServerError(page);

  const form = await generationForm(page);
  const uiTypes = await form.locator('select[name="type"] option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(uiTypes).toEqual([...GENERATABLE_DOCUMENT_TYPES]);

  for (const [index, type] of GENERATABLE_DOCUMENT_TYPES.entries()) {
    const doc = await generateOneDocumentFromUi(page, type);
    fixture.generatedDocumentIds.push(doc.id);
    await assertGeneratedDocument(page, doc.id, type);
    test.info().annotations.push({
      type: 'generated-document',
      description: `${index + 1}/${GENERATABLE_DOCUMENT_TYPES.length} ${type} ${DOC_LABELS[type] ?? ''}`,
    });
  }

  const generated = await prisma.document.findMany({
    where: { id: { in: fixture.generatedDocumentIds } },
    select: { id: true, type: true },
  });
  expect(generated).toHaveLength(GENERATABLE_DOCUMENT_TYPES.length);
  expect(new Set(generated.map((d) => d.type)).size).toBe(GENERATABLE_DOCUMENT_TYPES.length);
});

test('TRAINER centre: voit son portail mais ne peut pas generer les documents du centre', async ({ page }) => {
  await setRole('TRAINER');
  await page.goto('/trainer');
  await page.waitForLoadState('networkidle');
  await expectNoServerError(page);
  await expect(page.getByText(fixture.expected.formationTitle)).toBeVisible({ timeout: 20_000 });

  await page.goto('/documents');
  await page.waitForLoadState('networkidle');
  await expectNoServerError(page);
  await expect(page).toHaveURL(/\/trainer/, { timeout: 20_000 });
  await expect(page.getByText(fixture.expected.formationTitle)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^générer le document$/i })).not.toBeVisible();
  await setRole('OWNER');
});
