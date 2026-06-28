import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/pdf.worker.min.mjs",
    "public/decouvrir/storyboards/**/*.jsx",
  ]),
  {
    // Règle purement cosmétique (échappement HTML des apostrophes dans le JSX) :
    // aucun impact fonctionnel, désactivée pour ne pas bloquer le contenu éditorial FR.
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
