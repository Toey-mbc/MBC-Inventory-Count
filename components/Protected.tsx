'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppShell from './AppShell'

export default function Protected({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let active = true
    const checkSession = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!active) return
      if (!data.user) router.replace('/login')
      else setReady(true)
    }
    void checkSession()
    return () => { active = false }
  }, [router])

  if (!ready) return <div style={{ padding: 30 }}>กำลังตรวจสอบสิทธิ์...</div>
  return <AppShell>{children}</AppShell>
}
