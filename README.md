# MBC Inventory Online V1.5

เวอร์ชันนี้คงหน้า Login เดิม และนำหน้าระบบภายในฉบับเต็มจาก `MBC Inventory Count UAT V7.2` กลับมาใช้งานทั้งหมด แทนหน้าตัวอย่าง/Placeholder ของ V1.4

## จุดสำคัญ
- Login ผ่าน Supabase Auth
- หลัง Login เข้าหน้า `/workspace`
- ภายในเป็น UI ฉบับเต็ม: Dashboard, รอบตรวจนับ, ยิงบาร์โค้ด, ผลตรวจนับ, Unknown Barcode, โอนย้าย, Stock, Product, Master Data, Users, Reports, Audit, Backup และ Settings
- Responsive Desktop/Tablet/Mobile ตาม HTML V7.2
- ปุ่มออกจากระบบเชื่อมกลับไป Supabase Auth

## หมายเหตุด้านข้อมูล
หน้าภายในฉบับเต็มยังใช้ IndexedDB/localStorage ตามระบบ UAT เดิม เพื่อให้ฟังก์ชันครบและไม่หายไปเหมือน V1.4 ส่วนการย้ายข้อมูลทุกโมดูลให้ใช้ Supabase Realtime ต้องทำเป็นขั้นถัดไปโดยเปลี่ยน data adapter ทีละโมดูล โดยไม่เปลี่ยนหน้าตาและ workflow นี้
