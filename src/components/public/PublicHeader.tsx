import Link from "next/link";
import { Logo } from "@/components/app/Logo";

/** En-tête de navigation partagé pour les pages publiques / marketplace. */
export function PublicHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="marketing-nav public-nav">
      <Link href="/"><Logo size={34} /></Link>
      <nav className="marketing-nav-links">
        <Link href="/marketplace">Catalogue</Link>
        <Link href="/marketplace#centres">Centres</Link>
        {right ?? <Link href="/login" className="btn btn-secondary btn-sm">Espace pro</Link>}
      </nav>
    </header>
  );
}
