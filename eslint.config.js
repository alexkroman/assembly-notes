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
    ignores: ['node_modules/**', 'mypy_cache/**'],
  },
];
