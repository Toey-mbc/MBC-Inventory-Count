# คู่มือ Deploy MBC Inventory Production 2.0.3

## A. อัปเดตจาก Production 2.0.2

1. แตก ZIP
2. เปิดโฟลเดอร์ `MBC_Inventory_Production_V2_0_3`
3. นำไฟล์และโฟลเดอร์ที่อยู่ภายในไปวางทับที่ Root ของ GitHub Repository
4. Commit และ Push
5. เข้า Vercel แล้ว Redeploy โดยปิด `Use existing Build Cache`
6. Login ด้วย Admin
7. เปิดเมนู `ระบบ > ตั้งค่าและผู้ใช้งาน`

รุ่นนี้ไม่เพิ่มคอลัมน์ฐานข้อมูลใหม่ จึงไม่ต้องรัน SQL เพิ่ม หากระบบ Production 2.0.2 ใช้งานได้อยู่แล้ว

## B. กรณียังพบ access_mode does not exist

1. เข้า Supabase Dashboard
2. เปิด SQL Editor
3. เปิดไฟล์ `RUN_THIS_SQL_FIX_ACCESS_MODE_ERROR.sql`
4. คัดลอก SQL ทั้งหมดแล้วกด Run
5. ผลสำเร็จควรเป็น `Success. No rows returned`
6. Redeploy Vercel อีกครั้ง

SQL จะไม่ลบสินค้า ผู้ใช้ รอบตรวจนับ หรือประวัติการยิงบาร์โค้ด

## C. ติดตั้ง Supabase ใหม่

รัน Migration ตามลำดับ:

```text
001_initial.sql
002_admin_user_management.sql
003_locations_management.sql
004_detailed_inventory_report.sql
005_report_schema_repair.sql
006_report_location_sku_drilldown.sql
007_production_workspace.sql
```

จากนั้นสร้าง Admin คนแรกใน Supabase Authentication:

```text
Email: admin@mbc.internal
Password: Toey1234
Auto Confirm User: เปิด
```

แล้วรัน:

```sql
select public.promote_first_admin('admin@mbc.internal');
```

หน้า Login ใช้:

```text
Username: admin
Password: Toey1234
```

## D. Environment Variables ใน Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## E. ตรวจหลัง Deploy

1. Admin เปิดหน้า `ตั้งค่าและผู้ใช้งาน` ได้
2. ผู้ใช้ทั่วไปเปิด URL `/settings` หรือ `/users` โดยตรงแล้วถูกส่งกลับหน้าระบบ
3. Admin เพิ่มผู้ใช้ใหม่ได้
4. Admin เปลี่ยนสิทธิ์อ่าน/แก้ไขได้
5. Admin แก้ชื่อ ตั้งรหัสผ่าน ระงับ และเปิดใช้งานบัญชีได้
6. ผู้ใช้สิทธิ์อ่านเปิดดูและ Export ได้ แต่แก้ไขไม่ได้
7. ผู้ใช้สิทธิ์แก้ไขสร้างรอบ ตรวจนับ และบันทึกได้
8. เมนูล้างข้อมูลเปิดใช้ได้เฉพาะ Admin
9. รายงานกรองแบรนด์ คลัง โลเคชั่น และ SKU ได้
