'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function WorkspaceClient({ html }: { html: string }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    const checkSession = async () => {
      const { data } = await supabase.auth.getUser()
      if (!active) return
      if (!data.user) router.replace('/login')
      else setReady(true)
    }
    void checkSession()

    const onMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'MBC_LOGOUT') {
        await supabase.auth.signOut()
        router.replace('/login')
        router.refresh()
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      active = false
      window.removeEventListener('message', onMessage)
    }
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
