'use client'

import Protected from '@/components/Protected'
import UserManagement from '@/components/UserManagement'

export default function UsersPage() {
  return <Protected>
    <div className="topbar">
      <div>
        <div className="page-title">จัดการผู้ใช้งานและสิทธิ์</div>
        <div className="muted">สำหรับผู้ดูแลระบบ เพิ่มผู้ใช้ กำหนดสิทธิ์อ่านหรือแก้ไข ตั้งรหัสผ่าน และระงับบัญชี</div>
      </div>
      <a className="btn secondary" href="/workspace#overview">กลับหน้าระบบ</a>
    </div>
    <UserManagement />
  </Protected>
}
