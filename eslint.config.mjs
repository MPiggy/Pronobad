import coreWebVitals from 'eslint-config-next/core-web-vitals'
import next from 'eslint-config-next'
import typescript from 'eslint-config-next/typescript'

// eslint-config-next 16 ships native flat config, so no FlatCompat bridge.
const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'src/generated/**',
      'next-env.d.ts',
    ],
  },
  ...next,
  ...coreWebVitals,
  ...typescript,
]

export default eslintConfig
