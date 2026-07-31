import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const requiredFiles = [
  'app/login/page.tsx',
  'app/change-password/page.tsx',
  'app/workspace/page.tsx',
  'app/users/page.tsx',
  'app/api/admin/users/route.ts',
  'app/api/admin/workspace/route.ts',
  'components/WorkspaceClient.tsx',
  'legacy/workspace.html',
  'supabase/migrations/007_production_workspace.sql',
  'RUN_THIS_SQL_PRODUCTION_UPGRADE.sql',
  'RUN_THIS_SQL_DISABLE_FORCE_PASSWORD_CHANGE.sql',
]

const missing = requiredFiles.filter(file => !existsSync(file))
if (missing.length) {
  console.error(`Missing required files: ${missing.join(', ')}`)
  process.exit(1)
}

const obsoleteFiles = [
  'next.config.ts',
  'typecheck-stubs.d.ts',
  '.internal-types.d.ts',
  'tsconfig.internal.json',
  'tsconfig.tsbuildinfo',
]
const obsoleteFound = obsoleteFiles.filter(file => existsSync(file))
if (obsoleteFound.length) {
  console.error(`Obsolete build files found: ${obsoleteFound.join(', ')}`)
  process.exit(1)
}

const workspace = readFileSync('legacy/workspace.html', 'utf8')
const requiredWorkspaceTokens = [
  'MBC_SAVE_STATE',
  'MBC_APPEND_EVENT',
  'MBC_ADMIN_CLEAR',
  'ข้อมูลตั้งต้นสำหรับเปรียบเทียบ',
  'นำเข้าข้อมูลตั้งต้นเอง',
  'สิทธิ์การใช้งาน 2 ระดับ',
  'ล้างข้อมูลระบบ',
  'reportBrand',
]

const missingTokens = requiredWorkspaceTokens.filter(token => !workspace.includes(token))
if (missingTokens.length) {
  console.error(`Workspace production features missing: ${missingTokens.join(', ')}`)
  process.exit(1)
}

function walk(directory) {
  const output = []
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    const info = statSync(path)
    if (info.isDirectory()) output.push(...walk(path))
    else if (['.ts', '.tsx', '.js', '.mjs', '.html', '.md'].includes(extname(name))) output.push(path)
  }
  return output
}

const forbiddenUiText = [
  'ระบบทดลอง',
  'เวอร์ชันทดลอง',
  'รอบ UAT',
  'Local UAT',
  'Prototype Version',
  'Rev. 1',
  'ล้างข้อมูลทดสอบ',
  'HTML UAT',
]
const uiFiles = [...walk('app'), ...walk('components'), 'legacy/workspace.html']
for (const file of uiFiles) {
  const source = readFileSync(file, 'utf8')
  for (const text of forbiddenUiText) {
    if (source.includes(text)) {
      console.error(`Trial/version text still appears in ${file}: ${text}`)
      process.exit(1)
    }
  }
}

const sql = readFileSync('RUN_THIS_SQL_PRODUCTION_UPGRADE.sql', 'utf8')
const migration = readFileSync('supabase/migrations/007_production_workspace.sql', 'utf8')
if (sql.trim() !== migration.trim()) {
  console.error('Root production SQL and migration 007 are not identical')
  process.exit(1)
}
for (const token of [
  'access_mode',
  'workspace_states',
  'workspace_scan_events',
  'save_workspace_state',
  'promote_first_admin',
]) {
  if (!sql.includes(token)) {
    console.error(`Production SQL is missing ${token}`)
    process.exit(1)
  }
}


for (const forbiddenToken of [
  "router.replace('/change-password')",
  "must_change_password?'/change-password'",
  'must_change_password: true',
]) {
  for (const file of ['app/login/page.tsx', 'components/Protected.tsx', 'components/WorkspaceClient.tsx', 'app/api/admin/users/route.ts']) {
    if (readFileSync(file, 'utf8').includes(forbiddenToken)) {
      console.error(`Forced password-change logic still appears in ${file}: ${forbiddenToken}`)
      process.exit(1)
    }
  }
}
if (!sql.includes('alter column must_change_password set default false')) {
  console.error('Production SQL must disable forced password-change default')
  process.exit(1)
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
for (const dependency of ['next', 'react', 'react-dom', '@supabase/supabase-js', 'lucide-react', 'xlsx', 'qrcode.react']) {
  if (!packageJson.dependencies?.[dependency]) {
    console.error(`package.json is missing dependency: ${dependency}`)
    process.exit(1)
  }
}
for (const script of ['build', 'prebuild', 'check:production', 'typecheck']) {
  if (!packageJson.scripts?.[script]) {
    console.error(`package.json is missing script: ${script}`)
    process.exit(1)
  }
}

const localImports = /(?:from\s+|import\s*\()(['"])(@\/[^'"]+|\.\.?\/[^'"]+)\1/g
for (const file of [...walk('app'), ...walk('components'), ...walk('lib')]) {
  if (!['.ts', '.tsx', '.js', '.mjs'].includes(extname(file))) continue
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(localImports)) {
    let target = match[2]
    target = target.startsWith('@/') ? target.slice(2) : resolve(file, '..', target)
    const candidates = [
      target,
      `${target}.ts`, `${target}.tsx`, `${target}.js`, `${target}.mjs`,
      join(target, 'index.ts'), join(target, 'index.tsx'), join(target, 'index.js'),
    ]
    if (!candidates.some(candidate => existsSync(candidate))) {
      console.error(`Unresolved local import in ${file}: ${match[2]}`)
      process.exit(1)
    }
  }
}

console.log('Production structure check passed.')
