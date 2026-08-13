import assert from "node:assert/strict";
import {
  issueRoadmap2StructuralPreflightToken,
  roadmap2StructuralInputHash,
  verifyRoadmap2StructuralPreflightToken,
} from "../src/server/roadmap2-structural-preflight";

process.env.AUTH_SECRET = "roadmap-2-structural-preflight-smoke-secret";

const input = { title: "Offre achetable", category: "product_pedagogy", parentId: "phase-product" };
const inputHash = roadmap2StructuralInputHash(input);
const token = issueRoadmap2StructuralPreflightToken({
  workspaceId: "workspace-1",
  nodeId: "node-1",
  expectedVersion: 7,
  inputHash,
  expectedPath: "02_Produit_Pedagogie / PHASE — Produit / ACTION — Offre achetable",
  allowLinkedFolder: false,
}, 1_000_000);

const verified = verifyRoadmap2StructuralPreflightToken(token, 1_000_001);
assert.equal(verified?.workspaceId, "workspace-1");
assert.equal(verified?.nodeId, "node-1");
assert.equal(verified?.inputHash, inputHash);
assert.equal(verified?.expectedVersion, 7);
assert.equal(verifyRoadmap2StructuralPreflightToken(`${token.slice(0, -1)}x`, 1_000_001), null, "Un token altéré doit être refusé.");
assert.equal(verifyRoadmap2StructuralPreflightToken(token, 1_000_000 + 10 * 60_000 + 1), null, "Un token expiré doit être refusé.");
assert.notEqual(roadmap2StructuralInputHash({ ...input, title: "Autre titre" }), inputHash, "Toute modification du brouillon doit invalider le préflight.");

console.log(JSON.stringify({ status: "pass", suite: "roadmap_2_structural_preflight", signed: true, expires: true, bindsInput: true }));
