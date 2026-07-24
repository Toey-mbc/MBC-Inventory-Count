'use client'
import {useEffect,useMemo,useState} from 'react'
import {Boxes,CheckCircle2,ClipboardList,HelpCircle,TrendingDown,TrendingUp} from 'lucide-react'
import Protected from '@/components/Protected'
import {createClient} from '@/lib/supabase/client'
import {conditionLabel,statusLabel} from '@/lib/constants'
import type {CountRound} from '@/lib/types'

type Activity={id:string;created_at:string;quantity_delta:number;barcode:string;products:any;locations:any;profiles:any}
type Progress={round_id:string;code:string;name:string;status:string;warehouse_name:string;expected_lines:number;counted_lines:number;progress_percent:number;counted_quantity:number}

export default function Dashboard(){
 const s=useMemo(()=>createClient(),[])
 const[loading,setLoading]=useState(true)
 const[current,setCurrent]=useState<CountRound|null>(null)
 const[kpi,setKpi]=useState({products:0,countedLines:0,expectedLines:0,short:0,over:0,unknown:0,quantity:0})
 const[conditions,setConditions]=useState<Record<string,number>>({})
 const[progress,setProgress]=useState<Progress[]>([])
 const[activity,setActivity]=useState<Activity[]>([])
 const[error,setError]=useState('')

 async function load(){
  setLoading(true);setError('')
  try{
   const{data:rounds,error:roundError}=await s.from('count_rounds').select('*,warehouses(code,name)').in('status',['active','review','approved']).order('created_at',{ascending:false}).limit(20)
   if(roundError)throw roundError
   const candidates=(rounds||[]) as CountRound[];const round=candidates.find(x=>x.status==='active')||candidates.find(x=>x.status==='review')||candidates[0]||null;setCurrent(round)
   const[{count:productCount},{data:roundProgress}]=await Promise.all([
    s.from('products').select('*',{count:'exact',head:true}).eq('active',true),
    s.from('v_round_progress').select('*').in('status',['active','review']).order('code',{ascending:false}).limit(8),
   ])
   setProgress((roundProgress||[]) as Progress[])
   if(!round){setKpi(v=>({...v,products:productCount||0}));setLoading(false);return}
   const[{data:snapshots,count:expected},{data:totals,count:counted},{data:variance},{count:unknown},{data:events}]=await Promise.all([
    s.from('round_snapshots').select('product_id',{count:'exact'}).eq('round_id',round.id),
    s.from('scan_totals').select('quantity,condition',{count:'exact'}).eq('round_id',round.id).neq('quantity',0),
    s.from('v_round_variance').select('difference').eq('round_id',round.id),
    s.from('unknown_barcodes').select('*',{count:'exact',head:true}).eq('round_id',round.id).eq('status','open'),
    s.from('scan_events').select('id,created_at,quantity_delta,barcode,products(sku,name),locations(code,name,warehouses(code,name)),profiles(full_name,email)').eq('round_id',round.id).order('created_at',{ascending:false}).limit(10),
   ])
   const short=(variance||[]).filter((x:any)=>Number(x.difference)<0).length
   const over=(variance||[]).filter((x:any)=>Number(x.difference)>0).length
   const grouped:Record<string,number>={};let qty=0
   for(const row of totals||[]){const q=Number(row.quantity);qty+=q;grouped[row.condition]=(grouped[row.condition]||0)+q}
   setConditions(grouped);setActivity((events||[]) as Activity[])
   setKpi({products:productCount||0,countedLines:counted||0,expectedLines:expected||snapshots?.length||0,short,over,unknown:unknown||0,quantity:qty})
  }catch(e){setError(e instanceof Error?e.message:'โหลด Dashboard ไม่สำเร็จ')}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const percent=kpi.expectedLines?Math.min(100,Math.round(kpi.countedLines*100/kpi.expectedLines)):0
 return <Protected>
  <div className="page-head"><div><h1>ภาพรวมการตรวจนับสินค้า</h1><p>{current?<>รอบปัจจุบัน <strong>{current.code}</strong> · {current.warehouses?.name} · {statusLabel(current.status)}</>:'ยังไม่มีรอบตรวจนับที่กำลังดำเนินการ'}</p></div><a className="btn primary" href="/rounds">+ สร้างรอบตรวจนับ</a></div>
  {error&&<div className="error-box" style={{marginBottom:14}}>{error}</div>}
  <div className="grid kpi-grid">
   <Kpi label="SKU ที่เปิดใช้งาน" value={loading?'…':kpi.products.toLocaleString()} sub="ข้อมูลสินค้าในระบบ" icon={<Boxes size={19}/>}/>
   <Kpi label="ตรวจนับแล้ว" value={loading?'…':kpi.countedLines.toLocaleString()} sub={`${percent}% ของรายการใน Snapshot`} icon={<CheckCircle2 size={19}/>} tone="good"/>
   <Kpi label="รายการจำนวนขาด" value={loading?'…':kpi.short.toLocaleString()} sub="ต้องตรวจสอบก่อนอนุมัติ" icon={<TrendingDown size={19}/>} tone="bad"/>
   <Kpi label="รายการจำนวนเกิน" value={loading?'…':kpi.over.toLocaleString()} sub={`บาร์โค้ดไม่พบ ${kpi.unknown} รายการ`} icon={<TrendingUp size={19}/>} tone="warn"/>
  </div>
  <div className="grid two-col">
   <div className="card"><div className="card-title"><h2>ความคืบหน้ารอบที่กำลังดำเนินการ</h2><span className="badge live">Realtime</span></div>
    {progress.length?progress.map(row=><div className="progress-row" key={row.round_id}><div className="progress-meta"><span><strong>{row.warehouse_name}</strong> · {row.code}</span><b>{Number(row.progress_percent||0).toFixed(0)}%</b></div><div className="progress"><span style={{width:`${Math.min(100,Number(row.progress_percent||0))}%`}}/></div></div>):<div className="empty">ยังไม่มีรอบ Active หรือ Review</div>}
   </div>
   <div className="card"><div className="card-title"><h2>สรุปตามสภาพสินค้า</h2><ClipboardList size={18} className="muted"/></div><div className="condition-grid">
    {Object.entries(conditions).length?Object.entries(conditions).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([key,value])=><div className="condition-box" key={key}><span>{conditionLabel(key)}</span><strong>{value.toLocaleString()}</strong></div>):<div className="empty">ยังไม่มีข้อมูลการนับ</div>}
   </div><div className="notice" style={{marginTop:12,display:'flex',gap:8,alignItems:'center'}}><HelpCircle size={16}/><span>ยอดที่นับรวม {kpi.quantity.toLocaleString()} ชิ้น · ไม่รวมบาร์โค้ดที่ยังไม่ผูกสินค้า</span></div></div>
  </div>
  <div className="card" style={{marginTop:16}}><div className="card-title"><h2>กิจกรรมล่าสุด</h2><a href="/scan" className="btn small secondary">ไปหน้าตรวจนับ</a></div><div className="table-wrap"><table className="table"><thead><tr><th>เวลา</th><th>ผู้ตรวจนับ</th><th>คลัง / โลเคชั่น</th><th>รายการ</th><th>จำนวน</th><th>สถานะ</th></tr></thead><tbody>
   {activity.length?activity.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString('th-TH')}</td><td>{row.profiles?.full_name||row.profiles?.email?.split('@')[0]||'-'}</td><td>{row.locations?.warehouses?.name||'-'} / {row.locations?.code||'-'}</td><td className="wrap"><strong>{row.products?.sku||'UNKNOWN'}</strong><div className="muted">{row.products?.name||row.barcode}</div></td><td className={row.quantity_delta<0?'diff-neg':'diff-pos'}>{row.quantity_delta>0?'+':''}{row.quantity_delta}</td><td><span className={`badge ${row.quantity_delta<0?'warn':'ok'}`}>{row.quantity_delta<0?'แก้ไข/ย้อน':'สำเร็จ'}</span></td></tr>):<tr><td colSpan={6} className="empty">ยังไม่มีกิจกรรมในรอบปัจจุบัน</td></tr>}
  </tbody></table></div></div>
 </Protected>
}

function Kpi({label,value,sub,icon,tone='' }:{label:string;value:string|number;sub:string;icon:React.ReactNode;tone?:string}){return <div className={`kpi-card ${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-sub">{sub}</div><div className="kpi-icon">{icon}</div></div>}
