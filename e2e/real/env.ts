import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name} for real E2E tests.`);
  }
  return value;
}

export function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export function realBaseUrl(): string {
  return process.env.E2E_BASE_URL ?? 'https://lebonrebond.fr';
}

export function appUrl(pathname: string): string {
  return new URL(pathname, realBaseUrl()).toString();
}

export function e2eEmail(localTag: string): string {
  const base = requiredEnv('E2E_EMAIL_BASE');
  const at = base.lastIndexOf('@');
  if (at <= 0 || at === base.length - 1) {
    throw new Error('E2E_EMAIL_BASE must be a valid email address.');
  }
  return `${base.slice(0, at)}+${localTag}@${base.slice(at + 1)}`;
}

export function seededRoleEmail(slug: string): string {
  return e2eEmail(`e2e-${slug}`);
}

export function account(emailEnv: string, passwordEnv: string): { email: string; password: string } {
  return {
    email: requiredEnv(emailEnv),
    password: requiredEnv(passwordEnv),
  };
}
