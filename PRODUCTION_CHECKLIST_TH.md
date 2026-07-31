# Production Checklist — MBC Inventory 2.0.3

## ก่อน Deploy

- [ ] วางไฟล์ทั้งหมดที่ Root ของ GitHub Repository
- [ ] ตรวจ Environment Variables ใน Vercel ครบ 3 ตัว
- [ ] ไม่มี `SUPABASE_SERVICE_ROLE_KEY` ขึ้นต้นด้วย `NEXT_PUBLIC_`
- [ ] กรณียังมี Error access_mode ให้รัน `RUN_THIS_SQL_FIX_ACCESS_MODE_ERROR.sql`
- [ ] Redeploy โดยปิด Build Cache

## Authentication

- [ ] Admin Login ได้
- [ ] ผู้ใช้ทั่วไป Login ด้วย Username ได้
- [ ] ไม่มีการบังคับเปลี่ยนรหัสผ่านครั้งแรก
- [ ] บัญชีที่ถูกระงับไม่สามารถใช้งานระบบได้

## User Management — Admin เท่านั้น

- [ ] เมนู `ตั้งค่าและผู้ใช้งาน` แสดงเฉพาะ Admin
- [ ] ผู้ใช้ทั่วไปเปิด `/settings` หรือ `/users` แล้วถูกส่งกลับหน้าระบบ
- [ ] Admin เพิ่มผู้ใช้ใหม่ได้
- [ ] Admin กำหนดสิทธิ์อ่านได้
- [ ] Admin กำหนดสิทธิ์แก้ไขได้
- [ ] Admin แก้ชื่อแสดงผลได้
- [ ] Admin ตั้งรหัสผ่านใหม่ได้
- [ ] Admin ระงับและเปิดใช้งานบัญชีได้
- [ ] ไม่สามารถระงับบัญชี Admin
- [ ] การจัดการผู้ใช้มี Audit Log

## Permission Test

- [ ] สิทธิ์อ่านดู Dashboard, Stock และรายงานได้
- [ ] สิทธิ์อ่าน Export Excel/PDF ได้
- [ ] สิทธิ์อ่านไม่สามารถบันทึกหรือแก้ไขข้อมูล
- [ ] สิทธิ์แก้ไขสร้างรอบและตรวจนับได้
- [ ] Admin ใช้ Backup/Restore และล้างข้อมูลได้

## Count Round

- [ ] สร้างรอบจากข้อมูลในระบบได้
- [ ] สร้างรอบจาก Import Excel/CSV ได้
- [ ] Preview ข้อมูลตั้งต้นก่อนสร้างรอบได้
- [ ] สแกนพร้อมกันหลายเครื่องไม่เขียนยอดทับกัน

## Reports

- [ ] แสดง Barcode, SKU, แบรนด์, ชื่อ, Description
- [ ] แสดงคลัง โลเคชั่น สภาพ และจำนวน
- [ ] กรองแบรนด์ คลัง โลเคชั่น และ SKU ได้
- [ ] Export Excel และพิมพ์/PDF ได้

## Data Management

- [ ] ล้างข้อมูลตรวจนับได้เฉพาะ Admin
- [ ] ล้างข้อมูลธุรกรรมได้เฉพาะ Admin
- [ ] Factory Reset ได้เฉพาะ Admin
- [ ] มีข้อความยืนยันก่อนล้างข้อมูล
