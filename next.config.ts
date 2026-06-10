import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer doit rester externe au bundle serveur (APIs Node).
  serverExternalPackages: ["@react-pdf/renderer"],
  // Sortie autonome pour une image Docker légère (cf. déploiement VPS/Hetzner).
  output: "standalone",
};

export default nextConfig;
