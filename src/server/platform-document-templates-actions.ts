"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform";
import { saveFile } from "@/lib/storage";
import { extractDocxVariables } from "@/server/docx/template-engine";
import { DOCUMENT_VARIABLE_MAP } from "@/lib/document-variables";
import { logger } from "@/lib/logger";
import type { FormActionState } from "@/server/formations-actions";

export async function uploadPlatformDocumentTemplate(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requirePlatformAdmin();
  const type = String(formData.get("type") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const isDefault = formData.get("isDefault") === "on";
  const file = formData.get("file");

  if (!type) return { error: "Type de document requis." };
  if (name.length < 2) return { error: "Nom du modèle requis." };
  if (!(file instanceof File) || file.size === 0) return { error: "Fichier DOCX requis." };
  if (!file.name.toLowerCase().endsWith(".docx")) return { error: "Seuls les fichiers .docx sont acceptés." };
  if (file.size > 5 * 1024 * 1024) return { error: "Fichier trop volumineux (5 Mo maximum)." };

  const buffer = Buffer.from(await file.arrayBuffer());
  let variables: string[];
  try {
    variables = extractDocxVariables(buffer);
  } catch (e) {
    logger.error("platform_document_template.docx_parse_failed", {
      by: admin.email,
      type,
      fileName: file.name,
      error: e instanceof Error ? e.message : String(e),
    });
    return { error: "Le fichier DOCX n'a pas pu être lu comme modèle." };
  }

  if (isDefault) {
    await prisma.documentTemplate.updateMany({ where: { organizationId: null, type: type as never }, data: { isDefault: false } });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const key = `document-templates/global/${type.toLowerCase()}-${Date.now()}-${safeName}`;
  await saveFile(key, buffer);
  const recognized = variables.filter((v) => DOCUMENT_VARIABLE_MAP[v]);
  const unknown = variables.filter((v) => !DOCUMENT_VARIABLE_MAP[v]);

  const template = await prisma.documentTemplate.create({
    data: {
      organizationId: null,
      type: type as never,
      name,
      description,
      contentTemplate: `DOCX template: ${file.name}`,
      engine: "DOCX",
      sourceFileUrl: key,
      sourceFileName: file.name,
      sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      variables,
      variablesDetected: { recognized, unknown, total: variables.length },
      isDefault,
      status: "ACTIVE",
      createdById: admin.userId,
    },
  });

  logger.info("platform_document_template.created", {
    by: admin.email,
    templateId: template.id,
    type,
    name,
    sourceFileName: file.name,
    variablesCount: variables.length,
    unknownCount: unknown.length,
    isDefault,
  });

  revalidatePath("/admin/documents");
  revalidatePath("/documents");
  return { ok: true };
}

export async function setDefaultPlatformDocumentTemplate(templateId: string): Promise<void> {
  const admin = await requirePlatformAdmin();
  const template = await prisma.documentTemplate.findFirst({ where: { id: templateId, organizationId: null, status: "ACTIVE" } });
  if (!template) return;
  await prisma.$transaction([
    prisma.documentTemplate.updateMany({ where: { organizationId: null, type: template.type }, data: { isDefault: false } }),
    prisma.documentTemplate.update({ where: { id: template.id }, data: { isDefault: true } }),
  ]);
  logger.info("platform_document_template.default_set", { by: admin.email, templateId: template.id, type: template.type, name: template.name });
  revalidatePath("/admin/documents");
  revalidatePath("/documents");
}

export async function archivePlatformDocumentTemplate(templateId: string): Promise<void> {
  const admin = await requirePlatformAdmin();
  const template = await prisma.documentTemplate.findFirst({ where: { id: templateId, organizationId: null } });
  if (!template) return;
  await prisma.$transaction([
    prisma.documentTemplate.update({ where: { id: template.id }, data: { status: "ARCHIVED", isDefault: false } }),
  ]);
  logger.info("platform_document_template.archived", { by: admin.email, templateId: template.id, type: template.type, name: template.name });
  revalidatePath("/admin/documents");
  revalidatePath("/documents");
}
