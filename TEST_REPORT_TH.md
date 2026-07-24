# รายงานตรวจสอบชุด Source Code V2.0

## ผ่านการตรวจสอบ

- ตรวจไวยากรณ์ไฟล์ TypeScript/TSX ทุกไฟล์
- ตรวจความสอดคล้องของ Route, Component และไฟล์ตั้งค่า
- ตรวจชื่อ RPC ที่หน้าเว็บเรียกกับ Migration
- ตรวจว่า Offline Queue ส่งเฉพาะ Parameter ที่ RPC รองรับ
- ตรวจ Workflow Snapshot → Review → Approve → Apply Adjustment
- ตรวจสิทธิ์ Admin และการป้องกันข้าม Workflow
- ตรวจว่าไม่มีข้อมูลตัวอย่างหรือชื่อแบรนด์ที่ไม่เกี่ยวข้องตามขอบเขตงาน
- ตรวจ JSON และ JavaScript Utility Scripts
- ตรวจโครงสร้าง SQL และคู่ Dollar Quote ของ Migration

## ต้องตรวจบนระบบจริงหลัง Deploy

สภาพแวดล้อมที่ใช้จัดเตรียม ZIP ไม่สามารถเชื่อมต่อ npm registry ได้ภายในเวลาที่กำหนด จึงยังไม่ได้รัน `npm install` และ `npm run build` กับ Dependency จริง ให้ตรวจ Build Log บน Vercel ตาม Checklist หาก Vercel ติดตั้ง Dependency สำเร็จ ระบบจะ Build จาก `package.json` โดยตรง

การเชื่อมต่อ Supabase, RLS, Realtime และการยิงปืนบาร์โค้ดจริงต้องทดสอบกับ Project และอุปกรณ์ของระบบออนไลน์ตาม `PRE_DEPLOY_CHECKLIST_TH.md`
