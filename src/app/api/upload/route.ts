import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertRole, requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { uploadPublicImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4 Mo
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };

export async function POST(req: Request) {
  const ctx = await requireTenant();
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }

  const file = form.get("file");
  const kind = String(form.get("kind") || ""); // org_logo | org_cover | trainer_photo
  const trainerId = String(form.get("trainerId") || "");

  if (!(file instanceof File)) return NextResponse.json({ error: "Aucun fichier." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Format non supporté (PNG, JPG, WEBP, GIF, SVG)." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde (max 4 Mo)." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = EXT[file.type] ?? "bin";
  const stamp = Date.now();

  try {
    let url: string;
    if (kind === "org_logo" || kind === "org_cover") {
      if (!assertRole(ctx, ["OWNER", "ADMIN"])) return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });
      const field = kind === "org_logo" ? "logoUrl" : "coverImageUrl";
      url = await uploadPublicImage(`org/${ctx.organizationId}/${field}-${stamp}.${ext}`, buffer, file.type);
      await prisma.organization.update({ where: { id: ctx.organizationId }, data: { [field]: url } });
      revalidatePath("/parametres");
    } else if (kind === "trainer_photo") {
      const trainer = await prisma.trainer.findFirst({
        where: { id: trainerId, organizationId: ctx.organizationId, deletedAt: null },
        select: { id: true, userId: true },
      });
      if (!trainer) return NextResponse.json({ error: "Formateur introuvable." }, { status: 404 });
      const canManageTrainer = assertRole(ctx, ["OWNER", "ADMIN"]);
      const canEditOwnProfile = ctx.role === "TRAINER" && trainer.userId === ctx.userId;
      if (!canManageTrainer && !canEditOwnProfile) return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });
      url = await uploadPublicImage(`trainer/${ctx.organizationId}/${trainerId}-${stamp}.${ext}`, buffer, file.type);
      await prisma.trainer.update({ where: { id: trainerId }, data: { photoUrl: url } });
      revalidatePath("/trainer/profil");
      revalidatePath(`/formateurs/${trainerId}`);
      revalidatePath(`/formateurs/${trainerId}/edit`);
    } else {
      return NextResponse.json({ error: "Type d'upload inconnu." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur d'upload." }, { status: 500 });
  }
}
