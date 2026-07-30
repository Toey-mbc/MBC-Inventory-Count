import fs from 'node:fs'
import path from 'node:path'
import WorkspaceClient from '@/components/WorkspaceClient'

export const dynamic = 'force-static'

export default function WorkspacePage() {
  const filePath = path.join(process.cwd(), 'legacy', 'workspace.html')
  let html = fs.readFileSync(filePath, 'utf8')

  html = html
    .replace('MBC Inventory Count UAT V7.2', 'MBC Inventory Count Online')
    .replace('Inventory Count UAT V7.2', 'Inventory Count Online')
    .replace('<b><span class="dot-online"></span> Local UAT</b>', '<b><span class="dot-online"></span> ระบบพร้อมใช้งาน</b>')
    .replace('ซิงก์ได้เฉพาะแท็บใน Browser/โปรไฟล์เดียวกัน ข้ามเครื่องต้องเชื่อมฐานข้อมูลออนไลน์', 'หน้าจอการทำงานฉบับเต็ม พร้อมเชื่อมต่อบัญชีผู้ใช้ผ่าน Supabase')
    .replace('<button class="icon-btn" data-page="settings" title="ตั้งค่า">⚙</button>', '<button class="icon-btn" data-page="settings" title="ตั้งค่า">⚙</button><button class="icon-btn" id="onlineLogout" title="ออกจากระบบ">ออกจากระบบ</button>')
    .replace("const APP_VERSION='7.2.0-UAT';", "const APP_VERSION='1.5.0-ONLINE-UI';")
    .replace("const ROLE_LABEL={admin:'ผู้ดูแลระบบ',supervisor:'หัวหน้าคลัง',counter:'ผู้ตรวจนับ'};", "const ROLE_LABEL={admin:'ผู้ดูแลระบบ',supervisor:'หัวหน้าคลัง',sale_support:'Sale Support',counter:'ผู้ตรวจนับ',viewer:'ผู้ดูข้อมูล'};")
    .replace('</script>', "\nwindow.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('onlineLogout');if(b)b.addEventListener('click',()=>parent.postMessage({type:'MBC_LOGOUT'},'*'));});\n</script>")

  return <WorkspaceClient html={html} />
}
