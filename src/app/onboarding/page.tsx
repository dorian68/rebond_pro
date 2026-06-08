import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Logo } from "@/components/app/Logo";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") redirect("/dashboard");
  const organization = await prisma.organization.findUnique({ where: { id: ctx.organizationId } });
  if (!organization) redirect("/login");

  return (
    <main>
      <div className="onboarding-logo"><Logo size={36} /></div>
      <OnboardingClient
        organizationName={organization.name}
        defaults={{
          website: organization.website ?? "",
          nbFormationsDeclarees: organization.nbFormationsDeclarees ?? 0,
          nbFormateursDeclares: organization.nbFormateursDeclares ?? 0,
          nbSessionsMois: organization.nbSessionsMois ?? 0,
          objectifPrincipal: organization.objectifPrincipal ?? "CENTRALISER",
        }}
      />
    </main>
  );
}
