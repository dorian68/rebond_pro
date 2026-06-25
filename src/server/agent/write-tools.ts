import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant";
import { enforceQuota } from "@/server/quota";
import { assertSessionSchedulable } from "@/server/scheduling-constraints";
import { slugify } from "@/lib/utils";
import { parseModulesInput, replaceFormationModules } from "@/server/formation-modules";
import type { Role } from "@prisma/client";
import type { AgentTool, ToolResult } from "@/server/agent/tools";

// Schéma JSON d'un découpage en modules (réutilisé par create/update_formation).
const MODULE_INPUT_SCHEMA = {
  type: "array",
  description: "Découpage en modules. Chaque module : { title, description?, durationDays?, durationHours?, trainerIds? }. trainerIds = IDs de formateurs existants (récupérés via search_entities/read_entity) capables d'animer ce module. Fournir ce tableau REMPLACE l'intégralité des modules de la formation.",
  items: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      durationDays: { type: "number" },
      durationHours: { type: "number" },
      trainerIds: { type: "array", items: { type: "string" } },
    },
    required: ["title"],
  },
} as const;

// Rôles autorisés par domaine (alignés sur les server actions)
const ADMINS: Role[] = ["OWNER", "ADMIN"];
const STAFF: Role[] = ["OWNER", "ADMIN", "ASSISTANT"];
const SALES: Role[] = ["OWNER", "ADMIN", "COMMERCIAL"];

const MODALITIES = ["PRESENTIEL", "DISTANCIEL", "HYBRIDE"];
const LEVELS = ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"];
const FORMATION_STATUS = ["BROUILLON", "PUBLIE", "ARCHIVE"];
const SESSION_STATUS = ["BROUILLON", "OUVERTE", "COMPLETE", "TERMINEE", "ANNULEE"];
const PROSPECT_TYPES = ["PARTICULIER", "ENTREPRISE", "ORGANISME"];
const PROSPECT_SOURCES = ["LINKEDIN", "SITE_WEB", "APPEL", "RECOMMANDATION", "SALON", "CAMPAGNE_EMAIL", "PAGE_PUBLIQUE", "AUTRE"];
const ENROLLMENT_STATUS = ["PRE_INSCRIT", "INSCRIT", "CONFIRME", "PRESENT", "ABSENT", "TERMINE"];
const SLOTS = ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"];

// ── Helpers ───────────────────────────────────────────────────────
function s(v: unknown): string { return String(v ?? "").trim(); }
function opt(v: unknown): string | undefined { const x = s(v); return x || undefined; }
function num(v: unknown): number | undefined { if (v == null || v === "") return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; }
function euros(v: unknown): number | undefined { const n = num(v); return n == null ? undefined : Math.round(n * 100); }
function parseDate(v: unknown, label: string): Date { const d = new Date(s(v)); if (isNaN(d.getTime())) throw new Error(`${label} : date invalide (format attendu AAAA-MM-JJ ou ISO).`); return d; }
function enumOf(v: unknown, allowed: string[], label: string): string { const x = s(v).toUpperCase(); if (!allowed.includes(x)) throw new Error(`${label} invalide. Valeurs : ${allowed.join(", ")}.`); return x; }

function refresh(text: string): ToolResult { try { revalidatePath("/", "layout"); } catch { /* hors requête */ } return { textForLLM: text, custom: { name: "app.refresh", value: {} } }; }

async function uniqueFormationSlug(orgId: string, base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || "formation";
  let slug = root;
  for (let i = 1; ; i++) {
    const found = await prisma.formation.findFirst({ where: { organizationId: orgId, slug, NOT: exceptId ? { id: exceptId } : undefined } });
    if (!found) return slug;
    slug = `${root}-${i}`;
  }
}

// ══════════════════════════════════════════════════════════════════
//  OUTILS D'ÉCRITURE (toutes actions sensibles → validation humaine)
// ══════════════════════════════════════════════════════════════════
export const WRITE_TOOLS: AgentTool[] = [
  // ─────────────── FORMATIONS ───────────────
  {
    name: "create_formation",
    description: "Crée (conçoit) une nouvelle formation dans le catalogue. L'assistant peut rédiger lui-même un programme pédagogique complet (objectifs, programme détaillé, public, prérequis). ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre de la formation" },
        category: { type: "string" },
        shortDescription: { type: "string", description: "Accroche courte (1-2 phrases)" },
        longDescription: { type: "string" },
        objectives: { type: "string", description: "Objectifs pédagogiques (texte ou liste)" },
        targetAudience: { type: "string", description: "Public visé" },
        prerequisites: { type: "string" },
        program: { type: "string", description: "Programme détaillé jour par jour / module par module" },
        durationDays: { type: "number" },
        durationHours: { type: "number" },
        priceEuros: { type: "number", description: "Prix en euros" },
        modality: { type: "string", enum: MODALITIES },
        level: { type: "string", enum: LEVELS },
        status: { type: "string", enum: FORMATION_STATUS, description: "BROUILLON par défaut" },
        modules: MODULE_INPUT_SCHEMA,
      },
      required: ["title"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, ADMINS);
      const title = s(a.title);
      if (title.length < 2) throw new Error("Titre requis (2 caractères min).");
      const slug = await uniqueFormationSlug(ctx.organizationId, title);
      const f = await prisma.formation.create({
        data: {
          organizationId: ctx.organizationId, title, slug,
          category: opt(a.category), shortDescription: opt(a.shortDescription), longDescription: opt(a.longDescription),
          objectives: opt(a.objectives), targetAudience: opt(a.targetAudience), prerequisites: opt(a.prerequisites), program: opt(a.program),
          durationDays: num(a.durationDays) ?? null, durationHours: num(a.durationHours) ?? null,
          price: euros(a.priceEuros) ?? 0,
          modality: (a.modality ? enumOf(a.modality, MODALITIES, "modality") : "PRESENTIEL") as never,
          level: (a.level ? enumOf(a.level, LEVELS, "level") : "DEBUTANT") as never,
          status: (a.status ? enumOf(a.status, FORMATION_STATUS, "status") : "BROUILLON") as never,
        },
      });
      const modules = a.modules != null ? parseModulesInput(a.modules) : [];
      if (modules.length) await replaceFormationModules(f.id, ctx.organizationId, modules);
      return refresh(`Formation « ${f.title} » créée (id ${f.id})${modules.length ? ` avec ${modules.length} module(s)` : ""}. Fiche : /formations/${f.id}`);
    },
  },
  {
    name: "update_formation",
    description: "Modifie une formation existante. Seuls les champs fournis sont mis à jour. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" }, category: { type: "string" }, shortDescription: { type: "string" }, longDescription: { type: "string" },
        objectives: { type: "string" }, targetAudience: { type: "string" }, prerequisites: { type: "string" }, program: { type: "string" },
        durationDays: { type: "number" }, durationHours: { type: "number" }, priceEuros: { type: "number" },
        modality: { type: "string", enum: MODALITIES }, level: { type: "string", enum: LEVELS }, status: { type: "string", enum: FORMATION_STATUS },
        modules: MODULE_INPUT_SCHEMA,
      },
      required: ["id"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, ADMINS);
      const id = s(a.id);
      const existing = await prisma.formation.findFirst({ where: { id, organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Formation introuvable.");
      const data: Record<string, unknown> = {};
      if (a.title != null) { data.title = s(a.title); data.slug = await uniqueFormationSlug(ctx.organizationId, s(a.title), id); }
      if (a.category != null) data.category = opt(a.category);
      if (a.shortDescription != null) data.shortDescription = opt(a.shortDescription);
      if (a.longDescription != null) data.longDescription = opt(a.longDescription);
      if (a.objectives != null) data.objectives = opt(a.objectives);
      if (a.targetAudience != null) data.targetAudience = opt(a.targetAudience);
      if (a.prerequisites != null) data.prerequisites = opt(a.prerequisites);
      if (a.program != null) data.program = opt(a.program);
      if (a.durationDays != null) data.durationDays = num(a.durationDays);
      if (a.durationHours != null) data.durationHours = num(a.durationHours);
      if (a.priceEuros != null) data.price = euros(a.priceEuros);
      if (a.modality != null) data.modality = enumOf(a.modality, MODALITIES, "modality");
      if (a.level != null) data.level = enumOf(a.level, LEVELS, "level");
      if (a.status != null) data.status = enumOf(a.status, FORMATION_STATUS, "status");
      await prisma.formation.update({ where: { id }, data });
      let moduleNote = "";
      if (a.modules != null) {
        const modules = parseModulesInput(a.modules);
        await replaceFormationModules(id, ctx.organizationId, modules);
        moduleNote = ` ${modules.length} module(s) enregistré(s).`;
      }
      return refresh(`Formation « ${existing.title} » mise à jour.${moduleNote}`);
    },
  },
  {
    name: "delete_formation",
    description: "Supprime (archive) une formation. ACTION SENSIBLE et destructive.",
    sensitive: true,
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    execute: async (ctx, a) => {
      requireRole(ctx, ADMINS);
      const existing = await prisma.formation.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Formation introuvable.");
      await prisma.formation.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
      return refresh(`Formation « ${existing.title} » supprimée.`);
    },
  },

  // ─────────────── SESSIONS ───────────────
  {
    name: "create_session",
    description: "Programme une nouvelle session (créneau) pour une formation. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        formationId: { type: "string" },
        startDate: { type: "string", description: "Date/heure de début (ISO ou AAAA-MM-JJ)" },
        endDate: { type: "string", description: "Date/heure de fin" },
        trainerId: { type: "string" }, roomId: { type: "string" },
        capacity: { type: "number", description: "Places (défaut 10)" },
        pricePerLearnerEuros: { type: "number" },
        status: { type: "string", enum: SESSION_STATUS, description: "OUVERTE par défaut" },
        slots: { type: "array", items: { type: "string", enum: SLOTS }, description: "Créneaux: MATIN/APRES_MIDI/JOURNEE/SOIR" },
      },
      required: ["formationId", "startDate", "endDate"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      await enforceQuota(ctx, "sessions");
      const formation = await prisma.formation.findFirst({ where: { id: s(a.formationId), organizationId: ctx.organizationId } });
      if (!formation) throw new Error("Formation invalide.");
      const start = parseDate(a.startDate, "startDate");
      const end = parseDate(a.endDate, "endDate");
      if (end < start) throw new Error("La date de fin doit suivre la date de début.");
      if (a.trainerId) { const t = await prisma.trainer.findFirst({ where: { id: s(a.trainerId), organizationId: ctx.organizationId } }); if (!t) throw new Error("Formateur invalide."); }
      if (a.roomId) { const r = await prisma.room.findFirst({ where: { id: s(a.roomId), organizationId: ctx.organizationId } }); if (!r) throw new Error("Salle invalide."); }
      const slots = Array.isArray(a.slots) && a.slots.length ? (a.slots as unknown[]).map((x) => enumOf(x, SLOTS, "slot")) : ["JOURNEE"];
      await assertSessionSchedulable({ organizationId: ctx.organizationId, startDate: start, endDate: end, slots, trainerId: opt(a.trainerId), roomId: opt(a.roomId) });
      const sess = await prisma.session.create({
        data: {
          organizationId: ctx.organizationId, formationId: formation.id,
          trainerId: opt(a.trainerId) ?? null, roomId: opt(a.roomId) ?? null,
          startDate: start, endDate: end, slots: slots as never,
          capacity: num(a.capacity) ?? 10, pricePerLearner: euros(a.pricePerLearnerEuros) ?? formation.price,
          breakEvenSeats: 1,
          status: (a.status ? enumOf(a.status, SESSION_STATUS, "status") : "OUVERTE") as never,
        },
      });
      return refresh(`Session créée pour « ${formation.title} » (id ${sess.id}). Fiche : /sessions/${sess.id}`);
    },
  },
  {
    name: "update_session",
    description: "Modifie une session : reprogrammer (dates), changer le formateur/la salle, la capacité ou le statut. Seuls les champs fournis changent. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        startDate: { type: "string" }, endDate: { type: "string" },
        trainerId: { type: "string" }, roomId: { type: "string" },
        capacity: { type: "number" }, pricePerLearnerEuros: { type: "number" },
        status: { type: "string", enum: SESSION_STATUS },
      },
      required: ["id"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const existing = await prisma.session.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId }, include: { formation: { select: { title: true } } } });
      if (!existing) throw new Error("Session introuvable.");
      const data: Record<string, unknown> = {};
      const start = a.startDate != null ? parseDate(a.startDate, "startDate") : existing.startDate;
      const end = a.endDate != null ? parseDate(a.endDate, "endDate") : existing.endDate;
      if (end < start) throw new Error("La date de fin doit suivre la date de début.");
      if (a.startDate != null) data.startDate = start;
      if (a.endDate != null) data.endDate = end;
      if (a.trainerId != null) { const tid = opt(a.trainerId); if (tid) { const t = await prisma.trainer.findFirst({ where: { id: tid, organizationId: ctx.organizationId } }); if (!t) throw new Error("Formateur invalide."); } data.trainerId = tid ?? null; }
      if (a.roomId != null) { const rid = opt(a.roomId); if (rid) { const r = await prisma.room.findFirst({ where: { id: rid, organizationId: ctx.organizationId } }); if (!r) throw new Error("Salle invalide."); } data.roomId = rid ?? null; }
      await assertSessionSchedulable({
        organizationId: ctx.organizationId,
        startDate: start,
        endDate: end,
        slots: existing.slots,
        trainerId: (data.trainerId as string | null | undefined) ?? existing.trainerId,
        roomId: (data.roomId as string | null | undefined) ?? existing.roomId,
        excludeSessionId: existing.id,
      });
      if (a.capacity != null) data.capacity = num(a.capacity);
      if (a.pricePerLearnerEuros != null) data.pricePerLearner = euros(a.pricePerLearnerEuros);
      if (a.status != null) data.status = enumOf(a.status, SESSION_STATUS, "status");
      await prisma.session.update({ where: { id: existing.id }, data });
      return refresh(`Session « ${existing.formation.title} » mise à jour.`);
    },
  },
  {
    name: "delete_session",
    description: "Supprime un créneau / une session de formation. ACTION SENSIBLE et destructive.",
    sensitive: true,
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const existing = await prisma.session.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId }, include: { formation: { select: { title: true } }, _count: { select: { enrollments: true } } } });
      if (!existing) throw new Error("Session introuvable.");
      await prisma.session.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
      const warn = existing._count.enrollments > 0 ? ` (⚠ ${existing._count.enrollments} inscrit(s) concerné(s))` : "";
      return refresh(`Créneau « ${existing.formation.title} » du ${existing.startDate.toLocaleDateString("fr-FR")} supprimé${warn}.`);
    },
  },
  {
    name: "confirm_session_trainer",
    description: "Bascule la confirmation du formateur pour une session (confirmé ↔ non confirmé). ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const existing = await prisma.session.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Session introuvable.");
      await prisma.session.update({ where: { id: existing.id }, data: { trainerConfirmed: !existing.trainerConfirmed } });
      return refresh(`Formateur ${!existing.trainerConfirmed ? "confirmé" : "non confirmé"} pour la session.`);
    },
  },

  // ─────────────── PROSPECTS (CRM) ───────────────
  {
    name: "create_prospect",
    description: "Ajoute un prospect au pipeline commercial. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nom du prospect / entreprise" },
        contactName: { type: "string" }, type: { type: "string", enum: PROSPECT_TYPES },
        email: { type: "string" }, phone: { type: "string" },
        stage: { type: "string", enum: ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE", "GAGNE", "PERDU"] },
        potentialEuros: { type: "number" }, formationOfInterestId: { type: "string" },
        source: { type: "string", enum: PROSPECT_SOURCES }, isHot: { type: "boolean" }, notes: { type: "string" },
      },
      required: ["name"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, SALES);
      const p = await prisma.prospect.create({
        data: {
          organizationId: ctx.organizationId, name: s(a.name), contactName: opt(a.contactName),
          type: (a.type ? enumOf(a.type, PROSPECT_TYPES, "type") : "ENTREPRISE") as never,
          email: opt(a.email) ?? null, phone: opt(a.phone),
          formationOfInterestId: opt(a.formationOfInterestId) ?? null,
          source: (a.source ? enumOf(a.source, PROSPECT_SOURCES, "source") : "AUTRE") as never,
          stage: (a.stage ? enumOf(a.stage, ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE", "GAGNE", "PERDU"], "stage") : "NOUVEAU") as never,
          potentialAmount: euros(a.potentialEuros) ?? 0, isHot: a.isHot === true, notes: opt(a.notes), ownerId: ctx.userId,
        },
      });
      return refresh(`Prospect « ${p.name} » créé (id ${p.id}). Fiche : /prospects/${p.id}`);
    },
  },
  {
    name: "update_prospect",
    description: "Modifie un prospect. Seuls les champs fournis changent. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" }, name: { type: "string" }, contactName: { type: "string" }, type: { type: "string", enum: PROSPECT_TYPES },
        email: { type: "string" }, phone: { type: "string" }, potentialEuros: { type: "number" },
        formationOfInterestId: { type: "string" }, source: { type: "string", enum: PROSPECT_SOURCES }, isHot: { type: "boolean" }, notes: { type: "string" },
      },
      required: ["id"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, SALES);
      const existing = await prisma.prospect.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Prospect introuvable.");
      const data: Record<string, unknown> = {};
      if (a.name != null) data.name = s(a.name);
      if (a.contactName != null) data.contactName = opt(a.contactName);
      if (a.type != null) data.type = enumOf(a.type, PROSPECT_TYPES, "type");
      if (a.email != null) data.email = opt(a.email) ?? null;
      if (a.phone != null) data.phone = opt(a.phone);
      if (a.potentialEuros != null) data.potentialAmount = euros(a.potentialEuros);
      if (a.formationOfInterestId != null) data.formationOfInterestId = opt(a.formationOfInterestId) ?? null;
      if (a.source != null) data.source = enumOf(a.source, PROSPECT_SOURCES, "source");
      if (a.isHot != null) data.isHot = a.isHot === true;
      if (a.notes != null) data.notes = opt(a.notes);
      await prisma.prospect.update({ where: { id: existing.id }, data });
      return refresh(`Prospect « ${existing.name} » mis à jour.`);
    },
  },
  {
    name: "delete_prospect",
    description: "Supprime un prospect du pipeline. ACTION SENSIBLE et destructive.",
    sensitive: true,
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    execute: async (ctx, a) => {
      requireRole(ctx, SALES);
      const existing = await prisma.prospect.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Prospect introuvable.");
      await prisma.prospect.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
      return refresh(`Prospect « ${existing.name} » supprimé.`);
    },
  },
  {
    name: "add_prospect_activity",
    description: "Enregistre une activité sur un prospect (appel, email, note). ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: { prospectId: { type: "string" }, type: { type: "string", description: "appel|email|note" }, content: { type: "string" } },
      required: ["prospectId", "content"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, SALES);
      const existing = await prisma.prospect.findFirst({ where: { id: s(a.prospectId), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Prospect introuvable.");
      await prisma.prospectActivity.create({ data: { prospectId: existing.id, type: opt(a.type) ?? "note", content: s(a.content) } });
      return refresh(`Activité ajoutée sur « ${existing.name} ».`);
    },
  },
  {
    name: "convert_prospect_to_learner",
    description: "Convertit un prospect en apprenant, et l'inscrit optionnellement à une session. Passe le prospect en GAGNE. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { prospectId: { type: "string" }, sessionId: { type: "string" } }, required: ["prospectId"] },
    execute: async (ctx, a) => {
      requireRole(ctx, SALES);
      const p = await prisma.prospect.findFirst({ where: { id: s(a.prospectId), organizationId: ctx.organizationId } });
      if (!p) throw new Error("Prospect introuvable.");
      const sessionId = opt(a.sessionId);
      const session = sessionId ? await prisma.session.findFirst({ where: { id: sessionId, organizationId: ctx.organizationId }, include: { _count: { select: { enrollments: true } } } }) : null;
      const [firstName, ...rest] = (p.contactName || p.name).split(" ");
      const learner = await prisma.learner.create({
        data: { organizationId: ctx.organizationId, firstName: firstName || p.name, lastName: rest.join(" ") || "", email: p.email, phone: p.phone, company: p.type !== "PARTICULIER" ? p.name : null },
      });
      let enrolled = false;
      if (session && session._count.enrollments < session.capacity) {
        await prisma.enrollment.create({ data: { organizationId: ctx.organizationId, learnerId: learner.id, sessionId: session.id, status: "INSCRIT" } });
        enrolled = true;
      }
      await prisma.prospect.update({ where: { id: p.id }, data: { stage: "GAGNE" } });
      await prisma.prospectActivity.create({ data: { prospectId: p.id, type: "conversion", content: `Converti en apprenant${enrolled ? " et inscrit à une session" : ""}.` } });
      return refresh(`« ${p.name} » converti en apprenant${enrolled ? " et inscrit à la session" : ""}. Fiche : /apprenants/${learner.id}`);
    },
  },

  // ─────────────── APPRENANTS & INSCRIPTIONS ───────────────
  {
    name: "create_learner",
    description: "Crée un apprenant. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: { firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, company: { type: "string" } },
      required: ["firstName", "lastName"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const l = await prisma.learner.create({
        data: { organizationId: ctx.organizationId, firstName: s(a.firstName), lastName: s(a.lastName), email: opt(a.email) ?? null, phone: opt(a.phone), company: opt(a.company) },
      });
      return refresh(`Apprenant « ${l.firstName} ${l.lastName} » créé (id ${l.id}). Fiche : /apprenants/${l.id}`);
    },
  },
  {
    name: "update_learner",
    description: "Modifie un apprenant. Seuls les champs fournis changent. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, company: { type: "string" } },
      required: ["id"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const existing = await prisma.learner.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Apprenant introuvable.");
      const data: Record<string, unknown> = {};
      if (a.firstName != null) data.firstName = s(a.firstName);
      if (a.lastName != null) data.lastName = s(a.lastName);
      if (a.email != null) data.email = opt(a.email) ?? null;
      if (a.phone != null) data.phone = opt(a.phone);
      if (a.company != null) data.company = opt(a.company);
      await prisma.learner.update({ where: { id: existing.id }, data });
      return refresh(`Apprenant « ${existing.firstName} ${existing.lastName} » mis à jour.`);
    },
  },
  {
    name: "delete_learner",
    description: "Supprime un apprenant. ACTION SENSIBLE et destructive.",
    sensitive: true,
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const existing = await prisma.learner.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Apprenant introuvable.");
      await prisma.learner.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
      return refresh(`Apprenant « ${existing.firstName} ${existing.lastName} » supprimé.`);
    },
  },
  {
    name: "enroll_learner",
    description: "Inscrit un apprenant à une session. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { learnerId: { type: "string" }, sessionId: { type: "string" } }, required: ["learnerId", "sessionId"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const learner = await prisma.learner.findFirst({ where: { id: s(a.learnerId), organizationId: ctx.organizationId } });
      if (!learner) throw new Error("Apprenant introuvable.");
      const session = await prisma.session.findFirst({ where: { id: s(a.sessionId), organizationId: ctx.organizationId }, include: { _count: { select: { enrollments: true } } } });
      if (!session) throw new Error("Session introuvable.");
      if (session._count.enrollments >= session.capacity) throw new Error("Session complète.");
      const exists = await prisma.enrollment.findUnique({ where: { learnerId_sessionId: { learnerId: learner.id, sessionId: session.id } } });
      if (exists) return refresh(`« ${learner.firstName} ${learner.lastName} » est déjà inscrit à cette session.`);
      await prisma.enrollment.create({ data: { organizationId: ctx.organizationId, learnerId: learner.id, sessionId: session.id, status: "INSCRIT" } });
      if (session._count.enrollments + 1 >= session.capacity) await prisma.session.update({ where: { id: session.id }, data: { status: "COMPLETE" } });
      return refresh(`« ${learner.firstName} ${learner.lastName} » inscrit à la session.`);
    },
  },
  {
    name: "unenroll_learner",
    description: "Désinscrit un apprenant (par enrollmentId, OU par learnerId + sessionId). ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { enrollmentId: { type: "string" }, learnerId: { type: "string" }, sessionId: { type: "string" } } },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      let e = a.enrollmentId ? await prisma.enrollment.findFirst({ where: { id: s(a.enrollmentId), organizationId: ctx.organizationId } }) : null;
      if (!e && a.learnerId && a.sessionId) e = await prisma.enrollment.findFirst({ where: { learnerId: s(a.learnerId), sessionId: s(a.sessionId), organizationId: ctx.organizationId } });
      if (!e) throw new Error("Inscription introuvable.");
      await prisma.enrollment.delete({ where: { id: e.id } });
      await prisma.session.updateMany({ where: { id: e.sessionId, status: "COMPLETE" }, data: { status: "OUVERTE" } });
      return refresh("Apprenant désinscrit de la session.");
    },
  },
  {
    name: "set_enrollment_status",
    description: "Change le statut d'une inscription (émargement). status ∈ {PRE_INSCRIT, INSCRIT, CONFIRME, PRESENT, ABSENT, TERMINE}. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { enrollmentId: { type: "string" }, status: { type: "string", enum: ENROLLMENT_STATUS } }, required: ["enrollmentId", "status"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const status = enumOf(a.status, ENROLLMENT_STATUS, "status");
      const e = await prisma.enrollment.findFirst({ where: { id: s(a.enrollmentId), organizationId: ctx.organizationId } });
      if (!e) throw new Error("Inscription introuvable.");
      await prisma.enrollment.update({ where: { id: e.id }, data: { status: status as never } });
      return refresh(`Statut d'inscription → ${status}.`);
    },
  },

  // ─────────────── FORMATEURS ───────────────
  {
    name: "create_trainer",
    description: "Crée un formateur. specialities = liste de chaînes. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string" }, phone: { type: "string" },
        specialities: { type: "array", items: { type: "string" } }, bio: { type: "string" }, color: { type: "string" },
      },
      required: ["firstName", "lastName"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, ADMINS);
      await enforceQuota(ctx, "trainers");
      const fn = s(a.firstName), ln = s(a.lastName);
      const specs = Array.isArray(a.specialities) ? (a.specialities as unknown[]).map(s).filter(Boolean) : (opt(a.specialities) ? s(a.specialities).split(",").map((x) => x.trim()).filter(Boolean) : []);
      const t = await prisma.trainer.create({
        data: { organizationId: ctx.organizationId, firstName: fn, lastName: ln, initials: ((fn[0] ?? "") + (ln[0] ?? "")).toUpperCase(), email: opt(a.email) ?? null, phone: opt(a.phone), specialities: specs, bio: opt(a.bio), color: opt(a.color), active: true },
      });
      return refresh(`Formateur « ${t.firstName} ${t.lastName} » créé (id ${t.id}). Fiche : /formateurs/${t.id}`);
    },
  },
  {
    name: "update_trainer",
    description: "Modifie un formateur. Seuls les champs fournis changent. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string" }, phone: { type: "string" },
        specialities: { type: "array", items: { type: "string" } }, bio: { type: "string" }, color: { type: "string" }, active: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, ADMINS);
      const existing = await prisma.trainer.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Formateur introuvable.");
      const data: Record<string, unknown> = {};
      if (a.firstName != null) data.firstName = s(a.firstName);
      if (a.lastName != null) data.lastName = s(a.lastName);
      if (a.firstName != null || a.lastName != null) data.initials = ((s(a.firstName) || existing.firstName)[0] + (s(a.lastName) || existing.lastName)[0]).toUpperCase();
      if (a.email != null) data.email = opt(a.email) ?? null;
      if (a.phone != null) data.phone = opt(a.phone);
      if (a.specialities != null) data.specialities = Array.isArray(a.specialities) ? (a.specialities as unknown[]).map(s).filter(Boolean) : s(a.specialities).split(",").map((x) => x.trim()).filter(Boolean);
      if (a.bio != null) data.bio = opt(a.bio);
      if (a.color != null) data.color = opt(a.color);
      if (a.active != null) data.active = a.active === true;
      await prisma.trainer.update({ where: { id: existing.id }, data });
      return refresh(`Formateur « ${existing.firstName} ${existing.lastName} » mis à jour.`);
    },
  },
  {
    name: "delete_trainer",
    description: "Supprime (désactive) un formateur. ACTION SENSIBLE et destructive.",
    sensitive: true,
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    execute: async (ctx, a) => {
      requireRole(ctx, ADMINS);
      const existing = await prisma.trainer.findFirst({ where: { id: s(a.id), organizationId: ctx.organizationId } });
      if (!existing) throw new Error("Formateur introuvable.");
      await prisma.trainer.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });
      return refresh(`Formateur « ${existing.firstName} ${existing.lastName} » supprimé.`);
    },
  },
  {
    name: "add_trainer_unavailability",
    description: "Marque un formateur indisponible sur une date et un créneau. slot ∈ {MATIN, APRES_MIDI, JOURNEE, SOIR}. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: { trainerId: { type: "string" }, date: { type: "string" }, slot: { type: "string", enum: SLOTS }, note: { type: "string" } },
      required: ["trainerId", "date"],
    },
    execute: async (ctx, a) => {
      requireRole(ctx, ADMINS);
      const t = await prisma.trainer.findFirst({ where: { id: s(a.trainerId), organizationId: ctx.organizationId } });
      if (!t) throw new Error("Formateur introuvable.");
      const date = parseDate(a.date, "date");
      const slot = a.slot ? enumOf(a.slot, SLOTS, "slot") : "JOURNEE";
      await prisma.trainerAvailability.create({ data: { trainerId: t.id, date, slot: slot as never, type: "INDISPONIBLE", note: opt(a.note) } });
      return refresh(`${t.firstName} ${t.lastName} marqué indisponible le ${date.toLocaleDateString("fr-FR")} (${slot}).`);
    },
  },

  // ─────────────── QUALITÉ ───────────────
  {
    name: "create_complaint",
    description: "Enregistre une réclamation qualité. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { subject: { type: "string" }, description: { type: "string" } }, required: ["subject"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      await prisma.complaint.create({ data: { organizationId: ctx.organizationId, subject: s(a.subject), description: opt(a.description) } });
      return refresh(`Réclamation « ${s(a.subject)} » enregistrée.`);
    },
  },
  {
    name: "update_complaint_status",
    description: "Change le statut d'une réclamation. status ∈ {OUVERTE, EN_COURS, RESOLUE}. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { id: { type: "string" }, status: { type: "string", enum: ["OUVERTE", "EN_COURS", "RESOLUE"] } }, required: ["id", "status"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      const status = enumOf(a.status, ["OUVERTE", "EN_COURS", "RESOLUE"], "status");
      const r = await prisma.complaint.updateMany({ where: { id: s(a.id), organizationId: ctx.organizationId }, data: { status: status as never } });
      if (r.count === 0) throw new Error("Réclamation introuvable.");
      return refresh(`Réclamation → ${status}.`);
    },
  },
  {
    name: "create_improvement_action",
    description: "Crée une action corrective / d'amélioration qualité. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, owner: { type: "string" }, dueDate: { type: "string" } }, required: ["title"] },
    execute: async (ctx, a) => {
      requireRole(ctx, STAFF);
      await prisma.improvementAction.create({ data: { organizationId: ctx.organizationId, title: s(a.title), description: opt(a.description), owner: opt(a.owner), dueDate: a.dueDate ? parseDate(a.dueDate, "dueDate") : null } });
      return refresh(`Action d'amélioration « ${s(a.title)} » créée.`);
    },
  },
];
