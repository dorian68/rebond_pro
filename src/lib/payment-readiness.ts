export function publicFormationPaymentsEnabled(): boolean {
  return process.env.PUBLIC_FORMATION_PAYMENTS_ENABLED === "true";
}

export function bilanPaymentsEnabled(): boolean {
  return process.env.BILAN_PAYMENTS_ENABLED === "true" && Boolean(process.env.ORGANISME_FORMATION_NDA?.trim());
}
