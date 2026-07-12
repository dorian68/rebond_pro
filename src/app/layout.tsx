/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_PUBLIC_URL ?? "https://lebonrebond.optiquant-ia.com"),
  title: "Le Bon Rebond — Orientation, formation et reconversion",
  description:
    "Trouvez votre prochaine direction professionnelle grâce à un bilan de compétences ou une formation adaptée à votre projet.",
  icons: {
    icon: "/brand/logo-mark-le-bon-rebond.png",
    apple: "/brand/logo-mark-le-bon-rebond.png",
  },
  openGraph: {
    title: "Le Bon Rebond — Orientation, formation et reconversion",
    description: "Trouvez votre prochaine direction professionnelle grâce à un accompagnement ou une formation adaptée à votre projet.",
    siteName: "Le Bon Rebond",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/photos/hero-woman.jpg", alt: "Le Bon Rebond" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap"
        />
        {/* Fontes du site vitrine (bilan de compétences) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Dancing+Script:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
