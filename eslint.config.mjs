import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  // Expo's recommended ESLint rules (eslintrc-style, bridged to flat config)
  ...compat.extends('expo'),

  // Only lint our source tree
  { files: ['src/**/*.{js,jsx,ts,tsx}'] },

  // Turn off ESLint rules that conflict with Prettier
  prettierConfig,

  // Minimal project rules
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        // Timers (works for JS runtime used by React Native / Hermes too)
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-console': 'warn',
    },
  },

  // Jest test files
  {
    files: ['src/**/__tests__/**/*.{js,jsx,ts,tsx}', 'src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
];

