# วิธีอัปเดตระบบออนไลน์เดิมเป็น V2.0

เอกสารนี้ใช้สำหรับระบบที่มี GitHub + Vercel + Supabase อยู่แล้ว และต้องการนำไฟล์ชุดใหม่วางทับโดยไม่ล้างข้อมูลเดิม

## 1. สำรองก่อนอัปเดต

1. ดาวน์โหลดหรือสร้าง Branch สำรองของ Source Code เดิม
2. Supabase > Database > Backups ตรวจสอบว่ามี Backup ล่าสุด
3. Export ตารางสำคัญอย่างน้อย `products`, `product_barcodes`, `warehouses`, `locations`, `count_rounds`, `scan_events` และ `scan_totals`
4. ห้ามลบ Supabase Project เดิม

## 2. อัปเกรดฐานข้อมูล

เปิด Supabase > SQL Editor แล้วรันแยกกันตามลำดับ:

```text
1. supabase/migrations/003_extend_enums.sql
2. supabase/migrations/004_inventory_operations_upgrade.sql
```

ต้องกด Run ไฟล์ 003 ให้สำเร็จก่อน แล้วจึงเปิด Query ใหม่เพื่อรันไฟล์ 004 เนื่องจาก PostgreSQL ต้อง Commit ค่า Enum ใหม่ก่อนนำไปใช้งาน Migration ทั้งสองออกแบบให้เพิ่มตารางและคอลัมน์ต่อจากของเดิม โดยไม่ลบสินค้า ผู้ใช้ หรือประวัติการนับเดิม

หลังจากรันสำเร็จ ให้รัน `supabase/verify_v2.sql` เพื่อตรวจว่าตาราง View Enum และ RPC สำคัญติดตั้งครบ

สิ่งที่เพิ่ม ได้แก่:

- รายละเอียดแบรนด์ หมวดหมู่ หน่วย ต้นทุน และรูปสินค้า
- สภาพสินค้าเพิ่มเติม
- ยอดตามระบบ `inventory_balances`
- Snapshot รอบตรวจนับ `round_snapshots`
- รายการปรับสต๊อก `stock_adjustments`
- QR/รหัสสแกนโลเคชั่น
- Views สำหรับผลต่างและความคืบหน้า
- ขั้นตอนอนุมัติก่อนปรับยอดจริง

## 3. วาง Source Code ทับของเดิม

วิธีแนะนำ:

1. แตก ZIP ชุด V2.0
2. คัดลอกไฟล์ทั้งหมดในโฟลเดอร์ `MBC-Inventory-Count-V2` ไปทับ Repository เดิม
3. ไม่ต้องนำไฟล์ `.env.local` ขึ้น GitHub
4. ตรวจว่า Environment Variables เดิมใน Vercel ยังอยู่ครบ
5. Commit และ Push ไป Branch ที่ Vercel ใช้ Deploy

## 4. Environment Variables ที่ต้องมี

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

หากของเดิมใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ให้เพิ่มตัวแปรชื่อ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ด้วยค่าของ Publishable/Anon Key เดิม

## 5. หลัง Deploy

1. เข้า Login ด้วย Username `admin`
2. ใช้รหัสผ่านเดิมของ Admin; ค่าเริ่มต้นของชุดเดิมคือ `Toey1234`
3. เปิดเมนู **ตั้งค่าระบบ** แล้วเปลี่ยนรหัสผ่าน
4. เปิดเมนู **คลังและโลเคชั่น** ตรวจชื่อคลังและสร้างโลเคชั่น เช่น ของปกติ กล่องบุบ เคลม
5. เปิดเมนู **สินค้า** นำเข้า Product Master และตั้งยอดตามระบบ
6. สร้างรอบทดสอบโดยเลือกประเภท “ทดสอบระบบ”
7. ยิงบาร์โค้ดอย่างน้อย 3–5 รายการ ตรวจผลต่างและรายงาน
8. ทดสอบอนุมัติและปรับยอดก่อนสร้างรอบใช้งานจริง

## 6. ข้อควรระวัง

- ต้องรัน Migration 003 และ 004 ก่อน Deploy Source Code V2.0 ไม่เช่นนั้นหน้าใหม่จะเรียกตารางที่ยังไม่มี
- ห้ามเปิดเผย `SUPABASE_SERVICE_ROLE_KEY`
- รอบที่เริ่มนับแล้วจะเก็บ Snapshot ยอดตามระบบ ณ เวลานั้น
- การกด “อนุมัติ” ยังไม่ปรับยอดจริง ระบบจะสร้างรายการปรับสต๊อกก่อน
- การกด “ปรับยอดสต๊อก” หลังอนุมัติจึงเปลี่ยน `inventory_balances`
- บาร์โค้ดที่ไม่พบและผูกภายหลัง ต้องยิงหรือนับสินค้าใหม่ รายการเดิมจะไม่ถูกย้ายอัตโนมัติเพื่อรักษา Audit Trail
