# Build Fix V1.6.2

## ปัญหาที่แก้
Vercel ล้มที่หน้า `app/audit/page.tsx` ด้วยข้อความว่า Page component คืนค่า `Element` ที่ไม่ใช่ `ReactNode`

สาเหตุจริงไม่ได้อยู่ที่หน้า Audit แต่เกิดจากไฟล์ทดสอบเก่า `typecheck-stubs.d.ts` ประกาศ `JSX.Element` และโมดูล `react` ทับ Type ของ React/Next.js จริง เมื่อ Next.js สร้างไฟล์ตรวจสอบ Route จึงมอง Page component เป็น Type คนละชุด

## การแก้ไข
- ลบ `typecheck-stubs.d.ts` ออกจากโปรเจกต์ส่งมอบ
- เพิ่มไฟล์ดังกล่าวใน `tsconfig.json > exclude`
- ให้ `scripts/prebuild-clean.mjs` ลบไฟล์ทดสอบเก่าก่อน Build ทุกครั้ง
- ล้าง `.next` และ `tsconfig.tsbuildinfo` ก่อน Build
- ไม่แก้หน้าตาและข้อมูลใน Supabase

## วิธีอัปเดต Repository เดิม
วางไฟล์ชุดนี้ทับ Repository แล้วตรวจสอบว่า Commit มีการลบ `typecheck-stubs.d.ts` ด้วย หากไฟล์ยังอยู่ใน GitHub ระบบ prebuild และ tsconfig จะป้องกันไม่ให้ไฟล์นั้นมีผลต่อ Build อยู่แล้ว

จากนั้นกด Redeploy โดยปิด Use existing Build Cache
