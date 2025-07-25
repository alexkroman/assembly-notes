import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 1. Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.vite/**',
      '.electron-vite/**',
    ],
  },

  // 2. Base JavaScript configuration for all files
  js.configs.recommended,

  // 3. JavaScript mock files - basic linting only
  {
    files: ['__mocks__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      // Basic JavaScript linting only
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // 4. TypeScript files with strict type checking
  ...tseslint.configs.strictTypeChecked.map(config => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  ...tseslint.configs.stylisticTypeChecked.map(config => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // 5. All TypeScript files with strict type checking
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Enforce stricter code quality
      'prefer-const': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'no-unused-vars': 'off', // Disabled in favor of the TS version

      // Stricter TypeScript-specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',

      // Import rules for ordering and consistency
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
  },

  // 6. Test files - relax some rules but keep strict type checking
  {
    files: [
      '__tests__/**/*.ts',
      '__mocks__/**/*.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      // Allow any in test files for mocking
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // 4. Configuration for Main Process (Node.js environment)
  {
    files: ['electron/main/**/*.ts', 'electron/main.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // 5. Configuration for Preload Scripts (mixed Node.js/Browser)
  {
    files: ['electron/preload/**/*.ts', 'electron/preload.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  // 6. Configuration for Renderer Process (Browser environment)
  {
    files: ['src/renderer/**/*.ts', 'src/renderer/**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  }
);
