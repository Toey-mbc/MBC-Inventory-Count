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
      const { data: authData } = await supabase.auth.getUser()
      if (!active) return
      if (!authData.user) {
        router.replace('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('active,must_change_password')
        .eq('id', authData.user.id)
        .maybeSingle()
      if (!active) return
      if (profile?.active === false) {
        await supabase.auth.signOut()
        router.replace('/login')
      } else if (profile?.must_change_password) {
        router.replace('/change-password')
      } else {
        setReady(true)
      }
    }
    void checkSession()
    return () => { active = false }
  }, [router])

  if (!ready) return <div style={{ padding: 30 }}>กำลังตรวจสอบสิทธิ์...</div>
  return <AppShell>{children}</AppShell>
}
