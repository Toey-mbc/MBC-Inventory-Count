# MBC Inventory Count Online V2.0

ระบบตรวจนับสินค้าคงคลังออนไลน์สำหรับปืนยิงบาร์โค้ด พัฒนาด้วย Next.js + Supabase และรองรับ Deploy บน Vercel

## ฟังก์ชันหลัก

- Dashboard ความคืบหน้าและผลต่างแบบออนไลน์
- ยิงบาร์โค้ด USB/Bluetooth และรวมจำนวนอัตโนมัติ
- Offline Queue เมื่ออินเทอร์เน็ตขัดข้อง
- แยกสินค้าเป็น คลัง + โลเคชั่น + สภาพสินค้า
- สภาพสินค้า: ปกติ กล่องบุบ มีตำหนิ รอตรวจ เคลม ซ่อมแล้ว ของแถม และตัดจำหน่าย
- QR Code ประจำโลเคชั่น ยิงเพื่อเปลี่ยนพื้นที่นับ
- Product Master: SKU, บาร์โค้ด, แบรนด์, หมวดหมู่, หน่วย, ต้นทุน, รูป และหมายเหตุ
- นำเข้า/ส่งออก Excel และ CSV
- ยอดตามระบบแยกโลเคชั่นและสภาพสินค้า
- Workflow: แบบร่าง → กำลังนับ → รอตรวจสอบ → อนุมัติ → ปรับยอด
- Snapshot ยอดเดิมเมื่อเริ่มรอบ ป้องกันยอดเทียบเปลี่ยนระหว่างนับ
- รายงานแยกแบรนด์ คลัง/โลเคชั่น สภาพสินค้า และรายการขาด/เกิน
- จัดการบาร์โค้ดไม่พบและผูกกับสินค้า
- ผู้ใช้งานหลายบทบาทและ Audit Log

## Admin เริ่มต้น

- Username: `admin`
- Supabase Auth Email: `admin@mbc.internal`
- Password เริ่มต้น: `Toey1234`

ควรเปลี่ยนรหัสผ่านจากเมนู **ตั้งค่าระบบ** ทันทีหลังตรวจสอบการ Deploy สำเร็จ

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะ Server API ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`

## ติดตั้งในเครื่อง

```bash
npm install
npm run dev
```

## Database ใหม่

รัน SQL ตามลำดับ:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_admin_user_management.sql`
3. `supabase/migrations/003_extend_enums.sql`
4. `supabase/migrations/004_inventory_operations_upgrade.sql`

## อัปเดตระบบเดิม

ระบบที่ออนไลน์อยู่และรัน Migration 001–002 แล้ว ให้รันตามลำดับ:

```text
supabase/migrations/003_extend_enums.sql
supabase/migrations/004_inventory_operations_upgrade.sql
```

จากนั้นจึงนำ Source Code V2.0 ขึ้น GitHub/Vercel ดูรายละเอียดใน `UPDATE_EXISTING_SYSTEM_TH.md`

## สิทธิ์

- Admin: ทุกเมนู รวมผู้ใช้และตั้งค่าระบบ
- Warehouse Manager: สินค้า คลัง รอบนับ ผลต่าง และรายงาน
- Sale Support: สิทธิ์บริหารงานคลังตามที่ระบบเดิมกำหนด
- Counter: หน้าตรวจนับและดูรอบนับ
- Viewer: อ่าน Dashboard รายงาน และ Master Data

## เอกสารประกอบ

- `UPDATE_EXISTING_SYSTEM_TH.md` วิธีวางทับระบบออนไลน์เดิม
- `DEPLOY_GUIDE_TH.md` วิธีติดตั้งระบบใหม่
- `PRE_DEPLOY_CHECKLIST_TH.md` Checklist ก่อนและหลัง Deploy
- `supabase/verify_v2.sql` ตรวจสอบฐานข้อมูลหลัง Migration
