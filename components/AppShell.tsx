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

type NavItem={href:string;label:string;group:string;icon:React.ComponentType<{size?:number}>;adminOnly?:boolean}
const nav:NavItem[]=[
 {href:'/workspace#overview',label:'Dashboard',group:'งานหลัก',icon:LayoutDashboard},
 {href:'/workspace#rounds',label:'รอบตรวจนับ',group:'งานหลัก',icon:ClipboardCheck},
 {href:'/workspace#scan',label:'ตรวจนับบาร์โค้ด',group:'งานหลัก',icon:ScanLine},
 {href:'/workspace#results',label:'ผลตรวจนับ',group:'งานหลัก',icon:BarChart3},
 {href:'/workspace#unknowns',label:'บาร์โค้ดไม่พบ',group:'งานหลัก',icon:TriangleAlert},
 {href:'/workspace#transfers',label:'โอนย้ายสินค้า',group:'งานหลัก',icon:FolderSync},
 {href:'/workspace#stock',label:'สินค้าคงคลัง',group:'ข้อมูล',icon:Boxes},
 {href:'/workspace#products',label:'สินค้า',group:'ข้อมูล',icon:Package},
 {href:'/workspace#masters',label:'คลังและโลเคชั่น',group:'ข้อมูล',icon:Warehouse},
 {href:'/workspace#masters',label:'ข้อมูลหลัก',group:'ข้อมูล',icon:Tags},
 {href:'/workspace#results',label:'ผลต่างสต๊อก',group:'ตรวจสอบ',icon:PackageSearch},
 {href:'/workspace#reports',label:'รายงาน',group:'ตรวจสอบ',icon:FileSpreadsheet},
 {href:'/workspace#audit',label:'ประวัติการทำรายการ',group:'ตรวจสอบ',icon:History},
 {href:'/settings',label:'ตั้งค่าและผู้ใช้งาน',group:'ระบบ',icon:Users,adminOnly:true},
 {href:'/workspace#settings',label:'การสแกนและอุปกรณ์',group:'ระบบ',icon:Settings,adminOnly:true},
 {href:'/workspace#backup',label:'Backup / Restore',group:'ระบบ',icon:ShieldCheck,adminOnly:true},
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
 '/locations':['คลังและโลเคชั่น','จัดการคลัง พื้นที่จัดเก็บ และ QR Code'],
 '/masters':['ข้อมูลหลัก','แบรนด์ หมวดหมู่ และสภาพสินค้า'],
 '/users':['จัดการผู้ใช้งานและสิทธิ์','เพิ่มผู้ใช้ กำหนดสิทธิ์อ่านหรือแก้ไข ตั้งรหัสผ่าน และระงับบัญชี'],
 '/variance':['ผลต่างสต๊อก','เปรียบเทียบยอดระบบกับยอดตรวจนับจริง'],
 '/reports':['รายงาน','เจาะรายละเอียดถึง SKU โลเคชั่น และสภาพสินค้า'],
 '/audit':['ประวัติการทำรายการ','ตรวจสอบการสแกน แก้ไข และอนุมัติ'],
 '/backup':['Backup / Restore','สำรอง ตรวจสุขภาพ กู้คืน และจัดการข้อมูล'],
 '/settings':['ตั้งค่าและจัดการผู้ใช้งาน','ศูนย์จัดการสิทธิ์ผู้ใช้และการตั้งค่าระบบสำหรับ Admin'],
}
export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname(); const router=useRouter(); const supabase=useMemo(()=>createClient(),[])
 const [open,setOpen]=useState(false); const [user,setUser]=useState('ผู้ใช้งาน'); const [isAdmin,setIsAdmin]=useState(false)
 useEffect(()=>{let active=true;const loadUser=async()=>{const {data}=await supabase.auth.getUser();if(!active)return;setUser(data.user?.email?.split('@')[0]||'ผู้ใช้งาน');if(data.user){const {data:profile}=await supabase.from('profiles').select('role').eq('id',data.user.id).maybeSingle();if(active)setIsAdmin(profile?.role==='admin')}};void loadUser();return()=>{active=false}},[supabase])
 useEffect(()=>setOpen(false),[pathname])
 async function logout(){await supabase.auth.signOut();router.replace('/login')}
 const [title,subtitle]=titles[pathname]||['MBC Inventory','ระบบตรวจนับสินค้าคงคลัง']
 let group=''
 return <div className="app-shell">
  <aside className={`sidebar ${open?'open':''}`}>
   <div className="sidebar-logo"><div className="logo-box">MBC</div><div><b>MBC Inventory</b><small>Online Count System</small></div><button className="side-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
   <nav>{nav.filter(item=>!item.adminOnly||isAdmin).map(item=>{const Icon=item.icon;const heading=item.group!==group?(group=item.group,<div className="nav-label" key={`${item.group}-label`}>{item.group}</div>):null;return <div key={item.href}>{heading}<Link href={item.href} className={`nav-btn ${pathname===item.href?'active':''}`}><Icon size={18}/><span>{item.label}</span></Link></div>})}</nav>
   <div className="side-status"><div className="status-row"><span><i className="dot-online"/> ระบบออนไลน์</span><b>Supabase</b></div><small>ข้อมูลจะอัปเดตหลังเซิร์ฟเวอร์ยืนยันรายการ</small></div>
  </aside>
  {open&&<button aria-label="ปิดเมนู" className="sidebar-backdrop" onClick={()=>setOpen(false)}/>} 
  <div className="app-main">
   <header className="app-topbar"><div className="top-left"><button className="icon-btn hamburger" onClick={()=>setOpen(true)}><Menu size={20}/></button><div><h2>{title}</h2><div className="top-subtitle">{subtitle}</div></div></div><div className="top-actions"><span className="sync-chip"><i className="dot-online"/> Online</span><span className="user-chip">{user}</span><button className="icon-btn" onClick={logout} title="ออกจากระบบ"><LogOut size={18}/></button></div></header>
   <main className="content">{children}</main>
  </div>
 </div>
}
