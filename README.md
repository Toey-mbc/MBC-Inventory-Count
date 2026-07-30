# MBC Inventory Online V1.6.3

เวอร์ชันนี้คงหน้า Login เดิม และนำหน้าระบบภายในฉบับเต็มจาก `MBC Inventory Count UAT V7.2` กลับมาใช้งานทั้งหมด แทนหน้าตัวอย่าง/Placeholder ของ V1.4

## จุดสำคัญ
- Login ผ่าน Supabase Auth
- หลัง Login เข้าหน้า `/workspace`
- ภายในเป็น UI ฉบับเต็ม: Dashboard, รอบตรวจนับ, ยิงบาร์โค้ด, ผลตรวจนับ, Unknown Barcode, โอนย้าย, Stock, Product, Master Data, Users, Reports, Audit, Backup และ Settings
- Responsive Desktop/Tablet/Mobile ตาม HTML V7.2
- ปุ่มออกจากระบบเชื่อมกลับไป Supabase Auth

## หมายเหตุด้านข้อมูล
หน้าภายในฉบับเต็มยังใช้ IndexedDB/localStorage ตามระบบ UAT เดิม เพื่อให้ฟังก์ชันครบและไม่หายไปเหมือน V1.4 ส่วนการย้ายข้อมูลทุกโมดูลให้ใช้ Supabase Realtime ต้องทำเป็นขั้นถัดไปโดยเปลี่ยน data adapter ทีละโมดูล โดยไม่เปลี่ยนหน้าตาและ workflow นี้

## V1.5.1 Build Fix

- Removed the unused `@supabase/ssr` dependency.
- Browser authentication now uses `@supabase/supabase-js` directly.
- Restored the local `createClient()` export used by all pages and components.
- Replaced `next.config.ts` with `next.config.mjs` for simpler Vercel builds.


## รายงานแบบละเอียด V1.6.1

หน้า **รายงาน** รองรับการดูข้อมูลระดับ `รอบตรวจนับ → คลัง → โลเคชั่น → SKU → สภาพสินค้า` พร้อมสรุปตาม SKU, สรุปตามโลเคชั่น, Drill-down และส่งออก Excel 4 Sheet

หลัง SQL เดิม ให้รันเพิ่มเติม:

```text
supabase/migrations/004_detailed_inventory_report.sql
```


## V1.6.1 - Report schema repair

If Supabase shows `column locations.zone does not exist`, run `RUN_THIS_SQL_V1_6_1.sql` in SQL Editor. The script adds the missing location fields and recreates `inventory_count_report`. It is idempotent and can be run more than once.


## V1.6.2 - Vercel page type build fix

แก้ Build Error ที่รายงานว่า `app/audit/page.tsx` คืนค่า `Element` ไม่ตรงกับ `ReactNode` โดยตัดไฟล์ TypeScript stub เก่าที่ประกาศชนกับ React/Next.js จริง และเพิ่มการป้องกันทั้งใน `tsconfig.json` และ `scripts/prebuild-clean.mjs` เพื่อให้การวางไฟล์ทับ Repository เดิมไม่ทำให้ Error กลับมาอีก

## V1.6.3 — รายงาน SKU × Location

หน้า Reports มีรายละเอียดระดับรอบตรวจนับ → คลัง → โลเคชั่น → SKU → สภาพสินค้า พร้อมมุมมองเจาะลึก Location → SKU และส่งออก Excel หลาย Sheet ดูรายละเอียดใน `REPORT_V1_6_3_TH.md`.
