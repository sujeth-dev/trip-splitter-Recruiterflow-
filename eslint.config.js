import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // The strictest typescript-eslint preset. It uses type information,
      // so it can catch things like an `any` leaking out of JSON.parse.
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true, // lets ESLint read our tsconfig types
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Brief: no `any`, no @ts-ignore / @ts-expect-error, avoid `as` and `!`.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Forbid `as` casts (`as const` is still allowed). If one is ever truly
      // needed, it must be switched off on that line with a comment saying why.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // Allow numbers inside template strings, e.g. `${count} people`.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
  },
])
