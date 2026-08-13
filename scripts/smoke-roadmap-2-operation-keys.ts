import assert from "node:assert/strict";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

async function main() {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
  const keyStore = await import("../src/lib/roadmap2-operation-key-store");

  const first = keyStore.getOrCreateRoadmap2OperationKey("le-bon-rebond", "provision-workspace");
  const afterReload = keyStore.getOrCreateRoadmap2OperationKey("le-bon-rebond", "provision-workspace");
  assert.equal(afterReload, first, "Un reload doit réutiliser la clé d’une opération ambiguë.");
  assert.match(first, /^[A-Za-z0-9_-]{16,120}$/);

  keyStore.clearRoadmap2OperationKey("le-bon-rebond", "provision-workspace");
  const afterSuccess = keyStore.getOrCreateRoadmap2OperationKey("le-bon-rebond", "provision-workspace");
  assert.notEqual(afterSuccess, first, "Un succès confirmé doit libérer la clé pour une nouvelle intention.");

  const uploadA = keyStore.roadmap2UploadOperationScope("node-1", { name: "preuve.pdf", size: 12, lastModified: 123 });
  const uploadB = keyStore.roadmap2UploadOperationScope("node-1", { name: "preuve.pdf", size: 12, lastModified: 123 });
  const uploadC = keyStore.roadmap2UploadOperationScope("node-1", { name: "preuve.pdf", size: 13, lastModified: 123 });
  assert.equal(uploadA, uploadB);
  assert.notEqual(uploadA, uploadC);
  keyStore.getOrCreateRoadmap2OperationKey("le-bon-rebond", uploadA);
  const persistedUploadKeys = [...storage.values.keys()].join("\n");
  assert.equal(persistedUploadKeys.includes("preuve.pdf"), false, "Le nom brut du fichier ne doit pas apparaître dans le nom de clé locale.");

  const permissionA = keyStore.roadmap2PermissionOperationScope(["Mathurin@example.com", "dorian@example.com"]);
  const permissionB = keyStore.roadmap2PermissionOperationScope(["dorian@example.com", "mathurin@example.com"]);
  assert.equal(permissionA, permissionB, "L’ordre et la casse des emails ne doivent pas créer une nouvelle opération.");
  assert.equal(permissionA.includes("@"), false, "La clé locale ne doit pas contenir les emails bruts.");

  const persistedValues = [...storage.values.values()].join("\n");
  assert.equal(persistedValues.includes("dorian@example.com") || persistedValues.includes("mathurin@example.com"), false);
  storage.setItem("rebondpro:roadmap2:drive-operation:v1:ancien:scope-prive", JSON.stringify({ value: crypto.randomUUID(), createdAt: 0 }));
  keyStore.getOrCreateRoadmap2OperationKey("le-bon-rebond", "archive-workspace");
  assert.equal(storage.getItem("rebondpro:roadmap2:drive-operation:v1:ancien:scope-prive"), null, "Toute entrée expirée doit être purgée, même si un autre scope est lu.");
  console.log(JSON.stringify({ status: "pass", suite: "roadmap_2_operation_keys", persistedAcrossReload: true, piiStored: false, globalExpiryPurge: true }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
