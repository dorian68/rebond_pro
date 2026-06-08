import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { isLocked, recordFailedLogin, recordSuccessfulLogin } from "@/server/login-throttle";

const credsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

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
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.organizationId = user.organizationId ?? null;
        token.organizationName = user.organizationName ?? null;
        token.organizationSlug = user.organizationSlug ?? null;
        token.role = user.role ?? null;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.organizationName = (token.organizationName as string | null) ?? null;
        session.user.organizationSlug = (token.organizationSlug as string | null) ?? null;
        session.user.role = (token.role as string | null) ?? null;
      }
      return session;
    },
  },
});
