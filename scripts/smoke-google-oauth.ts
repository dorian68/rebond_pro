import "./_env";
import { prisma } from "../src/lib/prisma";
import {
  decodeGoogleOAuthContext,
  encodeGoogleOAuthContext,
  isGoogleOAuthConfigured,
  resolveGoogleOAuthAccount,
  type GoogleOAuthContext,
} from "../src/server/google-oauth-core";
import { resolvePostLoginDestination, safeRelativePath } from "../src/server/auth-routing";

function step(label: string, details?: Record<string, unknown>) {
  console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) }));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function profile(email: string, overrides: Record<string, unknown> = {}) {
  return {
    email,
    email_verified: true,
    name: "Smoke Google",
    picture: "https://example.test/avatar.png",
    sub: `google-${email}`,
    ...overrides,
  };
}

async function cleanup(orgIds: string[], userIds: string[]) {
  for (const orgId of orgIds) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  for (const userId of userIds) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

async function main() {
  const orgIds: string[] = [];
  const userIds: string[] = [];
  const stamp = Date.now();
  const secret = "smoke-google-oauth-secret-32-chars";

  try {
    const ctx: GoogleOAuthContext = {
      intent: "register_center",
      centerName: "Centre OAuth Smoke",
      space: "centre",
      remember: true,
      issuedAt: Date.now(),
    };
    const encoded = encodeGoogleOAuthContext(ctx, secret);
    const decoded = decodeGoogleOAuthContext(encoded, secret);
    assert(decoded?.intent === "register_center" && decoded.centerName === ctx.centerName, "Le contexte OAuth signé ne se relit pas.");
    assert(decodeGoogleOAuthContext(`${encoded}x`, secret) === null, "Un contexte OAuth altéré doit être rejeté.");
    const expired = encodeGoogleOAuthContext({ ...ctx, issuedAt: Date.now() - 11 * 60 * 1000 }, secret);
    assert(decodeGoogleOAuthContext(expired, secret) === null, "Un contexte OAuth expiré doit être rejeté.");
    step("signed_context", { tamperRejected: true, expiredRejected: true });

    const mutableEnv = process.env as Record<string, string | undefined>;
    const oldNodeEnv = process.env.NODE_ENV;
    const oldAuthSecret = process.env.AUTH_SECRET;
    mutableEnv.NODE_ENV = "production";
    mutableEnv.AUTH_SECRET = "";
    let missingSecretRejected = false;
    try {
      encodeGoogleOAuthContext(ctx);
    } catch {
      missingSecretRejected = true;
    }
    if (oldNodeEnv === undefined) delete mutableEnv.NODE_ENV; else mutableEnv.NODE_ENV = oldNodeEnv;
    if (oldAuthSecret === undefined) delete mutableEnv.AUTH_SECRET; else mutableEnv.AUTH_SECRET = oldAuthSecret;
    assert(missingSecretRejected, "Le contexte OAuth ne doit pas être signé avec un secret placeholder en production.");
    step("production_secret_required");

    const oldId = process.env.AUTH_GOOGLE_ID;
    const oldSecret = process.env.AUTH_GOOGLE_SECRET;
    process.env.AUTH_GOOGLE_ID = "test-client-id";
    process.env.AUTH_GOOGLE_SECRET = "test-client-secret";
    assert(isGoogleOAuthConfigured(), "Les credentials Google valides doivent activer le provider.");
    if (oldId === undefined) delete process.env.AUTH_GOOGLE_ID; else process.env.AUTH_GOOGLE_ID = oldId;
    if (oldSecret === undefined) delete process.env.AUTH_GOOGLE_SECRET; else process.env.AUTH_GOOGLE_SECRET = oldSecret;
    step("provider_env_detection");

    const org = await prisma.organization.create({
      data: { name: "Smoke Existing OAuth", slug: `smoke-google-existing-${stamp}`, plan: "FREE" },
    });
    orgIds.push(org.id);
    const existing = await prisma.user.create({
      data: {
        email: `smoke-google-existing-${stamp}@example.test`,
        name: null,
        emailVerified: null,
        failedLoginCount: 3,
        lockedUntil: new Date(Date.now() + 60_000),
      },
    });
    userIds.push(existing.id);
    await prisma.membership.create({
      data: { userId: existing.id, organizationId: org.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() },
    });

    const existingResult = await resolveGoogleOAuthAccount({
      profile: profile(existing.email),
      context: { intent: "login", space: "centre", remember: true, issuedAt: Date.now() },
    });
    assert(existingResult.ok && !existingResult.created, "Google doit connecter un compte local existant sans le recréer.");
    assert(existingResult.ok && existingResult.user.organizationId === org.id && existingResult.user.role === "OWNER", "Le tenant existant doit être conservé.");
    const refreshed = await prisma.user.findUnique({ where: { id: existing.id } });
    assert(refreshed?.emailVerified && refreshed.failedLoginCount === 0 && refreshed.lockedUntil === null, "Le succès Google doit vérifier l'email et réinitialiser le verrou.");
    const accidentalRegister = await resolveGoogleOAuthAccount({
      profile: profile(existing.email),
      context: { intent: "register_center", centerName: `Centre Should Not Exist ${stamp}`, space: "centre", issuedAt: Date.now() },
    });
    assert(accidentalRegister.ok && !accidentalRegister.created, "Un compte déjà actif ne doit pas recréer un centre via le bouton inscription Google.");
    assert(accidentalRegister.ok && accidentalRegister.user.organizationId === org.id, "Le compte déjà actif doit rester rattaché à son centre existant.");
    const accidentalActiveOwnerMemberships = await prisma.membership.count({ where: { userId: existing.id, status: "ACTIVE", role: "OWNER" } });
    assert(accidentalActiveOwnerMemberships === 1, "Un compte actif ne doit pas recevoir un deuxième membership OWNER/ACTIVE.");
    const accidentalOrgCreated = await prisma.organization.findFirst({ where: { name: `Centre Should Not Exist ${stamp}` } });
    assert(!accidentalOrgCreated, "Aucune organisation ne doit être créée pour un compte déjà actif.");
    step("existing_account_login", { tenantPreserved: true, lockReset: true, duplicateCenterPrevented: true });

    const orphan = await prisma.user.create({
      data: {
        email: `smoke-google-orphan-${stamp}@example.test`,
        name: null,
        emailVerified: null,
      },
    });
    userIds.push(orphan.id);
    const orphanLogin = await resolveGoogleOAuthAccount({
      profile: profile(orphan.email),
      context: { intent: "login", space: "centre", issuedAt: Date.now() },
    });
    assert(orphanLogin.ok && !orphanLogin.created, "Un utilisateur existant sans espace ne doit pas être recréé en login Google.");
    assert(orphanLogin.ok && orphanLogin.user.organizationId === null && orphanLogin.user.role === null, "Le login Google sans espace actif doit rester sans tenant.");
    const orphanDestination = await resolvePostLoginDestination({ userId: orphan.id, requestedSpace: "centre" });
    assert(orphanDestination === "/login?oauth=no_membership", "Un compte sans espace actif doit être redirigé vers l'erreur no_membership.");
    step("existing_without_active_membership_login_blocked");

    const invitedOrg = await prisma.organization.create({
      data: { name: "Smoke Invited OAuth", slug: `smoke-google-invited-${stamp}`, plan: "FREE" },
    });
    orgIds.push(invitedOrg.id);
    const invitedOnly = await prisma.user.create({
      data: {
        email: `smoke-google-invited-${stamp}@example.test`,
        name: null,
        emailVerified: null,
      },
    });
    userIds.push(invitedOnly.id);
    await prisma.membership.create({
      data: { userId: invitedOnly.id, organizationId: invitedOrg.id, role: "LEARNER", status: "INVITED", invitedAt: new Date(), invitedEmail: invitedOnly.email },
    });
    const invitedSignup = await resolveGoogleOAuthAccount({
      profile: profile(invitedOnly.email),
      context: { intent: "register_center", centerName: `Centre Existing Google ${stamp}`, space: "centre", issuedAt: Date.now() },
    });
    assert(invitedSignup.ok && invitedSignup.created, "Un compte Google existant sans espace actif doit pouvoir créer un centre.");
    assert(invitedSignup.ok && invitedSignup.user.id === invitedOnly.id, "L'inscription Google doit réutiliser l'utilisateur existant au lieu de créer un doublon.");
    assert(invitedSignup.ok && invitedSignup.user.organizationId && invitedSignup.user.organizationId !== invitedOrg.id, "Un nouveau centre actif doit être rattaché.");
    const invitedActiveMembership = await prisma.membership.findFirst({
      where: { userId: invitedOnly.id, status: "ACTIVE", role: "OWNER" },
      include: { organization: true },
    });
    assert(invitedActiveMembership?.organization, "Le nouveau membership OWNER/ACTIVE est introuvable.");
    orgIds.push(invitedActiveMembership.organization.id);
    const invitedReplay = await resolveGoogleOAuthAccount({
      profile: profile(invitedOnly.email),
      context: { intent: "register_center", centerName: `Centre Invited Replay ${stamp}`, space: "centre", issuedAt: Date.now() },
    });
    assert(invitedReplay.ok && !invitedReplay.created, "Le rejeu du callback Google pour un invité ne doit pas recréer un centre.");
    const invitedActiveOwnerMemberships = await prisma.membership.count({ where: { userId: invitedOnly.id, status: "ACTIVE", role: "OWNER" } });
    assert(invitedActiveOwnerMemberships === 1, "Le parcours invité Google doit rester idempotent côté membership OWNER/ACTIVE.");
    const invitedDestination = await resolvePostLoginDestination({ userId: invitedOnly.id, requestedSpace: "centre" });
    assert(invitedDestination === "/onboarding", "Après inscription centre Google, la redirection doit mener à l'onboarding.");
    step("existing_invited_center_signup_created", { existingUserReused: true, activeOwnerMembership: true, replaySafe: true });

    const unknownEmail = `smoke-google-unknown-${stamp}@example.test`;
    const denied = await resolveGoogleOAuthAccount({
      profile: profile(unknownEmail),
      context: { intent: "login", space: "centre", issuedAt: Date.now() },
    });
    assert(!denied.ok && denied.reason === "account_required", "Un login Google inconnu ne doit pas créer de centre.");
    assert(!(await prisma.user.findUnique({ where: { email: unknownEmail } })), "Aucun utilisateur ne doit être créé sans intention d'inscription.");
    step("unknown_login_denied", { noSilentSignup: true });

    const unverified = await resolveGoogleOAuthAccount({
      profile: profile(`smoke-google-unverified-${stamp}@example.test`, { email_verified: false }),
      context: { intent: "register_center", centerName: "Centre Refus", issuedAt: Date.now() },
    });
    assert(!unverified.ok && unverified.reason === "email_unverified", "Un email Google non vérifié doit être refusé.");
    step("unverified_email_denied");

    const createdEmail = `smoke-google-created-${stamp}@example.test`;
    const created = await resolveGoogleOAuthAccount({
      profile: profile(createdEmail),
      context: { intent: "register_center", centerName: `Centre Google ${stamp}`, space: "centre", issuedAt: Date.now() },
    });
    assert(created.ok && created.created, "L'inscription centre Google doit créer un compte.");
    const user = await prisma.user.findUnique({
      where: { email: createdEmail },
      include: { memberships: { include: { organization: true } } },
    });
    assert(user, "L'utilisateur Google créé est introuvable.");
    userIds.push(user.id);
    const membership = user.memberships[0];
    assert(membership?.organization, "L'organisation centre n'a pas été créée.");
    orgIds.push(membership.organization.id);
    assert(user.emailVerified && user.passwordHash === null, "Un compte Google doit être vérifié sans mot de passe local.");
    assert(membership.role === "OWNER" && membership.organization.billingStatus === "trial" && membership.organization.trialEndsAt, "Le trial centre OWNER doit être initialisé.");
    const createdDestination = await resolvePostLoginDestination({ userId: user.id, requestedSpace: "centre" });
    assert(createdDestination === "/onboarding", "Après création d'un compte centre Google, la redirection doit mener à l'onboarding.");
    const replay = await resolveGoogleOAuthAccount({
      profile: profile(createdEmail),
      context: { intent: "register_center", centerName: `Centre Google Replay ${stamp}`, space: "centre", issuedAt: Date.now() },
    });
    assert(replay.ok && !replay.created, "Un second passage callback/jwt ne doit pas recréer un centre pour le même compte actif.");
    const activeOwnerMemberships = await prisma.membership.count({ where: { userId: user.id, status: "ACTIVE", role: "OWNER" } });
    assert(activeOwnerMemberships === 1, "Le parcours Google doit rester idempotent côté membership OWNER/ACTIVE.");
    step("center_signup_created", { ownerMembership: true, trialActivated: true });

    assert(safeRelativePath("/dashboard") === "/dashboard", "Un next relatif valide doit être accepté.");
    assert(safeRelativePath("//evil.test/dashboard") === null, "Un next protocole-relatif doit être rejeté.");
    assert(safeRelativePath("/dashboard\r\nSet-Cookie:bad=1") === null, "Un next contenant un saut de ligne doit être rejeté.");
    assert(safeRelativePath("/admin\\evil") === null, "Un next contenant un antislash doit être rejeté.");
    step("safe_redirects");
  } finally {
    await cleanup(orgIds, userIds);
  }
}

main()
  .then(() => step("google_oauth_complete"))
  .catch((error) => {
    console.error(JSON.stringify({ step: "google_oauth", status: "fail", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
