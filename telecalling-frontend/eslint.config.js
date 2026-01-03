import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // 🚫 Disable unused vars
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',

      // 🚫 Disable unused function args warning
      '@typescript-eslint/no-unused-params': 'off',

      // 🚫 Disable "any" check
      '@typescript-eslint/no-explicit-any': 'off',

      // Optional: prevent React export warnings on Vite
      'react-refresh/only-export-components': 'off',

      // Optional: allow empty try/catch, functions
      'no-empty-function': 'off',
    },
  },
]);
