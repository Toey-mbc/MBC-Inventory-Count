import fs from 'node:fs'
import path from 'node:path'
import WorkspaceClient from '@/components/WorkspaceClient'

export const dynamic = 'force-static'

export default function WorkspacePage() {
  const filePath = path.join(process.cwd(), 'legacy', 'workspace.html')
  const html = fs.readFileSync(filePath, 'utf8')
  return <WorkspaceClient html={html} />
}
