'use client'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Protected from '@/components/Protected'
import { createClient } from '@/lib/supabase/client'

type UserRow = {
  id: string
  email: string
  full_name: string
  role: string
  active: boolean
  must_change_password: boolean
  created_at: string
}

const roles = [
  ['admin', 'Admin'],
  ['warehouse_manager', 'Warehouse Manager'],
  ['sale_support', 'Sale Support'],
  ['counter', 'Counter'],
  ['viewer', 'Viewer'],
]

export default function Users() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('counter')
  const [password, setPassword] = useState('1234')
  const supabase = useMemo(() => createClient(), [])

  const api = useCallback(async (method: string, body?: unknown) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Session หมดอายุ กรุณา Login ใหม่')
    const response = await fetch('/api/admin/users', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'เกิดข้อผิดพลาด')
    return result
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await api('GET'); setRows(result.users || []) }
    catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [api])

  useEffect(() => { load() }, [load])

  async function createUser(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await api('POST', { username, fullName, role, password })
      setMessage(`สร้างผู้ใช้ ${username} เรียบร้อยแล้ว`)
      setUsername(''); setFullName(''); setRole('counter'); setPassword('1234')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'สร้างผู้ใช้ไม่สำเร็จ') }
    finally { setBusy(false) }
  }

  async function updateUser(row: UserRow, changes: Record<string, unknown>) {
    setBusy(true); setError(''); setMessage('')
    try { await api('PATCH', { id: row.id, ...changes }); setMessage('บันทึกเรียบร้อยแล้ว'); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') }
    finally { setBusy(false) }
  }

  async function resetPassword(row: UserRow) {
    const value = window.prompt(`ตั้งรหัสผ่านชั่วคราวสำหรับ ${row.email.split('@')[0]}`, '1234')
    if (!value) return
    await updateUser(row, { password: value, mustChangePassword: true })
  }

  return <Protected>
    <div className="topbar"><div><div className="page-title">ผู้ใช้งานและสิทธิ์</div><div className="muted">Admin เพิ่มผู้ใช้และจัดการสิทธิ์จากหน้านี้ได้โดยไม่ต้องเข้า Supabase</div></div></div>
    {error && <div className="error" style={{marginBottom:12}}>{error}</div>}
    {message && <div className="ok" style={{marginBottom:12}}>{message}</div>}

    <div className="card" style={{marginBottom:16}}>
      <h3 style={{marginTop:0}}>เพิ่มผู้ใช้งาน</h3>
      <form className="form-row" onSubmit={createUser}>
        <div className="field"><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="เช่น counter01" required /></div>
        <div className="field"><label>ชื่อ-นามสกุล</label><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="ชื่อผู้ใช้งาน" /></div>
        <div className="field"><label>Role</label><select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>รหัสผ่านชั่วคราว</label><input value={password} onChange={e=>setPassword(e.target.value)} minLength={4} required /></div>
        <div><button className="btn primary" disabled={busy}>{busy?'กำลังบันทึก...':'เพิ่มผู้ใช้งาน'}</button></div>
      </form>
      <div className="notice" style={{marginTop:14}}>ใส่รหัสชั่วคราว 1234 ได้ ระบบจะจัดเก็บเป็นรหัสภายในที่ผ่านข้อกำหนดของ Supabase แต่ผู้ใช้ยัง Login ด้วย 1234 ตามปกติ</div>
    </div>

    <div className="card table-wrap">
      {loading ? <div>กำลังโหลด...</div> : <table className="table"><thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ</th><th>Role</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}>
          <td><strong>{row.email.split('@')[0]}</strong></td>
          <td>{row.full_name || '-'}</td>
          <td><select value={row.role} disabled={busy} onChange={e=>updateUser(row,{role:e.target.value})}>{roles.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></td>
          <td><span className="badge">{row.active?'ใช้งาน':'ระงับ'}</span></td>
          <td><div style={{display:'flex',gap:8}}><button className="btn secondary" disabled={busy} onClick={()=>resetPassword(row)}>Reset Password</button><button className={row.active?'btn danger':'btn secondary'} disabled={busy} onClick={()=>updateUser(row,{active:!row.active})}>{row.active?'ระงับ':'เปิดใช้งาน'}</button></div></td>
        </tr>)}
      </tbody></table>}
    </div>
  </Protected>
}
