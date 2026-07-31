# MBC Inventory Production 2.0.2

ระบบตรวจนับสินค้าสำหรับใช้งานจริงบน Next.js, Vercel และ Supabase

## สิ่งที่แก้ในรุ่นนี้

- แก้ปัญหา `column profiles.access_mode does not exist`
- ยกเลิกการพึ่งพาคอลัมน์ `profiles.access_mode` ทั้งฝั่งเว็บและฐานข้อมูล
- ใช้ `profiles.role` ที่มีอยู่เดิมสำหรับสิทธิ์ 3 ระดับ
  - `viewer` = อ่าน
  - `counter`, `warehouse_manager`, `sale_support` = แก้ไข
  - `admin` = ผู้ดูแลระบบ
- Admin ยังคงเลือกสิทธิ์ “อ่าน / แก้ไข” จากหน้าผู้ใช้งานได้ตามเดิม
- ไม่มีการบังคับเปลี่ยนรหัสผ่านครั้งแรก
- คงเมนูล้างข้อมูลสำหรับ Admin เท่านั้น
- คงการสร้างรอบตรวจนับแบบเลือกข้อมูลตั้งต้นจากระบบหรือ Import Excel/CSV
- คงรายงาน Barcode, SKU, แบรนด์, ชื่อสินค้า, Description, คลัง, โลเคชั่น และจำนวน

## อัปเดตฐานข้อมูลเดิม

รันไฟล์นี้ใน Supabase SQL Editor:

```text
RUN_THIS_SQL_FIX_ACCESS_MODE_ERROR.sql
```

ไฟล์รันซ้ำได้ และไม่ลบข้อมูลตรวจนับเดิม

## ติดตั้งฐานข้อมูลใหม่

รันไฟล์ใน `supabase/migrations` ตามลำดับ `001` ถึง `007`

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
