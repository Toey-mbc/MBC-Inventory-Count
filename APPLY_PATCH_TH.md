# MBC Inventory Build Repair V1.5.5

ชุดนี้เป็น **Patch สำหรับ Repository ปัจจุบัน** ไม่ใช่โปรเจกต์ใหม่ จึงไม่เขียนทับ UI, CSS, Legacy Workspace หรือ SQL ที่มีอยู่

## สิ่งที่แก้

1. แก้ `app/locations/page.tsx`
   - แยก Type ของฟอร์มออกจาก Type ของข้อมูลฐานข้อมูล
   - แปลง `null` และ `undefined` เป็นข้อความว่างก่อนใส่ State
   - แก้ Error `description is not assignable to string`
   - ป้องกัน Error ถัดไปจาก `zone`, `notes`, `scan_code`, `default_condition`

2. แก้ `lib/types.ts`
   - เพิ่ม `Product`
   - เพิ่มข้อมูล `Location` ที่หน้า Locations และ Variance ใช้งานจริง
   - เพิ่ม Stock Condition ทุกค่าที่ประกาศใน `lib/constants.ts`

3. แก้ `app/variance/page.tsx`, `lib/constants.ts`, `lib/export.ts`, `lib/useProfile.ts`
   - ป้องกัน TypeScript Error ที่จะเกิดหลังแก้ Locations แล้ว

4. เพิ่ม `scripts/prebuild-clean.mjs`
   - ลบ `tsconfig.tsbuildinfo` เก่าอัตโนมัติ
   - ถ้า Repository ยังมีทั้ง `next.config.mjs` และ `next.config.ts` ระบบจะลบไฟล์ `.ts` ในขั้น Build อัตโนมัติ

5. ปรับ `package.json`
   - เพิ่ม `prebuild`
   - ล็อกเวอร์ชัน Dependency ไม่ให้เปลี่ยนเองระหว่าง Deploy

## วิธีวางไฟล์

1. แตก ZIP
2. เปิดโฟลเดอร์ `MBC_Inventory_Build_Repair_V1_5_5`
3. นำ **ไฟล์และโฟลเดอร์ด้านใน** วางทับที่ Root ของ Repository เดิม
4. ต้องเห็นไฟล์เหล่านี้ใน GitHub:
   - `app/locations/page.tsx`
   - `app/variance/page.tsx`
   - `lib/types.ts`
   - `lib/constants.ts`
   - `lib/export.ts`
   - `lib/useProfile.ts`
   - `scripts/prebuild-clean.mjs`
   - `package.json`
5. Commit และ Push
6. เข้า Vercel แล้ว Redeploy โดยไม่ใช้ Build Cache

## Log ที่ควรเห็น

ก่อน Next.js Build จะมีข้อความประมาณนี้:

```text
> prebuild
> node scripts/prebuild-clean.mjs
[prebuild] removed tsconfig.tsbuildinfo
[prebuild] removed next.config.ts
```

ถ้าไม่มีไฟล์เก่า บรรทัด removed บางรายการอาจไม่แสดง ซึ่งเป็นปกติ

## ไม่ต้องทำ

- ไม่ต้องรัน SQL ใหม่สำหรับ Error รอบนี้
- ไม่ต้องสร้าง Supabase Project ใหม่
- ไม่ต้องแก้ Environment Variables ถ้าก่อนหน้านี้ตั้งครบแล้ว
- ไม่ต้องลบ UI หรือ Legacy Workspace เดิม
