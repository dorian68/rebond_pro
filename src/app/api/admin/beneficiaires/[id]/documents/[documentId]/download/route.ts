import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

function contentDispositionFileName(value: string) {
  return value.replace(/["\r\n]/g, "-");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  await requirePlatformAdmin();
  const { id, documentId } = await params;
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      type: "DOSSIER_NUMERIQUE_EXPORTABLE",
      manualOverrides: { path: ["beneficiaryId"], equals: id },
    },
    select: { fileUrl: true, type: true, fileName: true, mimeType: true },
  });
  if (!doc?.fileUrl) return new Response("Not found", { status: 404 });

  const buf = await readFile(doc.fileUrl);
  const fileName = contentDispositionFileName(doc.fileName ?? `${doc.type.toLowerCase()}.pdf`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimeType ?? "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
