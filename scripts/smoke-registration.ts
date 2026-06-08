import "./_env";
import { prisma } from "../src/lib/prisma";
import { createRegistration } from "../src/server/registration";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const stamp = Date.now();
  const email = `smoke-register-${stamp}@example.test`;
  await createRegistration({
    name: "Smoke Registration",
    centerName: `Centre Smoke ${stamp}`,
    email,
    password: "smoke-password-123",
  });

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      emailVerificationTokens: true,
      memberships: { include: { organization: true } },
    },
  });
  assert(user, "L'utilisateur n'a pas été créé.");
  assert(!user.emailVerified, "L'email ne doit pas être marqué vérifié avant confirmation.");
  assert(user.emailVerificationTokens.length === 1, "Un jeton de vérification doit être créé.");
  assert(user.emailVerificationTokens[0].tokenHash.length === 64, "Le jeton doit être stocké sous forme de hash SHA-256.");
  const organization = user.memberships[0]?.organization;
  assert(organization?.billingStatus === "trial" && organization.trialEndsAt, "Le trial n'a pas été activé.");
  console.log(JSON.stringify({ step: "registration", status: "pass", organizationCreated: true, trialActivated: true, verificationRequired: true }));

  await prisma.$transaction([
    prisma.membership.deleteMany({ where: { userId: user.id } }),
    prisma.organization.delete({ where: { id: organization.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ step: "registration", status: "fail", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
