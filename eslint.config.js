import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      // The end-to-end build. Same source, built with the test bridge included.
      'dist-e2e/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'dev-dist/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
  },

  /* ---------------------------------------------------------------------------
   * ARCH-001 / ADR-0004: module-boundary enforcement.
   *
   * Only the boundaries that exist today are enforced. Layers with no code yet
   * (domain, application, intelligence, importers) are documented architectural
   * rules in docs/architecture/ARCHITECTURE_OVERVIEW.md, not empty directories —
   * creating those now would be speculative scaffolding (LEAN-001).
   * ------------------------------------------------------------------------- */
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**', 'src/infrastructure/**'],
              message:
                'The UI must never reach storage directly (ADR-0004). Go through the application layer.',
            },
            {
              group: ['dexie'],
              message:
                'The UI must not import a storage driver (ADR-0004, STORE-001). Storage access belongs in src/infrastructure/database/.',
            },
            {
              group: ['**/importers/**'],
              message:
                'Legacy importer types must never enter normal UI logic (MIG-001, ADR-0001).',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui/**', 'react', 'react-dom'],
              message: 'Infrastructure must not depend on the interface layer (ARCH-001).',
            },
          ],
        },
      ],
    },
  },

  /* PRIV-001: no payload logging. Console noise is also a privacy leak vector. */
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'localStorage may hold only disposable boot preferences (STORE-001). Canonical life data belongs in IndexedDB.',
        },
      ],
    },
  },

  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}', '*.config.{ts,js}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Not part of the TypeScript program, so type-aware rules cannot apply to them.
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
