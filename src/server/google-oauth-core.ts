import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { slugify } from "@/lib/utils";

export const GOOGLE_OAUTH_CONTEXT_COOKIE = "lbr_google_oauth_context";
export const GOOGLE_OAUTH_CONTEXT_TTL_SECONDS = 10 * 60;

const authSpaces = ["client", "centre", "admin"] as const;

const googleOAuthContextSchema = z.object({
  intent: z.enum(["login", "register_center"]),
  centerName: z.string().trim().min(2).max(120).optional(),
  space: z.enum(authSpaces).optional(),
  next: z.string().max(300).optional(),
  remember: z.boolean().optional(),
  issuedAt: z.number().int().nonnegative(),
});

const googleProfileSchema = z.object({
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().trim().min(1).max(160).nullish(),
  picture: z.string().trim().max(1000).nullish(),
  sub: z.string().trim().min(1).max(255).nullish(),
}).passthrough();

type ActiveMembership = {
  organizationId: string;
  role: Role;
  organization: { name: string; slug: string };
};

export type GoogleOAuthContext = z.infer<typeof googleOAuthContextSchema>;

export type GoogleOAuthUser = {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
  role: Role | null;
  rememberSession: boolean;
};

export type GoogleOAuthResolveResult =
  | { ok: true; created: boolean; user: GoogleOAuthUser }
  | { ok: false; reason: "invalid_profile" | "email_unverified" | "account_required" | "missing_center_name"; redirectTo: string };

export function getGoogleOAuthCredentials() {
  const clientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isGoogleOAuthConfigured() {
  return getGoogleOAuthCredentials() !== null;
}

function signingSecret(secret = process.env.AUTH_SECRET ?? "") {
  const value = secret.trim();
  if ((!value || value === "build-time-placeholder-secret-not-for-runtime-use") && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET_REQUIRED_FOR_GOOGLE_OAUTH_CONTEXT");
  }
  return value || "build-time-placeholder-secret-not-for-runtime-use";
}

function signPayload(payload: string, secret?: string) {
  return createHmac("sha256", signingSecret(secret)).update(payload).digest("base64url");
}

export function encodeGoogleOAuthContext(context: GoogleOAuthContext, secret?: string) {
  const parsed = googleOAuthContextSchema.parse(context);
  const payload = Buffer.from(JSON.stringify(parsed), "utf8").toString("base64url");
  return `${payload}.${signPayload(payload, secret)}`;
}

export function decodeGoogleOAuthContext(value: string | undefined | null, secret?: string): GoogleOAuthContext | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const parsed = googleOAuthContextSchema.safeParse(raw);
    if (!parsed.success) return null;
    if (Date.now() - parsed.data.issuedAt > GOOGLE_OAUTH_CONTEXT_TTL_SECONDS * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function firstMembership(user: { memberships: ActiveMembership[] }) {
  return user.memberships[0] ?? null;
}

function emailFingerprint(email: string) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12);
}

function toOAuthUser(
  user: { id: string; email: string; name: string | null; avatarUrl: string | null },
  membership: ActiveMembership | null,
  rememberSession: boolean,
): GoogleOAuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.avatarUrl,
    organizationId: membership?.organizationId ?? null,
    organizationName: membership?.organization.name ?? null,
    organizationSlug: membership?.organization.slug ?? null,
    role: membership?.role ?? null,
    rememberSession,
  };
}

async function uniqueOrganizationSlug(centerName: string) {
  const base = slugify(centerName) || "centre";
  let slug = base;
  for (let i = 1; await prisma.organization.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function resolveGoogleOAuthAccount(input: {
  profile: unknown;
  context?: GoogleOAuthContext | null;
}): Promise<GoogleOAuthResolveResult> {
  const parsed = googleProfileSchema.safeParse(input.profile);
  if (!parsed.success) {
    logger.warn("auth.google.invalid_profile");
    return { ok: false, reason: "invalid_profile", redirectTo: "/login?oauth=invalid_profile" };
  }
  if (!parsed.data.email_verified) {
    logger.warn("auth.google.email_unverified", { emailFingerprint: emailFingerprint(parsed.data.email) });
    return { ok: false, reason: "email_unverified", redirectTo: "/login?oauth=email_unverified" };
  }

  const email = parsed.data.email.toLowerCase();
  const profileName = parsed.data.name?.trim() || email.split("@")[0] || "Utilisateur";
  const picture = parsed.data.picture?.trim() || null;
  const rememberSession = input.context?.remember === true;

  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: "ACTIVE", organization: { deletedAt: null } },
        include: { organization: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const activeMembership = existing ? firstMembership(existing) : null;

  if (existing && activeMembership) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        emailVerified: existing.emailVerified ?? new Date(),
        name: existing.name ?? profileName,
        avatarUrl: existing.avatarUrl ?? picture,
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
    logger.info("auth.google.existing_active", {
      userId: existing.id,
      organizationId: activeMembership.organizationId,
      role: activeMembership.role,
      intent: input.context?.intent ?? "unknown",
      emailFingerprint: emailFingerprint(email),
    });
    return { ok: true, created: false, user: toOAuthUser(updated, activeMembership, rememberSession) };
  }

  if (existing && input.context?.intent === "register_center") {
    const centerName = input.context.centerName?.trim();
    if (!centerName) {
      logger.warn("auth.google.missing_center_name", { userId: existing.id, emailFingerprint: emailFingerprint(email) });
      return { ok: false, reason: "missing_center_name", redirectTo: "/register?oauth=missing_center_name&audience=centre" };
    }

    const slug = await uniqueOrganizationSlug(centerName);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: centerName, slug, plan: "FREE", billingStatus: "trial", trialEndsAt },
      });
      const user = await tx.user.update({
        where: { id: existing.id },
        data: {
          emailVerified: existing.emailVerified ?? new Date(),
          name: existing.name ?? profileName,
          avatarUrl: existing.avatarUrl ?? picture,
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });
      const membership = await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() },
        include: { organization: { select: { name: true, slug: true } } },
      });
      return { user, membership };
    });

    logger.info("auth.google.existing_center_created", {
      userId: existing.id,
      organizationId: created.membership.organizationId,
      role: created.membership.role,
      emailFingerprint: emailFingerprint(email),
    });
    return { ok: true, created: true, user: toOAuthUser(created.user, created.membership, rememberSession) };
  }

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        emailVerified: existing.emailVerified ?? new Date(),
        name: existing.name ?? profileName,
        avatarUrl: existing.avatarUrl ?? picture,
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
    logger.warn("auth.google.existing_without_active_membership", {
      userId: existing.id,
      intent: input.context?.intent ?? "unknown",
      emailFingerprint: emailFingerprint(email),
    });
    return { ok: true, created: false, user: toOAuthUser(updated, null, rememberSession) };
  }

  if (input.context?.intent !== "register_center") {
    logger.warn("auth.google.account_required", { emailFingerprint: emailFingerprint(email), intent: input.context?.intent ?? "unknown" });
    return { ok: false, reason: "account_required", redirectTo: "/register?oauth=account_required&audience=centre" };
  }

  const centerName = input.context.centerName?.trim();
  if (!centerName) {
    logger.warn("auth.google.missing_center_name", { emailFingerprint: emailFingerprint(email) });
    return { ok: false, reason: "missing_center_name", redirectTo: "/register?oauth=missing_center_name&audience=centre" };
  }

  const slug = await uniqueOrganizationSlug(centerName);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const created = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: centerName, slug, plan: "FREE", billingStatus: "trial", trialEndsAt },
    });
    const user = await tx.user.create({
      data: {
        email,
        name: profileName,
        avatarUrl: picture,
        passwordHash: null,
        emailVerified: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
    const membership = await tx.membership.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() },
      include: { organization: { select: { name: true, slug: true } } },
    });
    return { user, membership };
  });

  logger.info("auth.google.center_signup_created", {
    userId: created.user.id,
    organizationId: created.membership.organizationId,
    role: created.membership.role,
    emailFingerprint: emailFingerprint(email),
  });
  return { ok: true, created: true, user: toOAuthUser(created.user, created.membership, rememberSession) };
}
