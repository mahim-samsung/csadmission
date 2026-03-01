import { dirname } from "path";
import { fileURLToPath } from "url";
import coreWebVitalsCfg from "eslint-config-next/core-web-vitals";
import typescriptCfg from "eslint-config-next/typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  // ── Global ignores ────────────────────────────
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/migrations/**",
      "*.config.{js,mjs,cjs}",
    ],
  },

  // ── Next.js 16 native flat configs ────────────
  ...coreWebVitalsCfg,
  ...typescriptCfg,

  // ── Project-specific overrides ────────────────
  {
    languageOptions: {
      parserOptions: {
        // Enable typed linting — required for no-misused-promises
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Warn on unused vars; allow underscore-prefixed intentional unused
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Enforce `import type` for type-only imports
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Catch async functions used in void contexts (e.g. event handlers)
      // checksVoidReturn.attributes:false keeps JSX onClick={async ()=>…} valid
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // Allow explicit `any` in server-side glue code (Prisma dynamic includes)
      "@typescript-eslint/no-explicit-any": "warn",

      // Unused expressions are often accidental
      "no-unused-expressions": "off",
    },
  },
];

export default eslintConfig;
