import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import markdownPlugin from 'eslint-plugin-markdown';
import markdownlintPlugin from 'eslint-plugin-markdownlint';
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
      'scripts/**',
      'docs/**',
    ],
  },

  // 2. Base JavaScript configuration for all files
  js.configs.recommended,

  // 3. Configuration for Vite config files (Node.js environment)
  {
    files: ['vite.audio-processor.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // 4. TypeScript files with strict type checking
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
  },

  // 9. Configuration for Markdown files with markdownlint
  {
    files: ['**/*.md'],
    plugins: {
      markdownlint: markdownlintPlugin,
    },
    rules: {
      // Enable all available markdownlint rules with strict configuration
      'markdownlint/md001': 'error', // heading-increment
      'markdownlint/md003': 'error', // heading-style
      'markdownlint/md004': 'error', // ul-style
      'markdownlint/md005': 'error', // list-indent
      'markdownlint/md007': 'error', // ul-indent
      'markdownlint/md009': 'error', // no-trailing-spaces
      'markdownlint/md010': 'error', // no-hard-tabs
      'markdownlint/md011': 'error', // no-reversed-links
      'markdownlint/md012': 'error', // no-multiple-blanks
      'markdownlint/md013': ['error', { line_length: 100 }], // line-length
      'markdownlint/md014': 'error', // commands-show-output
      'markdownlint/md018': 'error', // no-missing-space-atx
      'markdownlint/md019': 'error', // no-multiple-space-atx
      'markdownlint/md020': 'error', // no-missing-space-closed-atx
      'markdownlint/md021': 'error', // no-multiple-space-closed-atx
      'markdownlint/md022': 'error', // blanks-around-headings
      'markdownlint/md023': 'error', // heading-start-left
      'markdownlint/md024': 'error', // no-duplicate-heading
      'markdownlint/md025': 'error', // single-h1
      'markdownlint/md026': 'error', // no-trailing-punctuation
      'markdownlint/md027': 'error', // no-multiple-space-blockquote
      'markdownlint/md028': 'error', // no-blanks-blockquote
      'markdownlint/md029': 'error', // ol-prefix
      'markdownlint/md030': 'error', // list-marker-space
      'markdownlint/md031': 'error', // blanks-around-fences
      'markdownlint/md032': 'error', // blanks-around-lists
      'markdownlint/md033': [
        'error',
        { allowed_elements: ['details', 'summary'] },
      ], // no-inline-html
      'markdownlint/md034': 'error', // no-bare-urls
      'markdownlint/md035': 'error', // hr-style
      'markdownlint/md036': 'error', // no-emphasis-as-heading
      'markdownlint/md037': 'error', // no-space-in-emphasis
      'markdownlint/md038': 'error', // no-space-in-code
      'markdownlint/md039': 'error', // no-space-in-links
      'markdownlint/md040': 'error', // fenced-code-language
      'markdownlint/md041': 'error', // first-line-h1
      'markdownlint/md042': 'error', // no-empty-links
      'markdownlint/md043': 'error', // required-headings
      'markdownlint/md044': 'error', // proper-names
      'markdownlint/md045': 'error', // no-alt-text
      'markdownlint/md046': 'error', // code-block-style
      'markdownlint/md047': 'error', // single-trailing-newline
      'markdownlint/md048': 'error', // code-fence-style
      'markdownlint/md049': 'error', // emphasis-style
      'markdownlint/md050': 'error', // strong-style
      // Note: MD051 (link-fragments) is not available in this plugin version
    },
  },

  // 10. Configuration for Markdown files with markdown processor for code blocks
  {
    files: ['**/*.md'],
    plugins: {
      markdown: markdownPlugin,
    },
    processor: 'markdown/markdown',
  },

  // 11. Configuration for code blocks within Markdown files
  {
    files: ['**/*.md/*.js', '**/*.md/*.ts', '**/*.md/*.jsx', '**/*.md/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          impliedStrict: true,
        },
      },
    },
    rules: {
      // Relax rules for code examples in markdown
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'import/order': 'off',
    },
  }
);
