# MBC Inventory Production 2.0.1

## แก้ไขการเข้าสู่ระบบ

- ยกเลิกการบังคับเปลี่ยนรหัสผ่านครั้งแรก
- ผู้ใช้ใหม่ Login ด้วยรหัสที่ Admin กำหนดได้ทันที
- Reset Password จากหน้า Admin แล้วใช้รหัสใหม่ได้ทันที
- ล้างสถานะ `must_change_password` เดิมทั้งหมดเมื่อรัน SQL อัปเกรด
- หน้าเปลี่ยนรหัสผ่านยังคงเปิดใช้ได้แบบสมัครใจ และไม่พึ่ง RPC เดิม

## การอัปเกรด

1. วางไฟล์ทั้งหมดทับ Repository เดิม
2. รัน `RUN_THIS_SQL_PRODUCTION_UPGRADE.sql` ใน Supabase SQL Editor อีกครั้ง
3. Deploy ใหม่บน Vercel โดยปิด Build Cache ในรอบแรก
