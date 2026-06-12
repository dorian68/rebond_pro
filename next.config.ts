import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer doit rester externe au bundle serveur (APIs Node).
  serverExternalPackages: ["@react-pdf/renderer"],
  // Sortie autonome pour une image Docker légère (cf. déploiement VPS/Hetzner).
  output: "standalone",
  // Alias FR hérités des maquettes vitrine → routes auth réelles.
  async redirects() {
    return [
      { source: "/connexion", destination: "/login", permanent: true },
      { source: "/inscription", destination: "/register", permanent: true },
    ];
  },
};

export default nextConfig;
