# คู่มือ Deploy MBC Inventory Production 2.0.2

## A. แก้ระบบเดิมที่ขึ้น access_mode does not exist

1. เข้า Supabase Dashboard
2. เปิด SQL Editor
3. เปิดไฟล์ `RUN_THIS_SQL_FIX_ACCESS_MODE_ERROR.sql`
4. คัดลอก SQL ทั้งหมดแล้วกด Run
5. ผลสำเร็จควรเป็น `Success. No rows returned`
6. นำไฟล์โปรเจกต์ชุดนี้วางทับที่ Root ของ GitHub Repository
7. Commit และ Push
8. เข้า Vercel แล้ว Redeploy โดยปิด `Use existing Build Cache`

SQL จะไม่ลบสินค้า ผู้ใช้ รอบตรวจนับ หรือประวัติการยิงบาร์โค้ด

## B. ติดตั้ง Supabase ใหม่

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

## C. Environment Variables ใน Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## D. ตรวจหลัง Deploy

1. Admin Login ได้
2. เปิดหน้าผู้ใช้งานและกำหนดสิทธิ์อ่าน/แก้ไขได้
3. ผู้ใช้สิทธิ์อ่านเปิดดูและ Export ได้ แต่แก้ไขไม่ได้
4. ผู้ใช้สิทธิ์แก้ไขสร้างรอบ ตรวจนับ และบันทึกได้
5. เมนูล้างข้อมูลเปิดใช้ได้เฉพาะ Admin
6. สร้างรอบแบบใช้ข้อมูลตั้งต้นจากระบบได้
7. สร้างรอบแบบ Import Excel/CSV และ Preview ได้
8. รายงานกรองแบรนด์ คลัง โลเคชั่น และ SKU ได้
