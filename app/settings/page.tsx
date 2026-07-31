'use client'

import Protected from '@/components/Protected'
import UserManagement from '@/components/UserManagement'

export default function SettingsPage() {
  return <Protected>
    <div className="topbar">
      <div>
        <div className="page-title">ตั้งค่าและจัดการผู้ใช้งาน</div>
        <div className="muted">ศูนย์จัดการสำหรับ Admin กำหนดสิทธิ์ผู้ใช้และเข้าถึงการตั้งค่าระบบ</div>
      </div>
      <div className="settings-quick-actions">
        <a className="btn secondary" href="/workspace#settings">ตั้งค่าการสแกน</a>
        <a className="btn secondary" href="/workspace#backup">Backup / ล้างข้อมูล</a>
        <a className="btn secondary" href="/workspace#overview">กลับหน้าระบบ</a>
      </div>
    </div>
    <div className="notice" style={{ marginBottom: 16 }}>
      หน้านี้เปิดให้เฉพาะผู้ดูแลระบบ การเพิ่มผู้ใช้ เปลี่ยนสิทธิ์ Reset Password ระงับหรือเปิดใช้งานบัญชี จะถูกตรวจสอบสิทธิ์ที่ Server ทุกครั้ง
    </div>
    <UserManagement />
  </Protected>
}
