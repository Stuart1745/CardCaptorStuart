import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Downgrade to warning — Scryfall/Gmail API responses legitimately need any
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade to warning — intentional pattern for loading initial state from localStorage
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
