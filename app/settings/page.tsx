'use client'

import Protected from '@/components/Protected'
import UserManagement from '@/components/UserManagement'

export default function SettingsPage() {
  return <Protected>
    <div className="topbar">
      <div>
        <div className="page-title">ตั้งค่าและจัดการผู้ใช้งาน</div>
        <div className="muted">ศูนย์จัดการสำหรับผู้ดูแลระบบ เพิ่มผู้ใช้ กำหนดสิทธิ์อ่านหรือแก้ไข และจัดการบัญชี</div>
      </div>
      <div className="settings-quick-actions">
        <a className="btn secondary" href="/workspace#settings">ตั้งค่าการสแกน</a>
        <a className="btn secondary" href="/workspace#backup">Backup / ล้างข้อมูล</a>
        <a className="btn secondary" href="/workspace#overview">กลับหน้าระบบ</a>
      </div>
    </div>
    <div className="notice" style={{ marginBottom: 16 }}>
      เฉพาะผู้ดูแลระบบเท่านั้นที่เข้าหน้านี้ได้ การเพิ่มผู้ใช้ เปลี่ยนสิทธิ์ ตั้งรหัสผ่าน ระงับ หรือเปิดใช้งานบัญชี จะตรวจสอบสิทธิ์ที่ Server ทุกครั้ง
    </div>
    <UserManagement />
  </Protected>
}
