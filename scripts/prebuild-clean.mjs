import { existsSync, rmSync } from 'node:fs'

const remove = (target, options = {}) => {
  if (!existsSync(target)) return
  rmSync(target, { force: true, ...options })
  console.log(`[prebuild] removed ${target}`)
}

// Old ZIP versions were sometimes copied over the repository without deleting
// obsolete files. Clean them before every local/Vercel build so Next.js only
// reads the current configuration and TypeScript never reuses stale metadata.
remove('.next', { recursive: true })
remove('tsconfig.tsbuildinfo')

if (existsSync('next.config.mjs') && existsSync('next.config.ts')) {
  remove('next.config.ts')
}
