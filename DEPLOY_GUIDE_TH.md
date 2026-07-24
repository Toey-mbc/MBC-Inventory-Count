# คู่มือ Deploy MBC Inventory Online V1.3

## 1. สร้าง Supabase Project

สร้าง Project แล้วเก็บค่าต่อไปนี้:

- Project URL
- Publishable Key หรือ Anon Key
- Service Role Key

Service Role Key เป็นความลับสูง ใช้เฉพาะ Environment Variables ฝั่ง Server ของ Vercel เท่านั้น

## 2. สร้างฐานข้อมูล

เข้า Supabase > SQL Editor แล้วรันตามลำดับ:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_admin_user_management.sql`

## 3. สร้าง Admin คนแรกใน Supabase

เข้า Supabase > Authentication > Users > Add user

กรอก:

```text
Email: admin@mbc.internal
Password: Toey1234
Auto Confirm User: เปิด
```

หลังสร้าง User แล้ว กลับไป SQL Editor และรัน:

```sql
select public.promote_first_admin('admin@mbc.internal');
```

คำสั่งนี้ใช้ได้เฉพาะตอนที่ระบบยังไม่มี Active Admin เพื่อป้องกันการยกระดับสิทธิ์โดยไม่ตั้งใจ

## 4. ตั้งค่า Vercel

เพิ่ม Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

ตั้งค่าครบแล้ว Redeploy

## 5. Login

หน้า Login กรอก:

```text
Username: admin
Password: Toey1234
```

ไม่ต้องกรอก `@mbc.internal`

## 6. เพิ่มผู้ใช้งานอื่น

หลัง Admin Login:

1. เปิดเมนู **ผู้ใช้งาน**
2. กดเพิ่มผู้ใช้งาน
3. กรอก Username, ชื่อ, Role และรหัสผ่านชั่วคราว
4. กดบันทึก

ผู้ใช้ใหม่ Login ได้ทันที โดยไม่ต้องเข้า Supabase Dashboard

กรณีใช้รหัสชั่วคราว `1234` ระบบจะจัดเก็บเป็นรหัสภายในที่ผ่านข้อกำหนดของ Supabase แต่หน้า Login ยังคงใช้ `1234`

## 7. การตั้งค่า Role

- Admin: สิทธิ์สูงสุด
- Warehouse Manager: จัดการคลังและรอบตรวจนับ
- Sale Support: สิทธิ์เท่ากับ Warehouse Manager
- Counter: ตรวจนับสินค้า
- Viewer: อ่านอย่างเดียว

## 8. ข้อควรระวัง

- ห้ามใส่ Service Role Key ใน GitHub
- ห้ามตั้งชื่อตัวแปรเป็น `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- ไฟล์ `.env.local` ต้องไม่ถูก Commit
- ควรเปลี่ยนรหัสผ่านชั่วคราวก่อนใช้งาน Production
