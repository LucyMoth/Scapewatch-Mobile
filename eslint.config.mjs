import javascript from '@eslint/js';
import globals from 'globals';
import playwright from 'eslint-plugin-playwright';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'android/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  javascript.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'one-var': ['error', 'never'],
    },
  },
  {
    files: ['src/**/*.js', 'tests/fixtures/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tests/**/*.cjs'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['tests/**/*.spec.cjs'],
    plugins: { playwright },
    rules: {
      'playwright/missing-playwright-await': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-standalone-expect': 'error',
    },
  },
];
