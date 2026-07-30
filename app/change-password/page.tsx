'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน')
      return
    }

    setBusy(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw new Error('Session หมดอายุ กรุณา Login ใหม่')
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw passwordError
      const { error: profileError } = await supabase.rpc('complete_password_change')
      if (profileError) throw profileError
      router.replace('/workspace')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return <div className="login-page">
    <form className="login-card stack" onSubmit={submit}>
      <div className="login-heading">
        <div className="login-mark">MBC</div>
        <div><h1>ตั้งรหัสผ่านใหม่</h1><div className="muted">กรุณาเปลี่ยนรหัสผ่านชั่วคราวก่อนเริ่มใช้งาน</div></div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="field"><label>รหัสผ่านใหม่</label><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required /></div>
      <div className="field"><label>ยืนยันรหัสผ่านใหม่</label><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></div>
      <button className="btn primary login-button" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}</button>
    </form>
  </div>
}
