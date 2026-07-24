import {defineConfig,globalIgnores} from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
export default defineConfig([
 ...nextVitals,
 {
  rules:{
   '@typescript-eslint/no-explicit-any':'off',
   '@typescript-eslint/no-unused-vars':['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],
   'react-hooks/exhaustive-deps':'off',
   '@next/next/no-img-element':'off',
  },
 },
 globalIgnores(['.next/**','out/**','build/**','next-env.d.ts']),
])
