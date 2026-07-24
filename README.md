# MBC Inventory Count Online

ระบบตรวจนับสินค้าออนไลน์แบบ Realtime สำหรับ MBC Communications

## Stack
- Next.js App Router
- Supabase Auth + PostgreSQL + Realtime
- Vercel

## ติดตั้ง
1. สร้าง Supabase Free project
2. เปิด SQL Editor แล้วรันไฟล์ `supabase/migrations/001_initial.sql`
3. คัดลอก `.env.example` เป็น `.env.local` และกรอก URL/Publishable key
4. สำหรับสร้าง Demo users ให้ใส่ Service Role key เฉพาะในเครื่อง แล้วรัน `npm run seed:users`
5. รัน `npm install` และ `npm run dev`

## Deploy Vercel
1. อัปโหลดโฟลเดอร์นี้ขึ้น GitHub
2. Import repository ใน Vercel
3. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

ห้ามนำ `SUPABASE_SERVICE_ROLE_KEY` ใส่ตัวแปรที่ขึ้นต้น `NEXT_PUBLIC_` และไม่จำเป็นต้องใส่ใน Vercel สำหรับระบบรุ่นนี้

## บัญชีทดสอบ
- admin / Toey1234
- warehouse / 1234
- salesupport / 1234
- counter01 ถึง counter04 / 1234

เปลี่ยนรหัสผ่านก่อนใช้งานจริง

## วิธีทำงาน
แต่ละการยิงเรียก RPC `record_scan()` ฐานข้อมูลบันทึก Scan Event แบบ append-only และ trigger ปรับ `scan_totals` แบบ atomic ดังนั้นหลายเครื่องยิงพร้อมกันแล้วจำนวนไม่เขียนทับกัน รายการซ้ำป้องกันด้วย `client_event_id` แบบ UUID

## ล้างข้อมูลทดสอบ
SQL: `select public.reset_test_data();`
ฟังก์ชันนี้ลบข้อมูลรอบ/การยิง/ยอดรวม/unknown แต่เก็บ Products, Warehouses, Locations และ Users


## การเข้าสู่ระบบแบบ Username
ผู้ใช้กรอกเฉพาะชื่อ เช่น `admin` หรือ `counter01` โดยระบบจะแปลงเป็นอีเมลภายในให้อัตโนมัติ ผู้ใช้ไม่ต้องพิมพ์โดเมนใด ๆ

> รหัสผ่าน `1234` เป็นรหัสชั่วคราวสำหรับ UAT เท่านั้น ก่อนรันสคริปต์สร้างผู้ใช้ ให้ตั้งค่า Minimum password length ใน Supabase Auth ให้รองรับ 4 ตัวอักษร และบังคับให้ผู้ใช้เปลี่ยนรหัสหลังเข้าสู่ระบบครั้งแรก
