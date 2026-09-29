export const SAINTE_LUCIE_PATH = "/opportunites/service-civique-sainte-lucie";
export const SAINTE_LUCIE_DEADLINE = new Date("2026-10-11T21:59:59Z");

export function isSainteLucieOpen(now = new Date()): boolean {
  return now <= SAINTE_LUCIE_DEADLINE;
}
