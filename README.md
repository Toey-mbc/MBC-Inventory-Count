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

## V1.6.4 — Product-first Report

หน้า **รายงาน** ภายใน Workspace ได้รับการออกแบบใหม่ให้เห็นข้อมูลสำคัญในตารางเดียว ได้แก่ Barcode, SKU, ชื่อสินค้า, รายละเอียด, คลัง, โลเคชั่น, สภาพสินค้า, จำนวนตามระบบ, จำนวนที่นับได้ และผลต่าง

มุมมองรายงาน:

- รายละเอียดสินค้า
- SKU × คลัง
- สรุปตามคลัง
- สินค้าขาด / เกิน
- สินค้ายังไม่ได้นับ
- ประวัติรอบตรวจนับ

มีตัวกรองรอบตรวจนับ คลัง โลเคชั่น สภาพสินค้า การเรียงข้อมูล และค้นหาจาก Barcode / SKU / ชื่อ / รายละเอียด / คลัง พร้อมส่งออก Excel ตามเงื่อนไขที่เลือก

การอัปเดตนี้แก้เฉพาะหน้า Workspace และ **ไม่ต้องรัน SQL เพิ่ม**

## Update V1.6.5

หน้า Reports เพิ่มตัวกรองแบรนด์ คอลัมน์แบรนด์ KPI แบรนด์ การเรียงตามแบรนด์ และส่งออกแบรนด์ใน Excel โดยไม่ต้องรัน SQL เพิ่ม
