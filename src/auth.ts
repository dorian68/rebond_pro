import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { isLocked, recordFailedLogin, recordSuccessfulLogin } from "@/server/login-throttle";
import { REMEMBER_SESSION_MAX_AGE_SECONDS, isSessionExpired, sessionExpiresAt } from "@/lib/auth-session-policy";
import {
  getGoogleOAuthCredentials,
  resolveGoogleOAuthAccount,
  type GoogleOAuthUser,
} from "@/server/google-oauth-core";
import { clearGoogleOAuthContext, readGoogleOAuthContext } from "@/server/google-oauth-context";

const credsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  remember: z.enum(["true", "false", "on"]).optional(),
});

const googleCredentials = getGoogleOAuthCredentials();

function applyAuthUser(user: Record<string, unknown>, resolved: GoogleOAuthUser) {
  user.id = resolved.id;
  user.email = resolved.email;
  user.name = resolved.name ?? undefined;
  user.image = resolved.image ?? undefined;
  user.organizationId = resolved.organizationId;
  user.organizationName = resolved.organizationName;
  user.organizationSlug = resolved.organizationSlug;
  user.role = resolved.role;
  user.rememberSession = resolved.rememberSession;
}

function applyTokenUser(token: Record<string, unknown>, resolved: GoogleOAuthUser) {
  token.sub = resolved.id;
  token.email = resolved.email;
  token.name = resolved.name;
  token.picture = resolved.image ?? null;
  token.organizationId = resolved.organizationId;
  token.organizationName = resolved.organizationName;
  token.organizationSlug = resolved.organizationSlug;
  token.role = resolved.role;
  token.rememberSession = resolved.rememberSession;
  token.sessionExpiresAt = sessionExpiresAt(resolved.rememberSession);
  token.sessionExpired = false;
}

async function hydrateTokenFromEmail(token: Record<string, unknown>) {
  const email = typeof token.email === "string" ? token.email.toLowerCase() : "";
  if (!email) return false;
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: "ACTIVE", organization: { deletedAt: null } },
        include: { organization: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const membership = user?.memberships[0];
  if (!user || !membership) return false;
  applyTokenUser(token, {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.avatarUrl,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    role: membership.role,
    rememberSession: token.rememberSession === true,
  });
  return true;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: REMEMBER_SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const rememberSession = parsed.data.remember === "true" || parsed.data.remember === "on";

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: { organization: { select: { id: true, name: true, slug: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        });
        if (!user?.passwordHash || !user.emailVerified) return null;

        // Anti-bruteforce : compte verrouillé après trop d'échecs.
        if (isLocked(user)) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          await recordFailedLogin(user.id);
          return null;
        }

        const membership = user.memberships[0];
        await recordSuccessfulLogin(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          organizationId: membership?.organizationId ?? null,
          organizationName: membership?.organization.name ?? null,
          organizationSlug: membership?.organization.slug ?? null,
          role: membership?.role ?? null,
          rememberSession,
        };
      },
    }),
    ...(googleCredentials ? [Google({ clientId: googleCredentials.clientId, clientSecret: googleCredentials.clientSecret })] : []),
  ],
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google") return true;
      const context = await readGoogleOAuthContext();
      const resolved = await resolveGoogleOAuthAccount({ profile, context });
      if (!resolved.ok) {
        await clearGoogleOAuthContext();
        return resolved.redirectTo;
      }
      applyAuthUser(user as Record<string, unknown>, resolved.user);
      return true;
    },
    jwt: async ({ token, user, account, profile }) => {
      if (!user && isSessionExpired(token.sessionExpiresAt)) {
        return {
          ...token,
          sub: undefined,
          organizationId: null,
          organizationName: null,
          organizationSlug: null,
          role: null,
          sessionExpired: true,
        };
      }
      if (account?.provider === "google") {
        const context = await readGoogleOAuthContext();
        const resolved = await resolveGoogleOAuthAccount({
          profile: profile ?? { email: user?.email ?? token.email, email_verified: true, name: user?.name ?? token.name, picture: user?.image ?? token.picture },
          context,
        });
        await clearGoogleOAuthContext();
        if (resolved.ok) {
          if (user) applyAuthUser(user as Record<string, unknown>, resolved.user);
          applyTokenUser(token as Record<string, unknown>, resolved.user);
          return token;
        }
      }
      if (user) {
        const rememberSession = user.rememberSession === true;
        token.sub = user.id;
        token.email = user.email ?? null;
        token.name = user.name ?? null;
        token.picture = user.image ?? null;
        token.organizationId = user.organizationId ?? null;
        token.organizationName = user.organizationName ?? null;
        token.organizationSlug = user.organizationSlug ?? null;
        token.role = user.role ?? null;
        token.rememberSession = rememberSession;
        token.sessionExpiresAt = sessionExpiresAt(rememberSession);
        token.sessionExpired = false;
      }
      if ((!token.organizationId || !token.role) && typeof token.email === "string") {
        await hydrateTokenFromEmail(token as Record<string, unknown>);
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        const expired = isSessionExpired(token.sessionExpiresAt) || token.sessionExpired === true;
        session.user.id = expired ? "" : (token.sub as string);
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.organizationName = (token.organizationName as string | null) ?? null;
        session.user.organizationSlug = (token.organizationSlug as string | null) ?? null;
        session.user.role = (token.role as string | null) ?? null;
        session.user.rememberSession = token.rememberSession === true;
        session.user.sessionExpiresAt = typeof token.sessionExpiresAt === "number" ? new Date(token.sessionExpiresAt * 1000).toISOString() : null;
      }
      return session;
    },
  },
});
