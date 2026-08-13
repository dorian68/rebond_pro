"use server";

import { revalidatePath } from "next/cache";
import { getSession, requireTenant, tenantContextFromSession, type TenantContext } from "@/lib/tenant";
import { isPlatformAdmin } from "@/lib/platform";
import { createConnectorAuthLink } from "@/server/connectors";
import { getConnector, type ConnectorKey, type ConnectorScope } from "@/lib/connectors";

export async function connectExternalConnector(key: ConnectorKey, scope: ConnectorScope = "personal", returnTo?: string): Promise<{ url?: string; error?: string }> {
  const session = await getSession();
  const tenantCtx = await tenantContextFromSession(session);
  const platformAdmin = await isPlatformAdmin();
  let ctx: TenantContext;
  if (tenantCtx) ctx = tenantCtx;
  else if (platformAdmin && session?.user?.id && scope === "personal") {
    ctx = { userId: session.user.id, email: session.user.email ?? null, name: session.user.name ?? null, organizationId: "", organizationName: null, organizationSlug: null, role: "OWNER" };
  } else {
    ctx = await requireTenant();
  }
  if (!getConnector(key)) return { error: "Connecteur inconnu." };
  try {
    const result = await createConnectorAuthLink(ctx, key, scope, returnTo);
    if (!result.url) return { error: result.error ?? "Lien de connexion Composio indisponible." };
    revalidatePath("/parametres");
    return { url: result.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Connexion impossible." };
  }
}
