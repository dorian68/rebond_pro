/**
 * Document context propagation from the active center dashboard instance.
 *
 * This is stricter than "a document exists": it checks that the generated file and
 * persisted generationContextSnapshot use the current tenant, selected session,
 * trainer, learner, room and organization legal data, without leaking another tenant.
 */
import { test, expect, type Page } from '@playwright/test';
import type { Role } from '@prisma/client';
import { prisma, getDevContext } from '../db-fixture';
import { extractText } from '../parse-doc';
import { expectNoServerError } from '../helpers';

const RUN = Date.now().toString().slice(-8);
const TAG = `CTX${RUN}`;
const rolesThatCanGenerate: Role[] = ['OWNER', 'ADMIN', 'ASSISTANT'];

type Snapshot = {
  values?: Record<string, unknown>;
  availableVariables?: string[];
  completionStatus?: string;
  completionScore?: number;
};

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
  };
  poisonOrganizationId: string;
  formationId: string;
  sessionId: string;
  learnerId: string;
  enrollmentId: string;
  trainerId: string;
  roomId: string;
  expected: {
    orgName: string;
    orgLegalName: string;
    orgNda: string;
    legalRep: string;
    formationTitle: string;
    learnerName: string;
    learnerCompany: string;
    trainerName: string;
    roomName: string;
    amountText: string;
    poisonOrgName: string;
    poisonFormationTitle: string;
  };
};

let fixture: Fixture;

test.describe.configure({ mode: 'serial', timeout: 180_000 });

function futureDate(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function looseText(value: string): string {
  return value.toLowerCase().replace(/[\s\u00a0\u202f'’.,;:()[\]-]+/g, '');
}

function expectTextContains(text: string, marker: string) {
  expect(looseText(text), `document text should contain "${marker}". Extract: ${text.slice(0, 500)}`).toContain(looseText(marker));
}

function expectTextNotContains(text: string, marker: string) {
  expect(looseText(text), `document text must not contain cross-tenant marker "${marker}". Extract: ${text.slice(0, 500)}`).not.toContain(looseText(marker));
}

async function setRole(role: Role) {
  await prisma.membership.updateMany({
    where: { userId: fixture.userId, organizationId: fixture.organizationId },
    data: { role },
  });
}

async function generateConvocationFromDashboard(page: Page, role: Role) {
  await setRole(role);
  const beforeIds = new Set(
    (await prisma.document.findMany({
      where: { organizationId: fixture.organizationId, sessionId: fixture.sessionId, type: 'CONVOCATION' },
      select: { id: true },
    })).map((d) => d.id),
  );

  await page.goto('/documents');
  await page.waitForLoadState('networkidle');
  await expectNoServerError(page);

  const form = page.locator('form').filter({ has: page.getByRole('button', { name: /générer le document/i }) }).first();
  await expect(form, `${role} should see the manual document generation form`).toBeVisible({ timeout: 15_000 });

  await form.locator('select[name="type"]').selectOption('CONVOCATION');
  await form.locator('select[name="sessionId"]').selectOption(fixture.sessionId);
  await form.locator('select[name="templateId"]').selectOption('__builtin');

  await form.getByRole('button', { name: /analyser avant génération/i }).click();
  await expect(form.getByText(/Complet|100%|0 à compléter/i).first(), 'preflight must show complete contextual data').toBeVisible({ timeout: 15_000 });

  await form.getByRole('button', { name: /^générer le document$/i }).click();

  let doc = null as Awaited<ReturnType<typeof prisma.document.findFirst>> | null;
  for (let i = 0; i < 90 && !doc; i += 1) {
    await page.waitForTimeout(1_000);
    doc = await prisma.document.findFirst({
      where: {
        organizationId: fixture.organizationId,
        sessionId: fixture.sessionId,
        enrollmentId: fixture.enrollmentId,
        type: 'CONVOCATION',
        id: { notIn: [...beforeIds] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  expect(doc, `${role} should persist a new CONVOCATION document`).toBeTruthy();
  await expect(form.getByText(/1 document généré/i).first(), `${role} generation should expose a success message`).toBeVisible({ timeout: 15_000 });
  return doc!;
}

async function assertDocumentContext(page: Page, docId: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  expect(doc).toBeTruthy();
  expect(doc!.organizationId).toBe(fixture.organizationId);
  expect(doc!.sessionId).toBe(fixture.sessionId);
  expect(doc!.enrollmentId).toBe(fixture.enrollmentId);
  expect(doc!.completionStatus).toBe('COMPLETE');
  expect(doc!.completionScore).toBeGreaterThanOrEqual(95);
  expect(doc!.missingVariables).toEqual([]);

  const snapshot = doc!.generationContextSnapshot as Snapshot;
  expect(snapshot.completionStatus).toBe('COMPLETE');
  expect(snapshot.completionScore).toBeGreaterThanOrEqual(95);
  expect(snapshot.availableVariables).toEqual(expect.arrayContaining([
    'org_name',
    'learner_name',
    'formation_title',
    'session_date_range',
    'trainer_name',
    'session_location',
  ]));
  expect(snapshot.values).toMatchObject({
    org_name: fixture.expected.orgName,
    org_legal_name: fixture.expected.orgLegalName,
    org_nda: fixture.expected.orgNda,
    formation_title: fixture.expected.formationTitle,
    learner_name: fixture.expected.learnerName,
    learner_company: fixture.expected.learnerCompany,
    trainer_name: fixture.expected.trainerName,
    session_location: fixture.expected.roomName,
    room_name: fixture.expected.roomName,
  });
  expect(snapshot.values?.org_name).not.toBe(fixture.expected.poisonOrgName);
  expect(snapshot.values?.formation_title).not.toBe(fixture.expected.poisonFormationTitle);

  const response = await page.request.get(`/api/documents/${docId}/download`);
  expect(response.ok(), `download should be authorized for generated document ${docId}`).toBeTruthy();
  const buffer = Buffer.from(await response.body());
  expect(buffer.length).toBeGreaterThan(600);
  const text = await extractText(buffer, response.headers()['content-type']);

  for (const marker of [
    fixture.expected.orgName,
    fixture.expected.orgLegalName,
    fixture.expected.orgNda,
    fixture.expected.formationTitle,
    fixture.expected.learnerName,
    fixture.expected.learnerCompany,
    fixture.expected.trainerName,
    fixture.expected.roomName,
  ]) {
    expectTextContains(text, marker);
  }
  expectTextNotContains(text, fixture.expected.poisonOrgName);
  expectTextNotContains(text, fixture.expected.poisonFormationTitle);
}

test.beforeAll(async () => {
  const { userId, organizationId } = await getDevContext();
  const membership = await prisma.membership.findFirstOrThrow({
    where: { userId, organizationId, status: 'ACTIVE' },
    select: { role: true },
  });
  const originalOrg = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, legalName: true, legalAddress: true, nda: true, legalRep: true, publicEmail: true, publicPhone: true },
  });

  const expected = {
    orgName: `${TAG} Active Center`,
    orgLegalName: `${TAG} Active Legal SAS`,
    orgNda: `NDA-${RUN}`,
    legalRep: `${TAG} Legal Rep`,
    formationTitle: `${TAG} Dashboard Context Formation`,
    learnerName: `${TAG} Learner Flow`,
    learnerCompany: `${TAG} Company Context`,
    trainerName: `${TAG} Trainer Mentor`,
    roomName: `${TAG} Room Atlas`,
    amountText: '1 500 €',
    poisonOrgName: `${TAG} Poison Center`,
    poisonFormationTitle: `${TAG} Poison Formation`,
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: expected.orgName,
      legalName: expected.orgLegalName,
      legalAddress: `${TAG} 12 rue du Contexte`,
      nda: expected.orgNda,
      legalRep: expected.legalRep,
      publicEmail: `contact-${RUN}@context.test`,
      publicPhone: '0590000000',
      plan: 'PRO',
    },
  });

  const poison = await prisma.organization.create({
    data: {
      name: expected.poisonOrgName,
      slug: `${TAG.toLowerCase()}-poison`,
      legalName: `${TAG} Poison Legal SAS`,
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

  const [trainer, room, formation, learner] = await Promise.all([
    prisma.trainer.create({
      data: {
        organizationId,
        firstName: TAG,
        lastName: 'Trainer Mentor',
        email: `trainer-${RUN}@context.test`,
        active: true,
      },
    }),
    prisma.room.create({
      data: {
        organizationId,
        name: expected.roomName,
        type: 'SALLE',
        capacity: 12,
        location: `${TAG} Campus A`,
      },
    }),
    prisma.formation.create({
      data: {
        organizationId,
        title: expected.formationTitle,
        slug: `${TAG.toLowerCase()}-dashboard-context`,
        modality: 'PRESENTIEL',
        level: 'INTERMEDIAIRE',
        status: 'PUBLIE',
        isPublic: false,
        price: 150000,
        durationDays: 2,
        durationHours: 14,
        objectives: `${TAG} Objectives for document propagation`,
        program: `${TAG} Program line 1\n${TAG} Program line 2`,
        prerequisites: `${TAG} Prerequisites`,
      },
    }),
    prisma.learner.create({
      data: {
        organizationId,
        firstName: TAG,
        lastName: 'Learner Flow',
        company: expected.learnerCompany,
        email: `learner-${RUN}@context.test`,
      },
    }),
  ]);

  const session = await prisma.session.create({
    data: {
      organizationId,
      formationId: formation.id,
      trainerId: trainer.id,
      roomId: room.id,
      startDate: futureDate(45),
      endDate: futureDate(46),
      slots: ['MATIN', 'APRES_MIDI'],
      capacity: 8,
      pricePerLearner: 150000,
      breakEvenSeats: 2,
      status: 'OUVERTE',
      trainerConfirmed: true,
      notes: `${TAG} session notes should stay scoped`,
    },
  });
  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId,
      learnerId: learner.id,
      sessionId: session.id,
      status: 'CONFIRME',
    },
  });

  fixture = {
    userId,
    organizationId,
    originalRole: membership.role,
    originalOrg,
    poisonOrganizationId: poison.id,
    formationId: formation.id,
    sessionId: session.id,
    learnerId: learner.id,
    enrollmentId: enrollment.id,
    trainerId: trainer.id,
    roomId: room.id,
    expected,
  };
});

test.afterAll(async () => {
  if (!fixture) return;
  await prisma.membership.updateMany({
    where: { userId: fixture.userId, organizationId: fixture.organizationId },
    data: { role: fixture.originalRole },
  });
  await prisma.document.deleteMany({ where: { organizationId: fixture.organizationId, sessionId: fixture.sessionId } }).catch(() => null);
  await prisma.enrollment.deleteMany({ where: { organizationId: fixture.organizationId, sessionId: fixture.sessionId } }).catch(() => null);
  await prisma.session.deleteMany({ where: { organizationId: fixture.organizationId, id: fixture.sessionId } }).catch(() => null);
  await prisma.learner.deleteMany({ where: { organizationId: fixture.organizationId, id: fixture.learnerId } }).catch(() => null);
  await prisma.trainer.deleteMany({ where: { organizationId: fixture.organizationId, id: fixture.trainerId } }).catch(() => null);
  await prisma.room.deleteMany({ where: { organizationId: fixture.organizationId, id: fixture.roomId } }).catch(() => null);
  await prisma.formation.deleteMany({ where: { organizationId: fixture.organizationId, id: fixture.formationId } }).catch(() => null);
  await prisma.organization.deleteMany({ where: { id: fixture.poisonOrganizationId } }).catch(() => null);
  await prisma.organization.update({
    where: { id: fixture.organizationId },
    data: fixture.originalOrg,
  }).catch(() => null);
  await prisma.$disconnect();
});

test('COMMERCIAL centre: lecture seule, aucune génération documentaire depuis le dashboard', async ({ page }) => {
  await setRole('COMMERCIAL');
  await page.goto('/documents');
  await page.waitForLoadState('networkidle');
  await expectNoServerError(page);

  await expect(page.getByText(/Lecture seule/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /^générer le document$/i })).not.toBeVisible();
  await expect(page.getByRole('button', { name: /analyser avant génération/i })).not.toBeVisible();
});

for (const role of rolesThatCanGenerate) {
  test(`${role} centre: les infos du dashboard ruissellent dans la convocation générée`, async ({ page }) => {
    const doc = await generateConvocationFromDashboard(page, role);
    await assertDocumentContext(page, doc.id);
  });
}
