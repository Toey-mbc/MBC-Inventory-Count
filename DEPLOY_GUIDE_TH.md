# คู่มือ Deploy แบบฟรี: GitHub + Supabase + Vercel

## A. สร้าง Supabase
1. สมัครและสร้าง Project แบบ Free
2. ไปที่ SQL Editor > New query
3. เปิดไฟล์ `supabase/migrations/001_initial.sql` คัดลอกทั้งหมดและกด Run
4. ไปที่ Project Settings > API แล้วคัดลอก Project URL และ Publishable/Anon key
5. เปิด Authentication > Providers > Email และเปิด Email/Password

## B. สร้างบัญชีตัวอย่าง
ทำบนคอมพิวเตอร์ของผู้ Deploy เท่านั้น
1. ติดตั้ง Node.js 20 ขึ้นไป
2. คัดลอก `.env.example` เป็น `.env.local`
3. ใส่ Project URL, Publishable key และ Service Role key
4. เปิด Terminal ในโฟลเดอร์โปรเจกต์
5. รัน `npm install`
6. รันคำสั่งต่อไปนี้ใน PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="service-role-key"
npm run seed:users
```

บัญชีที่สร้าง:
- admin@mbc.local / Admin@2026
- warehouse@mbc.local / Ware@2026
- salesupport@mbc.local / Sale@2026
- counter01@mbc.local ถึง counter04@mbc.local / Count@2026

Service Role key ห้าม Commit ขึ้น GitHub และห้ามใส่เป็นตัวแปร `NEXT_PUBLIC_`

## C. อัปโหลด GitHub
1. สร้าง Private repository
2. อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดในโปรเจกต์ โดยไม่อัปโหลด `.env.local`
3. ตรวจว่า GitHub มี `package.json`, `app`, `components`, `lib`, `supabase`

## D. Deploy Vercel
1. New Project > Import Git Repository
2. Framework Preset เลือก Next.js
3. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. ไม่ต้องใส่ Service Role key ใน Vercel สำหรับรุ่นนี้
5. กด Deploy

## E. ทดสอบพร้อมกัน
1. Login คนละเครื่องด้วย Counter 01–04
2. Admin หรือ Warehouse Manager สร้างรอบและกดเริ่มนับ
3. ทุกเครื่องเลือกรอบและโลเคชั่น แล้วทดลองยิง SKU เดียวกัน
4. ตรวจยอดรวมและรายการล่าสุด
5. ทดสอบตัดอินเทอร์เน็ต: รายการจะเข้า Local Queue และกด “รอซิงก์” เมื่ออินเทอร์เน็ตกลับมา

## F. ล้างข้อมูล UAT
หลังทุกเครื่องซิงก์เป็น 0 แล้ว ให้ Admin เรียก RPC ผ่านแอปในรุ่นถัดไป หรือใช้ SQL Editor:

```sql
select public.reset_test_data();
```

ข้อมูลรอบทดสอบ การยิง ยอดรวม และ Unknown จะถูกลบจาก Cascade แต่ Product, Barcode, Warehouse, Location และ User จะยังอยู่
