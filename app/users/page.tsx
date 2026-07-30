'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Protected from '@/components/Protected'
import { createClient } from '@/lib/supabase/client'

type AccessMode = 'read' | 'edit'

type UserRow = {
  id: string
  email: string
  full_name: string
  role: string
  access_mode: AccessMode | null
  active: boolean
  must_change_password: boolean
  created_at: string
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [accessMode, setAccessMode] = useState<AccessMode>('read')
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
    setLoading(true)
    setError('')
    try {
      const result = await api('GET')
      setRows(result.users || [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  async function createUser(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api('POST', { username, fullName, accessMode, password })
      setMessage(`สร้างผู้ใช้ ${username} เรียบร้อยแล้ว`)
      setUsername('')
      setFullName('')
      setAccessMode('read')
      setPassword('1234')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'สร้างผู้ใช้ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function updateUser(row: UserRow, changes: Record<string, unknown>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api('PATCH', { id: row.id, ...changes })
      setMessage('บันทึกสิทธิ์ผู้ใช้งานเรียบร้อยแล้ว')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(row: UserRow) {
    const value = window.prompt(`ตั้งรหัสผ่านชั่วคราวสำหรับ ${row.email.split('@')[0]}`, '1234')
    if (!value) return
    await updateUser(row, { password: value, mustChangePassword: true })
  }

  return <Protected>
    <div className="topbar">
      <div>
        <div className="page-title">ผู้ใช้งานและสิทธิ์</div>
        <div className="muted">ผู้ดูแลระบบกำหนดสิทธิ์เป็น “อ่าน” หรือ “แก้ไข” ให้แต่ละบัญชี</div>
      </div>
      <a className="btn secondary" href="/workspace#users">กลับหน้าระบบ</a>
    </div>

    {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
    {message && <div className="ok" style={{ marginBottom: 12 }}>{message}</div>}

    <div className="card" style={{ marginBottom: 16 }}>
      <h3>เพิ่มผู้ใช้งาน</h3>
      <form className="form-row" onSubmit={createUser}>
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={event => setUsername(event.target.value)} placeholder="เช่น counter01" required />
        </div>
        <div className="field">
          <label>ชื่อ-นามสกุล</label>
          <input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="ชื่อผู้ใช้งาน" />
        </div>
        <div className="field">
          <label>สิทธิ์เริ่มต้น</label>
          <select value={accessMode} onChange={event => setAccessMode(event.target.value as AccessMode)}>
            <option value="read">อ่าน — ดูข้อมูลและส่งออกรายงาน</option>
            <option value="edit">แก้ไข — บันทึก ตรวจนับ และจัดการข้อมูล</option>
          </select>
        </div>
        <div className="field">
          <label>รหัสผ่านชั่วคราว</label>
          <input value={password} onChange={event => setPassword(event.target.value)} minLength={4} required />
        </div>
        <div><button className="btn primary" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'เพิ่มผู้ใช้งาน'}</button></div>
      </form>
      <div className="notice" style={{ marginTop: 14 }}>
        รหัส 1234 ใช้เป็นรหัสชั่วคราวได้ ผู้ดูแลระบบควรให้ผู้ใช้เปลี่ยนรหัสผ่านหลังเริ่มใช้งานครั้งแรก
      </div>
    </div>

    <div className="card table-wrap">
      {loading ? <div>กำลังโหลด...</div> : <table className="table">
        <thead><tr><th>Username</th><th>ชื่อ</th><th>สิทธิ์</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
        <tbody>{rows.map(row => {
          const isAdmin = row.role === 'admin'
          const mode: AccessMode = row.access_mode === 'edit' ? 'edit' : 'read'
          return <tr key={row.id}>
            <td><strong>{row.email.split('@')[0]}</strong>{isAdmin && <div className="muted">ผู้ดูแลระบบ</div>}</td>
            <td>{row.full_name || '-'}</td>
            <td>{isAdmin
              ? <span className="badge">Admin</span>
              : <select value={mode} disabled={busy || !row.active} onChange={event => void updateUser(row, { accessMode: event.target.value })}>
                  <option value="read">อ่าน</option>
                  <option value="edit">แก้ไข</option>
                </select>}
            </td>
            <td><span className="badge">{row.active ? 'ใช้งาน' : 'ระงับ'}</span></td>
            <td><div style={{ display: 'flex', gap: 8 }}>
              <button className="btn secondary" disabled={busy} onClick={() => void resetPassword(row)}>Reset Password</button>
              <button
                className={row.active ? 'btn danger' : 'btn secondary'}
                disabled={busy || isAdmin}
                onClick={() => void updateUser(row, { active: !row.active })}
              >{row.active ? 'ระงับ' : 'เปิดใช้งาน'}</button>
            </div></td>
          </tr>
        })}</tbody>
      </table>}
    </div>
  </Protected>
}
