import { z } from "zod";
import { getPlatformAdmin } from "@/lib/platform";
import { resolveRoadmap2Context, roadmap2Repository } from "@/server/roadmap2";
import { Roadmap2DriveAuthRequiredError, Roadmap2DriveError, Roadmap2DriveValidationError, roadmap2DriveAutomation } from "@/server/roadmap2-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  workspaceKey: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  nodeId: z.string().trim().min(1).max(100),
  fileId: z.string().trim().min(3).max(200).regex(/^[A-Za-z0-9_-]+$/),
});

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export async function POST(request: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return Response.json({ ok: false, code: "AUTH_REQUIRED", error: "Accès administrateur requis." }, { status: 401, headers: privateHeaders });
  try {
    const input = inputSchema.parse(await request.json());
    const { workspaceId } = await resolveRoadmap2Context(input.workspaceKey);
    const [workspace, node] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, input.nodeId),
    ]);
    const preview = await roadmap2DriveAutomation.previewNodeFile({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, nodeFolderUrl: node.driveFolderUrl, fileId: input.fileId });
    return new Response(preview.bytes as BodyInit, {
      status: 200,
      headers: {
        ...privateHeaders,
        "Content-Type": preview.contentType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(preview.fileName)}`,
      },
    });
  } catch (error) {
    const validation = error instanceof z.ZodError || error instanceof Roadmap2DriveValidationError;
    const auth = error instanceof Roadmap2DriveAuthRequiredError;
    const known = error instanceof Roadmap2DriveError;
    return Response.json({ ok: false, code: auth ? "AUTH_REQUIRED" : validation ? "VALIDATION" : "UNAVAILABLE", error: validation || auth || known ? (error as Error).message : "Aperçu indisponible." }, { status: auth ? 401 : validation ? 400 : 503, headers: privateHeaders });
  }
}
