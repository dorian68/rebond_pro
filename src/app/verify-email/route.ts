import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Base PUBLIQUE pour les redirections (derrière un reverse proxy, request.url contient l'hôte
  // interne du conteneur, ex. 0.0.0.0:3000 → casserait le clic depuis l'email).
  const base = process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? url.origin;
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/email-confirmed?status=invalid", base));

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt < new Date()) {
    if (record) await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return NextResponse.redirect(new URL("/email-confirmed?status=invalid", base));
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  // Page de confirmation claire (tous rôles) — l'utilisateur enchaîne ensuite sur /login.
  return NextResponse.redirect(new URL("/email-confirmed", base));
}
