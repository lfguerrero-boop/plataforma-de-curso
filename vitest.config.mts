import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Misma resolución que tsconfig.json: "@/*" apunta a "./src/*".
const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// Las pruebas viven junto al código en src/. Se excluye Playwright (*.spec.ts y e2e/)
// y lo que no es de la app: los E2E del proyecto son scripts/e2e/*.cjs y se corren aparte.
const exclude = [
  "**/node_modules/**",
  "**/.next/**",
  "**/e2e/**",
  "**/playwright-report/**",
  "**/*.spec.{ts,tsx}",
];

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [...exclude, "src/**/*.integration.test.{ts,tsx}"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.{ts,tsx}"],
          // Hablan con el proyecto remoto (CLI de Supabase + Auth): cada llamada tarda segundos.
          testTimeout: 60_000,
          hookTimeout: 120_000,
          exclude,
        },
      },
    ],
  },
});
