import { redirect } from "next/navigation";

/** Ancien hub de connexion — supplanté par le double espace intégré à /login
 *  (design validé : sélecteur « Espace client / Espace centre » sur la page de connexion). */
export default function EspaceClientPage() {
  redirect("/login");
}
