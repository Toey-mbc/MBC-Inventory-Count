# Checklist ก่อนวางทับระบบออนไลน์

## สำรอง

- [ ] สร้าง Git Branch หรือดาวน์โหลด ZIP ของโค้ดเดิม
- [ ] ตรวจสอบ Supabase Backup ล่าสุด
- [ ] Export ตารางสินค้า คลัง โลเคชั่น รอบนับ และ Scan Events
- [ ] เก็บค่า Environment Variables เดิมไว้ในที่ปลอดภัย

## ฐานข้อมูล

- [ ] รัน `003_extend_enums.sql` ใน SQL Editor และรอให้สำเร็จ
- [ ] เปิด Query ใหม่ แล้วรัน `004_inventory_operations_upgrade.sql`
- [ ] รัน `supabase/verify_v2.sql`
- [ ] ตรวจว่ารายการ Object ทุกแถวมีชื่อในคอลัมน์ `installed`
- [ ] ตรวจว่ามีสถานะ `cancelled` และสภาพสินค้าใหม่ครบ

## Vercel

- [ ] มี `NEXT_PUBLIC_SUPABASE_URL`
- [ ] มี `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] มี `SUPABASE_SERVICE_ROLE_KEY` และไม่ได้ตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`
- [ ] คัดลอก Source Code V2 ไปทับ Repository เดิม โดยไม่คัดลอก `.env.local`
- [ ] Commit และ Push ไป Branch ที่ Vercel Deploy
- [ ] ตรวจ Build Log จน Deploy สำเร็จ

## ทดสอบหลัง Deploy

- [ ] Login ด้วย Admin เดิม
- [ ] เปลี่ยนรหัสผ่าน Admin ก่อนใช้งานจริง
- [ ] เปิดหน้าสินค้า คลัง/โลเคชั่น รอบนับ ผลต่าง และรายงานได้
- [ ] สร้างรอบประเภท “ทดสอบระบบ”
- [ ] เริ่มรอบและตรวจว่ามี Snapshot
- [ ] ยิงบาร์โค้ดซ้ำแล้วจำนวนเพิ่มถูกต้อง
- [ ] ยิง QR โลเคชั่นแล้วพื้นที่เปลี่ยนถูกต้อง
- [ ] ปิดอินเทอร์เน็ต ยิงสินค้า แล้วเปิดอินเทอร์เน็ตเพื่อซิงก์ Offline Queue
- [ ] ส่งตรวจ อนุมัติ และทดลองปรับยอดกับข้อมูลทดสอบ
- [ ] ตรวจรายงานแยกแบรนด์ โลเคชั่น และสภาพสินค้า
