'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
const links=[['/dashboard','ภาพรวม'],['/scan','ยิงบาร์โค้ด'],['/rounds','รอบตรวจนับ'],['/products','สินค้า'],['/users','ผู้ใช้งาน'],['/settings','ตั้งค่า']]
export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname(); const router=useRouter(); const supabase=createClient()
 async function logout(){await supabase.auth.signOut();router.replace('/login')}
 return <div className="shell"><aside className="sidebar"><div className="brand">MBC Inventory</div><nav className="nav">{links.map(([href,label])=><Link key={href} href={href} style={{background:pathname===href?'#f2b705':undefined,color:pathname===href?'#2d281a':undefined}}>{label}</Link>)}</nav><button className="btn secondary" style={{marginTop:20,width:'100%'}} onClick={logout}>ออกจากระบบ</button></aside><main className="main">{children}</main></div>
}
