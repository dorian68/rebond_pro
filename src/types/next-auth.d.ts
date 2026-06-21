import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    organizationId?: string | null;
    organizationName?: string | null;
    organizationSlug?: string | null;
    role?: Role | string | null;
    rememberSession?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      organizationId: string | null;
      organizationName: string | null;
      organizationSlug: string | null;
      role: string | null;
      rememberSession?: boolean;
      sessionExpiresAt?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string | null;
    organizationName?: string | null;
    organizationSlug?: string | null;
    role?: string | null;
    rememberSession?: boolean;
    sessionExpiresAt?: number;
    sessionExpired?: boolean;
  }
}
