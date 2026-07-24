'use client'
import Link from 'next/link'
import {usePathname,useRouter} from 'next/navigation'
import {useEffect,useMemo,useState} from 'react'
import {BarChart3,Boxes,Building2,ChevronRight,ClipboardCheck,FileBarChart2,LogOut,Menu,PackageSearch,ScanLine,Settings,ShieldCheck,Users,WifiOff,X} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {roleLabels} from '@/lib/constants'
import type {AppRole,Profile} from '@/lib/types'

type NavItemType={href:string;label:string;icon:React.ComponentType<{size?:number}>;group:'main'|'data'|'system';roles:AppRole[]}

const nav:NavItemType[]=[
 {href:'/dashboard',label:'ภาพรวม',icon:BarChart3,group:'main',roles:['admin','warehouse_manager','sale_support','counter','viewer']},
 {href:'/scan',label:'ตรวจนับบาร์โค้ด',icon:ScanLine,group:'main',roles:['admin','warehouse_manager','sale_support','counter']},
 {href:'/rounds',label:'รอบตรวจนับ',icon:ClipboardCheck,group:'main',roles:['admin','warehouse_manager','sale_support','counter','viewer']},
 {href:'/variance',label:'ผลต่างสต๊อก',icon:PackageSearch,group:'main',roles:['admin','warehouse_manager','sale_support','viewer']},
 {href:'/products',label:'สินค้า',icon:Boxes,group:'data',roles:['admin','warehouse_manager','sale_support','viewer']},
 {href:'/locations',label:'คลังและโลเคชั่น',icon:Building2,group:'data',roles:['admin','warehouse_manager','sale_support','viewer']},
 {href:'/reports',label:'รายงาน',icon:FileBarChart2,group:'data',roles:['admin','warehouse_manager','sale_support','viewer']},
 {href:'/users',label:'ผู้ใช้งาน',icon:Users,group:'system',roles:['admin']},
 {href:'/settings',label:'ตั้งค่าระบบ',icon:Settings,group:'system',roles:['admin','warehouse_manager','sale_support','counter','viewer']},
]

export default function AppShell({children,profile}:{children:React.ReactNode;profile:Profile}){
 const pathname=usePathname();const router=useRouter();const supabase=useMemo(()=>createClient(),[])
 const[open,setOpen]=useState(false);const[online,setOnline]=useState(true);const[org,setOrg]=useState({name:'MBC Communications',system_name:'Inventory Count System'})
 useEffect(()=>setOpen(false),[pathname])
 useEffect(()=>{supabase.from('app_settings').select('value').eq('key','organization').maybeSingle().then(({data})=>{if(data?.value)setOrg(v=>({...v,...data.value}))})},[supabase])
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
 async function logout(){await supabase.auth.signOut();router.replace('/login');router.refresh()}
 const visible=nav.filter(x=>x.roles.includes(profile.role))
 const route=nav.find(x=>pathname===x.href||pathname.startsWith(x.href+'/'))
 const allowed=!route||route.roles.includes(profile.role)
 const current=allowed?route:undefined
 return <div className="app-shell">
  {open&&<button className="sidebar-backdrop" aria-label="ปิดเมนู" onClick={()=>setOpen(false)}/>} 
  <aside className={`sidebar ${open?'open':''}`}>
   <div className="brand-block"><div className="brand-logo">M</div><div><div className="brand-name">{org.name}</div><div className="brand-sub">{org.system_name}</div></div><button className="sidebar-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
   <NavGroup label="เมนูหลัก" items={visible.filter(x=>x.group==='main')} pathname={pathname}/>
   <NavGroup label="ข้อมูลและรายงาน" items={visible.filter(x=>x.group==='data')} pathname={pathname}/>
   <NavGroup label="ระบบ" items={visible.filter(x=>x.group==='system')} pathname={pathname}/>
   <div className="sidebar-spacer"/>
   <div className="profile-card"><div className="avatar">{(profile.full_name||profile.email||'A').slice(0,2).toUpperCase()}</div><div className="profile-copy"><strong>{profile.full_name||profile.email.split('@')[0]}</strong><span>{roleLabels[profile.role]}</span></div><button className="icon-button ghost" title="ออกจากระบบ" onClick={logout}><LogOut size={18}/></button></div>
  </aside>
  <section className="app-main">
   <header className="app-header"><div className="header-left"><button className="icon-button mobile-menu" onClick={()=>setOpen(true)}><Menu size={21}/></button><div><div className="header-title">{current?.label||'MBC Inventory'}</div><div className="header-crumb"><span>{org.name}</span><ChevronRight size={13}/><strong>{current?.label||'ระบบตรวจนับสินค้า'}</strong></div></div></div><div className="header-right"><div className={online?'online-chip':'online-chip offline'}>{online?<span className="online-dot"/>:<WifiOff size={14}/>} {online?'ออนไลน์':'ออฟไลน์'}</div><div className="role-chip"><ShieldCheck size={15}/>{roleLabels[profile.role]}</div></div></header>
   {profile.must_change_password&&<div className="password-banner"><strong>บัญชีนี้ยังใช้รหัสผ่านชั่วคราว</strong><span>ควรเปลี่ยนรหัสผ่านก่อนใช้งานจริง</span><Link href="/settings" className="btn small light">เปลี่ยนรหัสผ่าน</Link></div>}
   <main className="page-content">{allowed?children:<div className="center-panel"><div className="error-box">บัญชีนี้ไม่มีสิทธิ์เปิดเมนูดังกล่าว</div><Link href="/dashboard" className="btn primary">กลับหน้าภาพรวม</Link></div>}</main>
  </section>
 </div>
}

function NavGroup({label,items,pathname}:{label:string;items:NavItemType[];pathname:string}){if(!items.length)return null;return <><div className="nav-label">{label}</div><nav className="side-nav">{items.map(item=><NavItem key={item.href} item={item} active={pathname===item.href||pathname.startsWith(item.href+'/')}/>)}</nav></>}
function NavItem({item,active}:{item:NavItemType;active:boolean}){const Icon=item.icon;return <Link className={`side-link ${active?'active':''}`} href={item.href}><Icon size={19}/><span>{item.label}</span>{active&&<span className="active-mark"/>}</Link>}
