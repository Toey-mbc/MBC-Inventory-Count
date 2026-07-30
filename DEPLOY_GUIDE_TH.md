# คู่มือติดตั้ง MBC Inventory Count

## 1. สำรองข้อมูลก่อนอัปเกรด

ก่อนเปลี่ยนไฟล์หรือรัน SQL ให้เข้าสู่ระบบด้วย Admin แล้วเปิด:

**จัดการข้อมูล → ดาวน์โหลด Backup JSON**

เก็บไฟล์ไว้จนกว่าจะตรวจสอบระบบหลัง Deploy เสร็จ

## 2. อัปเกรดฐานข้อมูล Supabase

### กรณีมีฐานข้อมูลเดิมอยู่แล้ว

1. เข้า Supabase Dashboard
2. เปิด **SQL Editor**
3. เปิดไฟล์ `RUN_THIS_SQL_PRODUCTION_UPGRADE.sql`
4. คัดลอก SQL ทั้งหมดไปวาง
5. กด **Run**

SQL ชุดนี้จะเพิ่ม:

- สิทธิ์ `read` และ `edit`
- Shared Workspace State
- Append-only Scan Event
- ข้อมูลตั้งต้นของรอบตรวจนับ
- RLS และฟังก์ชันตรวจสิทธิ์
- Realtime สำหรับ Workspace และ Scan Event

SQL สามารถรันซ้ำได้ และไม่ลบสินค้า ยอดสต๊อก รอบตรวจนับ หรือบัญชีผู้ใช้เดิม

### กรณีสร้าง Supabase Project ใหม่

รันไฟล์ในโฟลเดอร์ `supabase/migrations` ตามลำดับ:

1. `001_initial.sql`
2. `002_admin_user_management.sql`
3. `003_locations_management.sql`
4. `004_detailed_inventory_report.sql`
5. `005_report_schema_repair.sql`
6. `006_report_location_sku_drilldown.sql`
7. `007_production_workspace.sql`

## 3. สร้าง Admin คนแรก

เข้า **Supabase → Authentication → Users → Add user**

```text
Email: admin@mbc.internal
Password: Toey1234
Auto Confirm User: เปิด
```

จากนั้นเปิด SQL Editor แล้วรัน:

```sql
select public.promote_first_admin('admin@mbc.internal');
```

หน้า Login ใช้:

```text
Username: admin
Password: Toey1234
```

ผู้ใช้งานอื่นเพิ่มจากหน้า **ผู้ใช้งานและสิทธิ์** ภายในระบบ ไม่ต้องเพิ่มทีละคนใน Supabase

## 4. อัปโหลดขึ้น GitHub

นำไฟล์ทั้งหมดภายในโฟลเดอร์โปรเจกต์วางไว้ที่ Root ของ Repository โดยต้องเห็นไฟล์เหล่านี้ที่หน้าแรกของ Repository:

```text
app/
components/
legacy/
lib/
scripts/
supabase/
package.json
next.config.mjs
tsconfig.json
vercel.json
```

ห้ามมีไฟล์เก่าต่อไปนี้:

```text
next.config.ts
typecheck-stubs.d.ts
tsconfig.internal.json
```

## 5. ตั้งค่า Vercel

เชื่อม GitHub Repository กับ Vercel และกำหนด:

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
```

เพิ่ม Environment Variables ใน **Production, Preview และ Development**:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

จากนั้น Deploy โดยไม่ใช้ Build Cache ในรอบแรก

## 6. เพิ่มผู้ใช้งาน

Admin เปิด **ผู้ใช้งานและสิทธิ์ → เพิ่มผู้ใช้งาน** แล้วกรอก:

- Username
- ชื่อ-นามสกุล
- สิทธิ์อ่านหรือแก้ไข
- รหัสผ่านชั่วคราว

กรณีใช้รหัสผ่านชั่วคราว `1234` ระบบจะแปลงเป็นรหัสภายในที่ Supabase ยอมรับ ผู้ใช้ยัง Login ด้วย `1234` และระบบบังคับให้เปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก

## 7. สร้างรอบตรวจนับ

เปิด **รอบตรวจนับ → สร้างรอบตรวจนับ** แล้วเลือกวิธีข้อมูลตั้งต้น

### ใช้ข้อมูลปัจจุบันจากระบบ

ระบบจะล็อกยอดสินค้าคงคลังของคลังที่เลือก ณ เวลาบันทึกรอบ ยอดที่เปลี่ยนภายหลังจะไม่ย้อนมาเปลี่ยนข้อมูลตั้งต้นของรอบ

### นำเข้าข้อมูลตั้งต้นเอง

1. เลือกคลังที่ต้องการตรวจนับ
2. เลือก **นำเข้าข้อมูลตั้งต้นเอง**
3. ดาวน์โหลดแบบฟอร์ม
4. เตรียม Excel/CSV
5. เลือกไฟล์
6. ตรวจตัวอย่างและยอดรวม
7. บันทึกรอบ

คอลัมน์ที่รองรับ:

| คอลัมน์ | รายละเอียด |
|---|---|
| Barcode หรือ SKU | ต้องตรงกับ Product Master |
| Warehouse Code | ต้องเป็นคลังที่ถูกเลือกในรอบ |
| Location Code | ต้องอยู่ในคลังที่ระบุ |
| Condition | ต้องตรงกับข้อมูลสภาพสินค้า |
| Quantity | จำนวนเต็มตั้งแต่ 0 ขึ้นไป |

ระบบจะไม่ยอมบันทึกหากพบสินค้า คลัง โลเคชั่น สภาพ หรือจำนวนที่ไม่ถูกต้อง

## 8. เมนูล้างข้อมูลสำหรับ Admin

เปิด **จัดการข้อมูล → ล้างข้อมูลระบบ**

- **ล้างข้อมูลตรวจนับ** เก็บ Product Master, คลัง และโลเคชั่น
- **ล้างข้อมูลธุรกรรม** เก็บ Master Data และผู้ใช้งาน
- **ล้างข้อมูลทั้งหมด** เก็บบัญชีผู้ใช้, Audit Log และการตั้งค่าระบบ

ทุกคำสั่งต้องพิมพ์ข้อความยืนยันและถูกบันทึกลง Audit Log

## 9. ตรวจสอบหลัง Deploy

ใช้รายการใน `PRODUCTION_CHECKLIST_TH.md` ตรวจสอบก่อนเริ่มตรวจนับจริง
