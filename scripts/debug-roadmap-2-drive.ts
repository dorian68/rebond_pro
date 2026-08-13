import "./_env";

import { prisma } from "../src/lib/prisma";
import { roadmap2DriveAutomation } from "../src/server/roadmap2-drive";

function maskEmail(value: string | null | undefined) {
  if (!value) return null;
  const [local, domain] = value.split("@");
  if (!local || !domain) return "présente";
  return `${local.slice(0, 1)}***@${domain}`;
}

async function main() {
  const requestedKey = process.argv.find((arg) => arg.startsWith("--workspace="))?.slice("--workspace=".length).trim();
  const workspaces = await prisma.roadmap2Workspace.findMany({
    where: requestedKey ? { key: requestedKey } : undefined,
    select: { id: true, key: true, rootDriveUrl: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(JSON.stringify({ step: "roadmap2_drive_environment", status: "pass", workspaces: workspaces.length, providerConfigured: Boolean(process.env.COMPOSIO_API_KEY) }));
  if (requestedKey && workspaces.length === 0) throw new Error(`Workspace Roadmap 2 introuvable : ${requestedKey}`);

  for (const workspace of workspaces) {
    const status = await roadmap2DriveAutomation.status(workspace.id);
    console.log(JSON.stringify({
      step: "roadmap2_drive_status",
      status: "pass",
      workspace: workspace.key,
      providerStatus: status.status,
      connected: status.connected,
      rootConfigured: Boolean(workspace.rootDriveUrl),
      identityConfirmed: Boolean(status.account?.verified),
      accountEmail: maskEmail(status.account?.emailAddress),
      accountName: status.account?.displayName ?? status.account?.alias ?? null,
    }));
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ step: "roadmap2_drive_debug", status: "fail", error: error instanceof Error ? error.message : "Erreur inconnue" }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
