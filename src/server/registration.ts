import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/utils";

export type RegistrationInput = {
  name: string;
  centerName: string;
  email: string;
  password: string;
};

export function verificationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueVerificationToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 3600000);
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({ data: { userId, tokenHash: verificationTokenHash(token), expiresAt } }),
  ]);
  return token;
}

export async function createRegistration(input: RegistrationInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("REGISTRATION_EMAIL_EXISTS");

  const base = slugify(input.centerName) || "centre";
  let slug = base;
  for (let i = 1; await prisma.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const passwordHash = await hashPassword(input.password);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const token = randomBytes(32).toString("hex");

  const user = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.centerName, slug, plan: "FREE", billingStatus: "trial", trialEndsAt },
    });
    const createdUser = await tx.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        emailVerified: null,
        emailVerificationTokens: {
          create: { tokenHash: verificationTokenHash(token), expiresAt: new Date(Date.now() + 24 * 3600000) },
        },
      },
    });
    await tx.membership.create({
      data: { userId: createdUser.id, organizationId: organization.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() },
    });
    return createdUser;
  });

  return { user, token };
}
