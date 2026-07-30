'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function WorkspaceClient({ html }: { html: string }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
      else setReady(true)
    })

    const onMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'MBC_LOGOUT') {
        await supabase.auth.signOut()
        router.replace('/login')
        router.refresh()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [router])

  if (!ready) {
    return <div className="workspace-loading"><div className="workspace-spinner"/><b>กำลังเปิดระบบตรวจนับ...</b></div>
  }

  return (
    <iframe
      className="workspace-frame"
      title="MBC Inventory Workspace"
      srcDoc={html}
      sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-same-origin"
    />
  )
}
