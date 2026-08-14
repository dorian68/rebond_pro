import { createHash } from "node:crypto";

const entityId = process.argv.find((argument) => argument.startsWith("--entity="))?.slice("--entity=".length).trim();
if (!entityId) throw new Error("Utilisez --entity=<identifiant Roadmap 2>.");
if (!process.env.COMPOSIO_API_KEY) throw new Error("COMPOSIO_API_KEY absent.");

const hash = (value) => createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, 10);
const url = new URL("https://backend.composio.dev/api/v3/connected_accounts");
url.searchParams.set("user_ids", entityId);
url.searchParams.set("toolkit_slugs", "googledrive");
url.searchParams.set("limit", "100");

const response = await fetch(url, { headers: { "x-api-key": process.env.COMPOSIO_API_KEY }, signal: AbortSignal.timeout(15_000) });
const payload = await response.json();
if (!response.ok) throw new Error(`Composio a répondu HTTP ${response.status}.`);

const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
const maskEmail = (value) => {
  if (typeof value !== "string" || !value.includes("@")) return null;
  const [local, domain] = value.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
};
const identities = [];
for (const item of items.filter((candidate) => candidate?.status === "ACTIVE" && candidate?.id)) {
  const aboutResponse = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/GOOGLEDRIVE_GET_ABOUT", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.COMPOSIO_API_KEY },
    body: JSON.stringify({ user_id: entityId, connected_account_id: item.id, version: process.env.COMPOSIO_TOOLKIT_VERSION_GOOGLEDRIVE || "20260811_00", arguments: { fields: "user(displayName,emailAddress)" } }),
    signal: AbortSignal.timeout(15_000),
  });
  const about = await aboutResponse.json();
  let data = about?.data;
  for (let depth = 0; depth < 3 && data?.data && typeof data.data === "object"; depth += 1) data = data.data;
  identities.push({
    idHash: hash(item.id),
    http: aboutResponse.status,
    successful: about?.successful === true,
    email: maskEmail(data?.user?.emailAddress),
    identityConfirmed: Boolean(data?.user?.emailAddress),
  });
}
console.log(JSON.stringify({
  step: "roadmap2_composio_accounts",
  status: "pass",
  entityHash: hash(entityId),
  count: items.length,
  accounts: items.map((item) => ({
    idHash: hash(item?.id),
    status: item?.status ?? null,
    toolkit: item?.toolkit?.slug ?? item?.toolkit_slug ?? null,
    createdAt: item?.created_at ?? item?.createdAt ?? null,
    updatedAt: item?.updated_at ?? item?.updatedAt ?? null,
    aliasPresent: Boolean(item?.alias),
    authConfigHash: hash(item?.auth_config?.id ?? item?.auth_config_id),
  })),
  identities,
}));
