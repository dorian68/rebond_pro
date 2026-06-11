import Link from "next/link";
import { Logo } from "@/components/app/Logo";

/** En-tête de navigation partagé pour les pages publiques / marketplace. */
export function PublicHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="marketing-nav public-nav">
      <Link href="/"><Logo size={52} priority /></Link>
      <nav className="marketing-nav-links">
        <Link href="/formation">Formations</Link>
        <Link href="/bilan-de-competences">Bilan de compétences</Link>
        <Link href="/marketplace#centres">Centres partenaires</Link>
        {right ?? <Link href="/login" className="btn btn-secondary btn-sm">Se connecter</Link>}
      </nav>
    </header>
  );
}
