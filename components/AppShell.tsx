'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3, Boxes, ClipboardCheck, FileClock, FileSpreadsheet, FolderSync,
  History, LayoutDashboard, LogOut, Menu, Package, PackageSearch, ScanLine,
  Settings, ShieldCheck, Tags, TriangleAlert, Users, Warehouse, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type NavItem={href:string;label:string;group:string;icon:React.ComponentType<{size?:number}>}
const nav:NavItem[]=[
 {href:'/dashboard',label:'Dashboard',group:'งานหลัก',icon:LayoutDashboard},
 {href:'/rounds',label:'รอบตรวจนับ',group:'งานหลัก',icon:ClipboardCheck},
 {href:'/scan',label:'ตรวจนับบาร์โค้ด',group:'งานหลัก',icon:ScanLine},
 {href:'/results',label:'ผลตรวจนับ',group:'งานหลัก',icon:BarChart3},
 {href:'/unknowns',label:'บาร์โค้ดไม่พบ',group:'งานหลัก',icon:TriangleAlert},
 {href:'/transfers',label:'โอนย้ายสินค้า',group:'งานหลัก',icon:FolderSync},
 {href:'/stock',label:'สินค้าคงคลัง',group:'ข้อมูล',icon:Boxes},
 {href:'/products',label:'สินค้า',group:'ข้อมูล',icon:Package},
 {href:'/masters',label:'ข้อมูลหลัก',group:'ข้อมูล',icon:Tags},
 {href:'/users',label:'ผู้ใช้งานและสิทธิ์',group:'ข้อมูล',icon:Users},
 {href:'/reports',label:'รายงาน',group:'ตรวจสอบ',icon:FileSpreadsheet},
 {href:'/audit',label:'ประวัติการทำรายการ',group:'ตรวจสอบ',icon:History},
 {href:'/backup',label:'Backup / Restore',group:'ระบบ',icon:ShieldCheck},
 {href:'/settings',label:'ตั้งค่าระบบ',group:'ระบบ',icon:Settings},
]
const titles:Record<string,[string,string]>={
 '/dashboard':['Dashboard','ภาพรวมสต๊อกและความคืบหน้าการตรวจนับ'],
 '/rounds':['รอบตรวจนับ','สร้าง เริ่ม ส่งตรวจสอบ และอนุมัติรอบตรวจนับ'],
 '/scan':['ตรวจนับด้วยบาร์โค้ด','รองรับปืนยิง USB / Bluetooth และกล้องมือถือ'],
 '/results':['ผลตรวจนับ','เปรียบเทียบยอดระบบ ยอดจริง และผลต่าง'],
 '/unknowns':['บาร์โค้ดไม่พบ','จัดการรายการค้าง ผูกสินค้า หรือเพิ่มสินค้าใหม่'],
 '/transfers':['โอนย้ายสินค้า','โอนระหว่างคลัง โลเคชั่น และสภาพสินค้า'],
 '/stock':['สินค้าคงคลัง','ยอดตามสินค้า คลัง โลเคชั่น และสภาพ'],
 '/products':['สินค้า','จัดการ SKU บาร์โค้ด แบรนด์ และหมวดหมู่'],
 '/masters':['ข้อมูลหลัก','แบรนด์ หมวดหมู่ คลัง โลเคชั่น และสภาพสินค้า'],
 '/users':['ผู้ใช้งานและสิทธิ์','เพิ่มผู้ใช้ กำหนดบทบาท และระงับบัญชี'],
 '/reports':['รายงาน','รายงานสรุปและส่งออกข้อมูล'],
 '/audit':['ประวัติการทำรายการ','ตรวจสอบการสแกน แก้ไข และอนุมัติ'],
 '/backup':['Backup / Restore','สำรอง ตรวจสุขภาพ และล้างข้อมูลทดสอบ'],
 '/settings':['ตั้งค่าระบบ','ตั้งค่าการสแกน เสียง และอุปกรณ์'],
}
export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname(); const router=useRouter(); const supabase=useMemo(()=>createClient(),[])
 const [open,setOpen]=useState(false); const [user,setUser]=useState('ผู้ใช้งาน')
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(data.user?.email?.split('@')[0]||'ผู้ใช้งาน'))},[supabase])
 useEffect(()=>setOpen(false),[pathname])
 async function logout(){await supabase.auth.signOut();router.replace('/login')}
 const [title,subtitle]=titles[pathname]||['MBC Inventory','ระบบตรวจนับสินค้าคงคลัง']
 let group=''
 return <div className="app-shell">
  <aside className={`sidebar ${open?'open':''}`}>
   <div className="sidebar-logo"><div className="logo-box">MBC</div><div><b>MBC Inventory</b><small>Online Count System</small></div><button className="side-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
   <nav>{nav.map(item=>{const Icon=item.icon;const heading=item.group!==group?(group=item.group,<div className="nav-label" key={`${item.group}-label`}>{item.group}</div>):null;return <div key={item.href}>{heading}<Link href={item.href} className={`nav-btn ${pathname===item.href?'active':''}`}><Icon size={18}/><span>{item.label}</span></Link></div>})}</nav>
   <div className="side-status"><div className="status-row"><span><i className="dot-online"/> ระบบออนไลน์</span><b>Supabase</b></div><small>ข้อมูลจะอัปเดตหลังเซิร์ฟเวอร์ยืนยันรายการ</small></div>
  </aside>
  {open&&<button aria-label="ปิดเมนู" className="sidebar-backdrop" onClick={()=>setOpen(false)}/>} 
  <div className="app-main">
   <header className="app-topbar"><div className="top-left"><button className="icon-btn hamburger" onClick={()=>setOpen(true)}><Menu size={20}/></button><div><h2>{title}</h2><div className="top-subtitle">{subtitle}</div></div></div><div className="top-actions"><span className="sync-chip"><i className="dot-online"/> Online</span><span className="user-chip">{user}</span><button className="icon-btn" onClick={logout} title="ออกจากระบบ"><LogOut size={18}/></button></div></header>
   <main className="content">{children}</main>
  </div>
 </div>
}
