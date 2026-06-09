export type NavItem = { id: string; label: string; href: string; icon: string; badgeKey?: "prospects" | "documents" };

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { id: "formations", label: "Formations", href: "/formations", icon: "book" },
  { id: "sessions", label: "Sessions", href: "/sessions", icon: "calendar" },
  { id: "planning", label: "Planning", href: "/planning", icon: "calendar-range" },
  { id: "prospects", label: "Prospects", href: "/prospects", icon: "target", badgeKey: "prospects" },
  { id: "apprenants", label: "Apprenants", href: "/apprenants", icon: "grad" },
  { id: "beneficiaires", label: "Bénéficiaires", href: "/beneficiaires", icon: "smile" },
  { id: "documents", label: "Documents", href: "/documents", icon: "file-text", badgeKey: "documents" },
  { id: "qualite", label: "Qualité", href: "/qualite", icon: "shield" },
  { id: "formateurs", label: "Formateurs", href: "/formateurs", icon: "presentation" },
  { id: "assistant", label: "Assistant IA", href: "/assistant", icon: "sparkles" },
];

export const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  formations: "Formations",
  sessions: "Sessions",
  planning: "Planning",
  prospects: "Prospects",
  apprenants: "Apprenants",
  beneficiaires: "Bénéficiaires",
  documents: "Documents",
  qualite: "Qualité",
  formateurs: "Formateurs",
  assistant: "Assistant IA",
  parametres: "Paramètres",
};
