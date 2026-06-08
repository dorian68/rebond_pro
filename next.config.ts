import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer doit rester externe au bundle serveur (APIs Node).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
