# MBC Inventory Production 2.0.3

ระบบตรวจนับสินค้าสำหรับใช้งานจริงบน Next.js, Vercel และ Supabase

## สิ่งที่เพิ่มในรุ่นนี้

- เพิ่มศูนย์ **ตั้งค่าและจัดการผู้ใช้งาน** สำหรับ Admin
- Admin สามารถทำรายการต่อไปนี้จากหน้าเว็บได้
  - เพิ่มผู้ใช้งาน
  - กำหนดสิทธิ์ `อ่าน` หรือ `แก้ไข`
  - แก้ไขชื่อแสดงผล
  - ตั้งรหัสผ่านใหม่
  - ระงับหรือเปิดใช้งานบัญชี
  - ค้นหาและกรองบัญชีตามสิทธิ์และสถานะ
- เพิ่มการ์ดสรุปจำนวนผู้ใช้ทั้งหมด ผู้ใช้ที่ใช้งาน สิทธิ์อ่าน และสิทธิ์แก้ไข
- เพิ่มปุ่มเข้าหน้าจัดการผู้ใช้จากเมนู **ตั้งค่าระบบ** ภายใน Workspace
- จำกัดหน้าและ API จัดการผู้ใช้ให้เฉพาะ Admin ทั้งฝั่ง UI และ Server
- สิทธิ์ยังใช้ `profiles.role` ที่มีอยู่เดิม
  - `viewer` = อ่าน
  - `counter`, `warehouse_manager`, `sale_support` = แก้ไข
  - `admin` = ผู้ดูแลระบบ
- ไม่มีการบังคับเปลี่ยนรหัสผ่านครั้งแรก

## สิทธิ์การใช้งาน

### อ่าน
ดู Dashboard, Stock, รายงาน และส่งออกไฟล์ได้ แต่ไม่สามารถบันทึกหรือแก้ไขข้อมูล

### แก้ไข
ตรวจนับ บันทึก แก้ไข Master Data และดำเนินงานตาม Workflow ได้

### Admin
มีสิทธิ์เต็ม รวมจัดการผู้ใช้ Backup/Restore และล้างข้อมูลระบบ

## การอัปเดตจาก Production 2.0.2

รุ่นนี้ไม่เพิ่มคอลัมน์ฐานข้อมูลใหม่ หากฐานข้อมูลเคยรัน SQL ของ Production 2.0.2 แล้ว ให้วางไฟล์ชุดนี้ทับ Repository และ Deploy ได้เลย

หากระบบเดิมยังขึ้น `column profiles.access_mode does not exist` ให้รัน:

```text
RUN_THIS_SQL_FIX_ACCESS_MODE_ERROR.sql
```

## Environment Variables ใน Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

ห้ามใส่ `NEXT_PUBLIC_` หน้าตัว `SUPABASE_SERVICE_ROLE_KEY`

## คำสั่งตรวจสอบ

```bash
npm install
npm run check:production
npm run typecheck
npm run build
```
