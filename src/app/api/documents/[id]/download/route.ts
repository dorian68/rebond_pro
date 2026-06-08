import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  const doc = await prisma.document.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { fileUrl: true, type: true } });
  if (!doc?.fileUrl) return new Response("Not found", { status: 404 });

  const buf = await readFile(doc.fileUrl);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.type.toLowerCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
