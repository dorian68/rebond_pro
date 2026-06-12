import Link from "next/link";
import Image from "next/image";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "#091a29", color: "rgba(255,255,255,.7)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Corps du footer */}
      <div className="container" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr",
            gap: 48,
            paddingBottom: 48,
            borderBottom: "1px solid rgba(255,255,255,.10)",
          }}
          className="footer-grid"
        >
          {/* Marque */}
          <div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "inline-block", background: "#fff", borderRadius: 10, padding: "6px 10px" }}>
                <Image
                  src="/brand/logo-le-bon-rebond.png"
                  alt="Le Bon Rebond"
                  width={140}
                  height={44}
                  style={{ height: 44, width: "auto", display: "block", objectFit: "contain" }}
                />
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,.6)", maxWidth: "30ch", fontSize: ".98rem", lineHeight: 1.65 }}>
              La plateforme qui transforme les périodes de doute en trajectoires professionnelles claires.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h5 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#fff", fontSize: ".82rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 20px" }}>
              Navigation
            </h5>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                { label: "Accueil", to: "/" },
                { label: "Formations", to: "/formation" },
                { label: "Bilan de compétences", to: "/bilan-de-competences" },
                { label: "Bilan d'orientation", to: "/bilan-orientation" },
                { label: "À propos", to: "/a-propos" },
                { label: "Contact", to: "/contact" },
              ].map((link) => (
                <li key={link.to}>
                  <Link href={link.to} style={{ color: "rgba(255,255,255,.7)", fontSize: ".98rem", textDecoration: "none" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Partenaires formation */}
          <div>
            <h5 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#fff", fontSize: ".82rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 20px" }}>
              Centres partenaires
            </h5>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                { label: "Catalogue des formations", to: "/marketplace" },
                { label: "Rejoindre le réseau", to: "/centres" },
                { label: "Créer mon espace partenaire", to: "/register#centre" },
                { label: "Espace centre", to: "/login#centre" },
              ].map((link) => (
                <li key={link.to}>
                  <Link href={link.to} style={{ color: "rgba(255,255,255,.7)", fontSize: ".98rem", textDecoration: "none" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Finançable CPF", "Qualiopi"].map((tag) => (
                <span
                  key={tag}
                  style={{ fontSize: ".78rem", fontWeight: 700, background: "rgba(95,177,78,.18)", color: "#a8e09b", padding: "6px 12px", borderRadius: 100 }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h5 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#fff", fontSize: ".82rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 20px" }}>
              Contact
            </h5>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Adresse", value: "Pointe-à-Pitre, Guadeloupe (971)" },
                { label: "Téléphone", value: process.env.NEXT_PUBLIC_PHONE ?? "06 90 XX XX XX" },
                { label: "Email", value: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@lebonrebond.fr" },
                { label: "Horaires", value: "Lun – Ven · 8h – 18h" },
              ].map((item) => (
                <div key={item.label}>
                  <strong style={{ display: "block", fontSize: ".8rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#5FB14E", marginBottom: 3, fontWeight: 700 }}>
                    {item.label}
                  </strong>
                  <span style={{ fontSize: ".98rem", color: "rgba(255,255,255,.78)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 30,
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", color: "rgba(255,255,255,.75)", fontSize: "1.05rem" }}>
            Un nouveau départ, la bonne direction.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: ".85rem", color: "rgba(255,255,255,.45)" }}>
              © {year} Le Bon Rebond
            </span>
            <Link href="/legal/cgu" style={{ fontSize: ".85rem", color: "rgba(255,255,255,.45)", textDecoration: "none" }}>CGU</Link>
            <Link href="/legal/confidentialite" style={{ fontSize: ".85rem", color: "rgba(255,255,255,.45)", textDecoration: "none" }}>Confidentialité</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
        }
        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
