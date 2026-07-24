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
- admin@mbc.local / Admin@2026
- warehouse@mbc.local / Ware@2026
- salesupport@mbc.local / Sale@2026
- counter01..04@mbc.local / Count@2026

เปลี่ยนรหัสผ่านก่อนใช้งานจริง

## วิธีทำงาน
แต่ละการยิงเรียก RPC `record_scan()` ฐานข้อมูลบันทึก Scan Event แบบ append-only และ trigger ปรับ `scan_totals` แบบ atomic ดังนั้นหลายเครื่องยิงพร้อมกันแล้วจำนวนไม่เขียนทับกัน รายการซ้ำป้องกันด้วย `client_event_id` แบบ UUID

## ล้างข้อมูลทดสอบ
SQL: `select public.reset_test_data();`
ฟังก์ชันนี้ลบข้อมูลรอบ/การยิง/ยอดรวม/unknown แต่เก็บ Products, Warehouses, Locations และ Users
