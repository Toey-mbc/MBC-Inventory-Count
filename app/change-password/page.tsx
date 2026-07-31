'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SHORT_PASSWORD_ALIAS = '1234'
const SHORT_PASSWORD_INTERNAL = 'MBC@1234'

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
    if (password.length < 4) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร')
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
      const nextPassword = password === SHORT_PASSWORD_ALIAS ? SHORT_PASSWORD_INTERNAL : password
      const { error: passwordError } = await supabase.auth.updateUser({ password: nextPassword })
      if (passwordError) throw passwordError
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
        <div><h1>เปลี่ยนรหัสผ่าน</h1><div className="muted">ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</div></div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="field"><label>รหัสผ่านใหม่</label><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required /></div>
      <div className="field"><label>ยืนยันรหัสผ่านใหม่</label><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></div>
      <button className="btn primary login-button" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}</button>
    </form>
  </div>
}
