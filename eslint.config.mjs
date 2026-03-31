import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

const ignores = [
  '**/node_modules/**',
  '**/coverage/**',
  '**/dist/**',
  '**/build/**',
  '**/public/**',
  '**/.angular/**',
  '**/.stryker-tmp/**',
  '.strapi/**',
  'coverage/**',
  '.coverage/**',
  '**/.coverage/**',
  '.tmp/**',
  '.tmp-build/**',
  // TypeScript artifacts occasionally generated into the Angular source tree.
  'openg7-org/src/**/*.js',
  'openg7-org/src/**/*.js.map',
  'openg7-org/e2e/**/*.js',
  'openg7-org/e2e/**/*.js.map',
  '**/*.d.ts',
];

const sharedQualityRules = {
  eqeqeq: ['error', 'smart'],
  'import/order': [
    'warn',
    {
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    },
  ],
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'no-else-return': 'error',
  'no-empty': ['error', { allowEmptyCatch: false }],
  'no-extra-bind': 'error',
  'no-implied-eval': 'error',
  'no-implicit-coercion': 'warn',
  'no-irregular-whitespace': 'error',
  'no-return-assign': ['error', 'always'],
  'no-sequences': 'error',
  'prefer-const': ['error', { destructuring: 'all' }],
};

const typescriptFiles = ['**/*.{ts,tsx,cts,mts}'];

const typescriptBaseConfigs = tseslint.configs['flat/recommended'].map((config) => {
  const scopedConfig = config.files ? config : { ...config, files: typescriptFiles };
  if (config.languageOptions) {
    return {
      ...scopedConfig,
      languageOptions: {
        ...config.languageOptions,
        parser: tsParser,
        parserOptions: {
          ...config.languageOptions.parserOptions,
          ecmaVersion: 2022,
          sourceType: 'module',
        },
        globals: {
          ...globals.browser,
          ...globals.node,
          ...(config.languageOptions.globals ?? {}),
        },
      },
      plugins: {
        ...(config.plugins ?? {}),
        import: importPlugin,
      },
    };
  }

  return {
    ...scopedConfig,
    plugins: {
      ...(config.plugins ?? {}),
      import: importPlugin,
    },
  };
});

export default [
  {
    ignores,
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...(js.configs.recommended.languageOptions?.globals ?? {}),
      },
    },
    plugins: {
      ...js.configs.recommended.plugins,
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedQualityRules,
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|^(?:e|err(?:or)?)$',
          varsIgnorePattern: '^(?:_|T|e|err(?:or)?)$',
          caughtErrorsIgnorePattern: '^(?:_|e|err(?:or)?)$',
        },
      ],
    },
  },
  ...typescriptBaseConfigs,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      ...sharedQualityRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: ['arrowFunctions'],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|^(?:e|err(?:or)?)$',
          varsIgnorePattern: '^(?:_|T|e|err(?:or)?)$',
          caughtErrorsIgnorePattern: '^(?:_|e|err(?:or)?)$',
        },
      ],
    },
  },
  {
    files: ['**/*.{spec.ts,test.ts}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['strapi/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['strapi/**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        strapi: 'readonly',
      },
    },
  },
  {
    files: [
      'openg7-org/scripts/**/*.{js,cjs,mjs,ts,tsx}',
      'scripts/**/*.{js,cjs,mjs,ts,tsx}',
      'tools/**/*.{js,cjs,mjs,ts,tsx}',
      'packages/**/bin/**/*.{js,cjs,mjs,ts,tsx}',
      'packages/**/spec/**/*.{js,cjs,mjs,ts,tsx}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
];
