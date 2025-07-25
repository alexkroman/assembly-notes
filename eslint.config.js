const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      ecmaVersion: 2022,
      sourceType: 'script',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['main.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['renderer.js', 'preload.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      sourceType: 'script',
    },
  },
  {
    files: [
      '**/__tests__/**/*.js',
      '**/__mocks__/**/*.js',
      '**/*.test.js',
      '**/*.spec.js',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    ignores: ['node_modules/**', 'mypy_cache/**', 'coverage/**', 'dist/**'],
  },
];
