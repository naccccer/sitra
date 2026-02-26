import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const moduleNames = ['sales', 'production', 'inventory', 'master-data', 'users-access']

const moduleBoundaryOverrides = moduleNames.map((moduleName) => {
  const restricted = moduleNames
    .filter((name) => name !== moduleName)
    .map((name) => `src/modules/${name}/**`)

  return {
    files: [`src/modules/${moduleName}/{components,pages,hooks,domain}/**/*.{js,jsx,ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: restricted,
              message: 'Cross-module imports are forbidden. Use module public contracts via kernel/services.',
            },
            {
              group: ['**/services/api', 'src/services/api'],
              message: 'Use module-local service facade instead of importing src/services/api directly.',
            },
          ],
        },
      ],
    },
  }
})

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  ...moduleBoundaryOverrides,
])
