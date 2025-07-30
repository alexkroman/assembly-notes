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
      'vite.config.js',
    ],
  },

  // 2. Base JavaScript configuration for all files
  js.configs.recommended,

  // 3. TypeScript files with strict type checking
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: [
      'src/**/*.ts',
      'src/**/*.tsx',
      '__tests__/**/*.ts',
      '__tests__/**/*.tsx',
      '__mocks__/**/*.ts',
    ],
    ignores: ['src/renderer/audio-processor.ts'],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: [
      'src/**/*.ts',
      'src/**/*.tsx',
      '__tests__/**/*.ts',
      '__tests__/**/*.tsx',
      '__mocks__/**/*.ts',
    ],
    ignores: ['src/renderer/audio-processor.ts'],
  })),

  // 4. All TypeScript files with strict type checking
  {
    files: [
      'src/**/*.ts',
      'src/**/*.tsx',
      '__tests__/**/*.ts',
      '__tests__/**/*.tsx',
      '__mocks__/**/*.ts',
    ],
    ignores: ['src/renderer/audio-processor.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
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

  // 4. Configuration for Main Process (Node.js environment)
  {
    files: ['src/main/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // 5. Configuration for Preload Scripts (mixed Node.js/Browser)
  {
    files: ['src/preload/**/*.ts'],
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
    ignores: ['src/renderer/audio-processor.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // 7. Configuration for Test files (Jest environment)
  {
    files: ['__tests__/**/*.ts', '__tests__/**/*.tsx', '__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    rules: {
      // Allow console usage in tests
      'no-console': 'off',
      // Allow any types in test files for mocking purposes
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Allow common test patterns
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // 8. Configuration for Mock files (Node.js environment)
  {
    files: ['__mocks__/**/*.ts', '__mocks__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.mocks.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    rules: {
      // Allow console usage in mocks
      'no-console': 'off',
      // Allow any types in mock files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Allow common mock patterns
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
