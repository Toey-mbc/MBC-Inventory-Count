# คู่มือ Deploy MBC Inventory Count Online V2.0

## ระบบใหม่

1. สร้าง Supabase Project
2. รัน Migration 001, 002, 003 และ 004 ตามลำดับ
3. Authentication > Users > Add user
   - Email: `admin@mbc.internal`
   - Password: `Toey1234`
   - Auto Confirm User: เปิด
4. SQL Editor รัน:

```sql
select public.promote_first_admin('admin@mbc.internal');
```

5. เพิ่ม Environment Variables บน Vercel
6. Deploy
7. Login ด้วย `admin` / `Toey1234`
8. เปลี่ยนรหัสผ่านจากเมนูตั้งค่าระบบ

## ระบบเดิม

อ่าน `UPDATE_EXISTING_SYSTEM_TH.md` และรัน Migration 003 และ 004 ตามลำดับก่อนวาง Source Code ทับ

## Vercel Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Service Role Key เป็นความลับสูง ใช้เฉพาะ Server Route สำหรับจัดการบัญชีผู้ใช้
