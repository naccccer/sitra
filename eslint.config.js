import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const moduleNames = [
  'accounting',
  'customers',
  'human-resources',
  'inventory',
  'master-data',
  'production',
  'sales',
  'users-access',
]

const moduleBoundaryOverrides = moduleNames.flatMap((moduleName) => {
  const otherModules = moduleNames.filter((name) => name !== moduleName)
  const restricted = otherModules.map((name) => `src/modules/${name}/**`)
  const aliasRestricted = otherModules.flatMap((name) => [
    `@/modules/${name}`,
    `@/modules/${name}/**`,
  ])

  return [
    {
      files: [`src/modules/${moduleName}/**/*.{js,jsx,ts,tsx}`],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  ...restricted,
                  ...aliasRestricted,
                ],
                message: 'Cross-module imports are forbidden. Use module public contracts via kernel/services.',
              },
            ],
          },
        ],
      },
    },
    {
      files: [`src/modules/${moduleName}/{components,pages,hooks,domain,utils}/**/*.{js,jsx,ts,tsx}`],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/services/api', 'src/services/api', '@/services/api', '@services/api'],
                message: 'Use module-local service facade instead of importing src/services/api directly.',
              },
            ],
          },
        ],
      },
    },
  ]
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
