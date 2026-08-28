// Dogfooding: this repo's own tests are linted by the plugin it ships.
// The plugin is consumed from dist/, so `npm run lint` builds first.
import tsParser from "@typescript-eslint/parser";
import featherTesting from "./dist/eslint-plugin/index.js";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "test-results/**", "playwright-report/**"],
  },
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    ...featherTesting.configs.recommended,
  },
];
