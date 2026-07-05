import "./_env";
import { prisma } from "../src/lib/prisma";

async function main() {
  const centers = await prisma.organization.findMany({
    where: { slug: { startsWith: "carif-" } },
    select: { id: true, name: true, slug: true, marketplaceStatus: true, publicProfileEnabled: true, deletedAt: true },
  });
  console.log("Total CARIF centers found:", centers.length);
  for (const c of centers) {
    console.log(JSON.stringify(c));
  }

  const total = await prisma.organization.count();
  console.log("Total organizations in DB:", total);

  const approved = await prisma.organization.count({ where: { marketplaceStatus: "APPROVED" } });
  console.log("Total APPROVED organizations:", approved);
}

main()
  .catch((e) => console.error("ERROR:", e))
  .finally(() => prisma.$disconnect());
