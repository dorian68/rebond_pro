import "./_env";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { GET } from "../src/app/verify-email/route";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const email = `smoke-auth-${Date.now()}@example.test`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "Smoke Auth",
      passwordHash: "not-used-by-this-smoke",
      emailVerificationTokens: {
        create: { tokenHash, expiresAt: new Date(Date.now() + 3600000) },
      },
    },
  });

  try {
    const response = await GET(new Request(`http://localhost:3000/verify-email?token=${token}`));
    assert(response.status === 307, "La vérification doit rediriger.");
    assert(response.headers.get("location")?.includes("/email-confirmed"), "La redirection de succès est incorrecte.");
    const verified = await prisma.user.findUnique({ where: { id: user.id }, include: { emailVerificationTokens: true } });
    assert(verified?.emailVerified, "L'email n'a pas été marqué vérifié.");
    assert(verified.emailVerificationTokens.length === 0, "Le jeton utilisé n'a pas été supprimé.");
    console.log(JSON.stringify({ step: "email_verification", status: "pass", tokenStoredAsHash: true, tokenConsumed: true }));
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ step: "email_verification", status: "fail", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
