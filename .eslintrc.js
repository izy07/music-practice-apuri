/**
 * ESLint設定
 * コード品質の向上とコーディング規約の統一を目的とする
 */

module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
  },
  rules: {
    // console.logの直接使用を禁止（loggerを使用）
    'no-console': ['error', {
      allow: ['warn', 'error'], // logger.ts内での使用のみ許可
    }],

    // インポート順序の統一
    'import/order': ['warn', {
      groups: [
        'builtin',      // Node.js built-in modules
        'external',     // External libraries
        'internal',     // Internal modules (@/)
        ['parent', 'sibling'], // Parent and sibling imports
        'index',        // Index imports
        'object',       // Object imports
        'type',         // Type imports
      ],
      pathGroups: [
        {
          pattern: 'react',
          group: 'external',
          position: 'before',
        },
        {
          pattern: 'react-native',
          group: 'external',
          position: 'before',
        },
        {
          pattern: 'expo*',
          group: 'external',
          position: 'before',
        },
        {
          pattern: '@/**',
          group: 'internal',
          position: 'after',
        },
        {
          pattern: '*.{ts,tsx}',
          patternOptions: { matchBase: true },
          group: 'type',
          position: 'after',
        },
      ],
      pathGroupsExcludedImportTypes: ['react', 'react-native'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],

    // インポートの重複を禁止
    'no-duplicate-imports': 'off', // import/orderで処理
    'import/no-duplicates': ['error', { considerQueryString: true }],

    // 未使用のインポートを警告
    'import/no-unused-modules': 'off', // パフォーマンスの問題があるため無効化
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],

    // TypeScript固有のルール
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // コードスタイル
    'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],
  },
  ignorePatterns: [
    '.github/**/*', // GitHub Actionsのワークフローファイルは除外
  ],
  overrides: [
    {
      // logger.ts内ではconsole.logの使用を許可
      files: ['lib/logger.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // テストファイルではconsole.logの使用を許可
      files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // スクリプトファイルではconsole.logの使用を許可
      files: ['scripts/**/*.{js,ts}'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      'babel-module': {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
};

