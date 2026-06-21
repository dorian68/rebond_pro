import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { isLocked, recordFailedLogin, recordSuccessfulLogin } from "@/server/login-throttle";
import { REMEMBER_SESSION_MAX_AGE_SECONDS, isSessionExpired, sessionExpiresAt } from "@/lib/auth-session-policy";

const credsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  remember: z.enum(["true", "false", "on"]).optional(),
});

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
  ],
  callbacks: {
    jwt: ({ token, user }) => {
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
      if (user) {
        const rememberSession = user.rememberSession === true;
        token.organizationId = user.organizationId ?? null;
        token.organizationName = user.organizationName ?? null;
        token.organizationSlug = user.organizationSlug ?? null;
        token.role = user.role ?? null;
        token.rememberSession = rememberSession;
        token.sessionExpiresAt = sessionExpiresAt(rememberSession);
        token.sessionExpired = false;
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
