# Production Checklist

## ฐานข้อมูล

- [ ] รัน `RUN_THIS_SQL_FIX_ACCESS_MODE_ERROR.sql` สำเร็จ
- [ ] ตาราง `profiles`, `workspace_states`, `workspace_scan_events` เปิดใช้งานได้
- [ ] Function `save_workspace_state`, `can_edit`, `is_admin` มีอยู่
- [ ] Realtime เปิดให้ `workspace_states` และ `workspace_scan_events`

## สิทธิ์

- [ ] Admin เข้าหน้าผู้ใช้งานได้
- [ ] สิทธิ์อ่านถูกบันทึกเป็น Role `viewer`
- [ ] สิทธิ์แก้ไขถูกบันทึกเป็น Role `counter`
- [ ] Admin ไม่สามารถระงับบัญชีตัวเองขณะใช้งาน
- [ ] ผู้ใช้สิทธิ์อ่านแก้ไขข้อมูลไม่ได้
- [ ] เมนูล้างข้อมูลทำงานเฉพาะ Admin

## รหัสผ่าน

- [ ] ผู้ใช้ใหม่ Login ด้วยรหัสที่ Admin กำหนดได้ทันที
- [ ] Reset Password แล้ว Login ด้วยรหัสใหม่ได้
- [ ] ไม่มีหน้าเปลี่ยนรหัสผ่านถูกเปิดแบบบังคับ

## รอบตรวจนับ

- [ ] เลือกข้อมูลตั้งต้นจากระบบได้
- [ ] Import Excel/CSV ได้
- [ ] Preview และตรวจข้อผิดพลาดก่อนสร้างรอบได้
- [ ] Scan Event ซิงก์ระหว่างเครื่องได้
- [ ] Offline Queue ไม่ส่งรายการซ้ำ

## รายงาน

- [ ] แสดง Barcode, SKU, Brand, Name, Description
- [ ] แสดงคลัง โลเคชั่น สภาพ ยอดระบบ ยอดนับ และผลต่าง
- [ ] กรองแบรนด์ คลัง โลเคชั่น และค้นหา SKU ได้
- [ ] Export Excel/PDF ได้
