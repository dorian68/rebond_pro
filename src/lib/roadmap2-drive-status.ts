export const ROADMAP2_DRIVE_CONNECTION_STATUSES = [
  "DISABLED",
  "NOT_CONNECTED",
  "INITIALIZING",
  "INITIATED",
  "ACTIVE",
  "FAILED",
  "EXPIRED",
  "INACTIVE",
  "REVOKED",
  "UNKNOWN",
] as const;

export type Roadmap2DriveConnectionStatus = (typeof ROADMAP2_DRIVE_CONNECTION_STATUSES)[number];

export type Roadmap2DriveAccountIdentity = {
  displayName: string | null;
  emailAddress: string | null;
  alias: string | null;
  verified: boolean;
};

const PENDING = new Set<Roadmap2DriveConnectionStatus>(["INITIALIZING", "INITIATED"]);
const RECONNECT = new Set<Roadmap2DriveConnectionStatus>(["FAILED", "EXPIRED", "INACTIVE", "REVOKED"]);

export function isRoadmap2DrivePending(status: Roadmap2DriveConnectionStatus | undefined) {
  return status ? PENDING.has(status) : false;
}

export function roadmap2DriveNeedsReconnect(status: Roadmap2DriveConnectionStatus | undefined) {
  return status ? RECONNECT.has(status) : false;
}

export function roadmap2DriveAccountLabel(account: Roadmap2DriveAccountIdentity | null | undefined) {
  if (!account) return null;
  if (account.displayName && account.emailAddress) return `${account.displayName} · ${account.emailAddress}`;
  return account.emailAddress ?? account.displayName ?? account.alias;
}

export function roadmap2DriveStatusLabel(status: Roadmap2DriveConnectionStatus | undefined) {
  switch (status) {
    case "ACTIVE": return "Connecté";
    case "INITIALIZING":
    case "INITIATED": return "Connexion en cours";
    case "FAILED": return "Connexion échouée";
    case "EXPIRED": return "Autorisation expirée";
    case "INACTIVE": return "Connexion inactive";
    case "REVOKED": return "Autorisation révoquée";
    case "DISABLED": return "Indisponible";
    case "UNKNOWN": return "État à vérifier";
    default: return "À connecter";
  }
}
