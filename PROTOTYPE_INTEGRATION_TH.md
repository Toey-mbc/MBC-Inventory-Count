# การนำ HTML Prototype มาใช้ในระบบออนไลน์ V2.1.0

เวอร์ชันนี้นำแนวทางหน้าตาและโครงสร้างจาก `MBC_Inventory_Count_Prototype.html` มาใช้กับระบบ Next.js/Supabase โดยไม่ใช้ localStorage ของไฟล์ต้นแบบ

## ส่วนที่นำมาใช้แล้ว
- Sidebar สี Navy พร้อมหมวด Main, Master Data และ System
- Topbar พร้อมชื่อหน้าปัจจุบัน สถานะออนไลน์ บทบาทผู้ใช้ และรอบตรวจนับปัจจุบัน
- Dashboard KPI 4 ช่อง
- ความคืบหน้ารอบตรวจนับและสรุปตามสภาพสินค้า
- กล่องบาร์โค้ดไม่พบพร้อมทางลัดไปตรวจสอบ
- หน้าสแกนแบบ Scan Panel, Context, Last Scan, Quick Actions และ Activity
- ตารางรอบตรวจนับ ผลต่าง สินค้า คลัง/โลเคชั่น รายงาน และผู้ใช้งาน
- Responsive สำหรับ Desktop, Tablet และ Mobile

## หลักการเชื่อมระบบ
- ข้อมูลทั้งหมดอ่านและบันทึกผ่าน Supabase
- ระบบ Login และสิทธิ์ผู้ใช้เดิมยังทำงาน
- Offline Queue เดิมยังทำงาน
- Workflow Snapshot, Review, Approve และ Apply Adjustment ยังคงเดิม
- ไม่มีข้อมูลตัวอย่างจาก HTML ถูกนำไปสร้างในฐานข้อมูล
