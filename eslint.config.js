import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/domain/**/*.ts', 'src/runtime/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['react', 'react/*', 'react-dom', 'three', 'three/*', 'zustand', 'zustand/*', '../state/*', '../features/*', '../viewport/*', '../app/*'] }] }
  },
  {
    files: ['src/state/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['three', 'three/*', '../viewport/*'] }] }
  }
];
