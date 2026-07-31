'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdminAccount } from '@/lib/permissions'

type AccessMode = 'read' | 'edit'
type UserFilter = 'all' | 'read' | 'edit' | 'inactive' | 'admin'

type UserRow = {
  id: string
  email: string
  full_name: string
  role: string
  access_mode: AccessMode | null
  active: boolean
  created_at: string
}

function usernameOf(email: string) {
  return email.split('@')[0] || email
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function UserManagement() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<UserRow[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<UserFilter>('all')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [accessMode, setAccessMode] = useState<AccessMode>('read')
  const [password, setPassword] = useState('1234')

  const api = useCallback(async (method: string, body?: unknown) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
    const response = await fetch('/api/admin/users', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'เกิดข้อผิดพลาด')
    return result
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace('/login')
        return
      }
      setCurrentUserId(authData.user.id)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,active')
        .eq('id', authData.user.id)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile?.active || !isAdminAccount(profile.role, authData.user.email)) {
        router.replace('/workspace#overview')
        return
      }
      const result = await api('GET')
      setRows(result.users || [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลผู้ใช้งานไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [api, router, supabase])

  useEffect(() => { void load() }, [load])

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(row => row.active).length,
    read: rows.filter(row => row.role !== 'admin' && row.access_mode !== 'edit').length,
    edit: rows.filter(row => row.role !== 'admin' && row.access_mode === 'edit').length,
  }), [rows])

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows.filter(row => {
      const isAdmin = row.role === 'admin'
      const mode: AccessMode = row.access_mode === 'edit' ? 'edit' : 'read'
      if (filter === 'read' && (isAdmin || mode !== 'read')) return false
      if (filter === 'edit' && (isAdmin || mode !== 'edit')) return false
      if (filter === 'inactive' && row.active) return false
      if (filter === 'admin' && !isAdmin) return false
      if (!normalized) return true
      return `${usernameOf(row.email)} ${row.full_name} ${row.email}`.toLowerCase().includes(normalized)
    })
  }, [filter, query, rows])

  async function createUser(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setMessage('')
    try {
      await api('POST', { username, fullName, accessMode, password })
      setMessage(`เพิ่มผู้ใช้งาน ${username} เรียบร้อยแล้ว`)
      setUsername('')
      setFullName('')
      setAccessMode('read')
      setPassword('1234')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เพิ่มผู้ใช้งานไม่สำเร็จ')
    } finally {
      setCreating(false)
    }
  }

  async function updateUser(row: UserRow, changes: Record<string, unknown>, successMessage = 'บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว') {
    setBusyId(row.id)
    setError('')
    setMessage('')
    try {
      await api('PATCH', { id: row.id, ...changes })
      setMessage(successMessage)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกข้อมูลไม่สำเร็จ')
    } finally {
      setBusyId('')
    }
  }

  async function editName(row: UserRow) {
    const value = window.prompt(`แก้ไขชื่อแสดงผลของ ${usernameOf(row.email)}`, row.full_name || '')
    if (value === null) return
    await updateUser(row, { fullName: value }, 'แก้ไขชื่อผู้ใช้งานเรียบร้อยแล้ว')
  }

  async function resetPassword(row: UserRow) {
    const value = window.prompt(`ตั้งรหัสผ่านใหม่สำหรับ ${usernameOf(row.email)}`, '1234')
    if (!value) return
    await updateUser(row, { password: value }, 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว')
  }



  return <div className="stack">
    {error && <div className="error">{error}</div>}
    {message && <div className="ok">{message}</div>}

    <div className="kpi-grid user-kpi-grid">
      <div className="card kpi-card"><div className="muted">ผู้ใช้ทั้งหมด</div><div className="kpi">{stats.total}</div></div>
      <div className="card kpi-card"><div className="muted">กำลังใช้งาน</div><div className="kpi">{stats.active}</div></div>
      <div className="card kpi-card"><div className="muted">สิทธิ์อ่าน</div><div className="kpi">{stats.read}</div></div>
      <div className="card kpi-card"><div className="muted">สิทธิ์แก้ไข</div><div className="kpi">{stats.edit}</div></div>
    </div>

    <div className="card">
      <div className="user-section-head">
        <div><h3>เพิ่มผู้ใช้งาน</h3><div className="muted">ผู้ดูแลระบบสร้างบัญชีและเลือกสิทธิ์เริ่มต้นได้จากหน้านี้</div></div>
      </div>
      <form className="form-row user-create-grid" onSubmit={createUser}>
        <div className="field">
          <label>Username *</label>
          <input value={username} onChange={event => setUsername(event.target.value)} placeholder="เช่น counter01" autoComplete="off" required />
        </div>
        <div className="field">
          <label>ชื่อ-นามสกุล</label>
          <input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="ชื่อผู้ใช้งาน" />
        </div>
        <div className="field">
          <label>สิทธิ์เริ่มต้น *</label>
          <select value={accessMode} onChange={event => setAccessMode(event.target.value as AccessMode)}>
            <option value="read">อ่าน — ดูข้อมูลและส่งออกรายงาน</option>
            <option value="edit">แก้ไข — ตรวจนับและจัดการข้อมูล</option>
          </select>
        </div>
        <div className="field">
          <label>รหัสผ่านเริ่มต้น *</label>
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={4} autoComplete="new-password" required />
        </div>
        <button className="btn primary" disabled={creating}>{creating ? 'กำลังเพิ่ม...' : 'เพิ่มผู้ใช้งาน'}</button>
      </form>
      <div className="permission-guide">
        <div><strong>อ่าน</strong><span>ดู Dashboard, Stock, รายงาน และส่งออกไฟล์ได้ แต่ไม่สามารถบันทึกหรือแก้ไขข้อมูล</span></div>
        <div><strong>แก้ไข</strong><span>ตรวจนับ บันทึก แก้ไข Master Data และดำเนินงานตาม Workflow ได้</span></div>
        <div><strong>Admin</strong><span>จัดการผู้ใช้ สิทธิ์ Backup/Restore และล้างข้อมูลระบบได้</span></div>
      </div>
    </div>

    <div className="card">
      <div className="user-list-toolbar">
        <div><h3>บัญชีผู้ใช้งาน</h3><div className="muted">การเปลี่ยนสิทธิ์มีผลเมื่อผู้ใช้เปิดหน้าระบบใหม่หรือเข้าสู่ระบบครั้งถัดไป</div></div>
        <div className="user-filter-actions">
          <input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหา Username หรือชื่อ" />
          <select value={filter} onChange={event => setFilter(event.target.value as UserFilter)}>
            <option value="all">ผู้ใช้ทั้งหมด</option>
            <option value="read">สิทธิ์อ่าน</option>
            <option value="edit">สิทธิ์แก้ไข</option>
            <option value="admin">ผู้ดูแลระบบ</option>
            <option value="inactive">บัญชีที่ระงับ</option>
          </select>
          <button className="btn secondary" onClick={() => void load()} disabled={loading}>รีเฟรช</button>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? <div className="empty-state">กำลังโหลดข้อมูลผู้ใช้งาน...</div> : <table className="table user-table">
          <thead><tr><th>Username</th><th>ชื่อผู้ใช้งาน</th><th>สิทธิ์</th><th>สถานะ</th><th>วันที่เพิ่ม</th><th>จัดการ</th></tr></thead>
          <tbody>{visibleRows.length ? visibleRows.map(row => {
            const isAdmin = row.role === 'admin'
            const isSelf = row.id === currentUserId
            const mode: AccessMode = row.access_mode === 'edit' ? 'edit' : 'read'
            const busy = busyId === row.id
            return <tr key={row.id}>
              <td><strong>{usernameOf(row.email)}</strong>{isSelf && <div className="muted">บัญชีที่กำลังใช้งาน</div>}</td>
              <td>{row.full_name || '-'}</td>
              <td>{isAdmin
                ? <span className="badge user-badge-admin">Admin</span>
                : <select value={mode} disabled={busy || !row.active} onChange={event => void updateUser(row, { accessMode: event.target.value }, 'อัปเดตสิทธิ์เรียบร้อยแล้ว')}>
                    <option value="read">อ่าน</option>
                    <option value="edit">แก้ไข</option>
                  </select>}
              </td>
              <td><span className={`badge ${row.active ? 'user-badge-active' : 'user-badge-inactive'}`}>{row.active ? 'ใช้งาน' : 'ระงับ'}</span></td>
              <td>{formatDate(row.created_at)}</td>
              <td><div className="user-row-actions">
                <button className="btn secondary" disabled={busy} onClick={() => void editName(row)}>แก้ชื่อ</button>
                <button className="btn secondary" disabled={busy} onClick={() => void resetPassword(row)}>ตั้งรหัสผ่าน</button>
                {!isAdmin && <button className={row.active ? 'btn danger' : 'btn secondary'} disabled={busy} onClick={() => void updateUser(row, { active: !row.active }, row.active ? 'ระงับบัญชีเรียบร้อยแล้ว' : 'เปิดใช้งานบัญชีเรียบร้อยแล้ว')}>{row.active ? 'ระงับ' : 'เปิดใช้งาน'}</button>}
              </div></td>
            </tr>
          }) : <tr><td colSpan={6}><div className="empty-state">ไม่พบผู้ใช้งานตามเงื่อนไข</div></td></tr>}</tbody>
        </table>}
      </div>
    </div>
  </div>
}
