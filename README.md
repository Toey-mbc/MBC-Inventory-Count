# MBC Inventory Online V1.3

ระบบตรวจนับสินค้าออนไลน์สำหรับ GitHub + Vercel + Supabase

## แนวทาง User ใหม่

ระบบไม่มี Demo User หลายบัญชีแล้ว ให้สร้างเพียง Admin คนแรกใน Supabase จากนั้น Admin เพิ่มผู้ใช้งานอื่นจากเมนู **ผู้ใช้งาน** ในระบบได้ทันที

บัญชี Admin ที่แนะนำ:

- Email ใน Supabase Auth: `admin@mbc.internal`
- Username ที่ใช้หน้า Login: `admin`
- Password: `Toey1234`

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะ Server API สำหรับจัดการผู้ใช้ ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_` และห้ามนำไปใช้ใน Client Component

## ติดตั้ง

```bash
npm install
npm run dev
```

## Database

รัน SQL ตามลำดับ:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_admin_user_management.sql`

จากนั้นสร้าง Admin คนแรกตาม `DEPLOY_GUIDE_TH.md`

## Role

- Admin: จัดการทั้งหมดและจัดการผู้ใช้
- Warehouse Manager: จัดการรอบตรวจนับ Master และอนุมัติ
- Sale Support: สิทธิ์เท่ากับ Warehouse Manager
- Counter: ยิงบาร์โค้ดและจัดการรายการของตนเอง
- Viewer: ดูข้อมูลอย่างเดียว

## การเพิ่มผู้ใช้ภายหลัง

Admin Login แล้วไปที่เมนู **ผู้ใช้งาน** สามารถ:

- เพิ่มผู้ใช้
- เลือก Role
- Reset Password
- ระงับ/เปิดใช้งานบัญชี

ไม่ต้องสร้างผู้ใช้ทีละคนใน Supabase Dashboard
