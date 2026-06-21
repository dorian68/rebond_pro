"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";
import { createConnectorAuthLink } from "@/server/connectors";
import { getConnector, type ConnectorKey, type ConnectorScope } from "@/lib/connectors";

export async function connectExternalConnector(key: ConnectorKey, scope: ConnectorScope = "personal", returnTo?: string): Promise<{ url?: string; error?: string }> {
  const ctx = await requireTenant();
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
