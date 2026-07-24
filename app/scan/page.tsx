'use client'
import {FormEvent,useEffect,useMemo,useRef,useState} from 'react'
import {Edit3,MapPin,Minus,Plus,RotateCcw,ScanBarcode,Send,Undo2,WifiOff} from 'lucide-react'
import Protected from '@/components/Protected'
import {createClient} from '@/lib/supabase/client'
import {conditionLabel,conditionOptions} from '@/lib/constants'
import type {CountRound,Location,StockCondition} from '@/lib/types'
import {enqueueScan,getQueue,saveQueue,type QueuedScan} from '@/lib/offlineQueue'

type Recent={id:string;barcode:string;quantity_delta:number;created_at:string;product_id:string|null;products:any;locations:any;profiles:any;condition:StockCondition}
type TotalRow={round_id:string;product_id:string;location_id:string;condition:StockCondition;quantity:number;products:any;locations:any}

export default function Scan(){
 const s=useMemo(()=>createClient(),[]);const input=useRef<HTMLInputElement>(null)
 const[rounds,setRounds]=useState<CountRound[]>([]);const[locations,setLocations]=useState<Location[]>([])
 const[roundId,setRoundId]=useState('');const[locationId,setLocationId]=useState('');const[condition,setCondition]=useState<StockCondition>('good')
 const[qty,setQty]=useState(1);const[barcode,setBarcode]=useState('');const[msg,setMsg]=useState('');const[msgType,setMsgType]=useState<'success'|'error'|'info'>('info')
 const[recent,setRecent]=useState<Recent[]>([]);const[totals,setTotals]=useState<TotalRow[]>([]);const[pending,setPending]=useState(0);const[busy,setBusy]=useState(false)
 const[last,setLast]=useState<{productId:string;name:string;sku:string;brand:string;photo:string|null;quantity:number}|null>(null)
 const[lastScan,setLastScan]=useState({code:'',time:0})
 const round=rounds.find(x=>x.id===roundId);const location=locations.find(x=>x.id===locationId)

 async function loadBase(){
  setPending(getQueue().length)
  const{data:r}=await s.from('count_rounds').select('*,warehouses(code,name)').eq('status','active').order('created_at',{ascending:false})
  const rs=(r||[]) as CountRound[];setRounds(rs)
  const requested=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('round')||'':'';const preferred=requested&&rs.some(x=>x.id===requested)?requested:roundId&&rs.some(x=>x.id===roundId)?roundId:rs[0]?.id||'';setRoundId(preferred)
 }
 async function loadLocations(){
  if(!round?.warehouse_id){setLocations([]);setLocationId('');return}
  const{data}=await s.from('locations').select('*,warehouses(code,name)').eq('warehouse_id',round.warehouse_id).eq('active',true).order('code')
  const rows=(data||[]) as Location[];setLocations(rows)
  if(!rows.some(x=>x.id===locationId))setLocationId(rows[0]?.id||'')
 }
 async function loadRoundData(){
  if(!roundId){setRecent([]);setTotals([]);return}
  const[{data:e},{data:t}]=await Promise.all([
   s.from('scan_events').select('id,barcode,quantity_delta,created_at,product_id,condition,products(sku,name,brand,photo_url),locations(code,name,warehouses(code,name)),profiles(full_name,email)').eq('round_id',roundId).order('created_at',{ascending:false}).limit(20),
   s.from('scan_totals').select('round_id,product_id,location_id,condition,quantity,products(sku,name,brand,photo_url),locations(code,name,warehouses(code,name))').eq('round_id',roundId).order('updated_at',{ascending:false}),
  ])
  setRecent((e||[]) as Recent[]);setTotals((t||[]) as TotalRow[])
 }
 useEffect(()=>{loadBase()},[])
 useEffect(()=>{loadLocations();loadRoundData();if(!roundId)return;const channel=s.channel('count-live-'+roundId).on('postgres_changes',{event:'*',schema:'public',table:'scan_totals',filter:`round_id=eq.${roundId}`},loadRoundData).subscribe();return()=>{s.removeChannel(channel)}},[roundId,round?.warehouse_id])
 useEffect(()=>{if(location?.default_condition)setCondition(location.default_condition)},[locationId])
 useEffect(()=>{if(!last)return;const amount=currentTotal(last.productId);if(amount!==last.quantity)setLast(v=>v?{...v,quantity:amount}:v)},[totals,locationId,condition])

 function notify(text:string,type:'success'|'error'|'info'='info'){setMsg(text);setMsgType(type)}
 function currentTotal(productId:string,locId=locationId,cond=condition){return Number(totals.find(x=>x.product_id===productId&&x.location_id===locId&&x.condition===cond)?.quantity||0)}
 function activityTotal(){return totals.reduce((n,x)=>n+Number(x.quantity),0)}

 async function submit(e?:FormEvent){e?.preventDefault();const code=barcode.trim();if(!roundId||!locationId||!code)return
  if(code.startsWith('LOC:')){const target=locations.find(x=>x.scan_code===code||`LOC:${x.id}`===code);if(target){setLocationId(target.id);setBarcode('');notify(`เปลี่ยนโลเคชั่นเป็น ${target.code} · ${target.name}`,'success');setTimeout(()=>input.current?.focus(),50);return}notify('QR/บาร์โค้ดโลเคชั่นนี้ไม่ได้อยู่ในคลังของรอบปัจจุบัน','error');setBarcode('');return}
  const now=Date.now();if(lastScan.code===code&&now-lastScan.time<450){notify('ป้องกันการยิงซ้ำเร็วเกินไป กรุณายิงใหม่','error');setBarcode('');return}setLastScan({code,time:now});setBusy(true);notify('กำลังบันทึก...')
  const payload:QueuedScan={p_round_id:roundId,p_location_id:locationId,p_condition:condition,p_barcode:code,p_quantity:Math.max(1,qty),p_client_event_id:crypto.randomUUID(),p_device_id:getDeviceId(),queued_at:new Date().toISOString()}
  const{data,error}=await s.rpc('record_scan',rpcPayload(payload))
  if(error){if(isNetworkError(error)){enqueueScan({...payload,last_error:error.message});setPending(getQueue().length);notify('อินเทอร์เน็ตขัดข้อง ระบบเก็บรายการไว้รอซิงก์แล้ว','error')}else notify(`บันทึกไม่สำเร็จ: ${error.message}`,'error')}
  else{
   const result=(data as any)?.[0]
   if(result?.is_unknown){notify(`ไม่พบบาร์โค้ด ${code} — เก็บไว้ในรายการรอตรวจสอบแล้ว`,'error')}
   else{await loadRoundData();const{data:p}=await s.from('products').select('id,sku,name,brand,photo_url').eq('sku',result?.sku).maybeSingle();if(p)setLast({productId:p.id,name:p.name,sku:p.sku,brand:p.brand||'',photo:p.photo_url,quantity:currentTotal(p.id)+Math.max(1,qty)});notify(`สแกนสำเร็จ ${result?.sku||code} +${Math.max(1,qty)}`,'success')}
  }
  setBarcode('');setBusy(false);setTimeout(()=>input.current?.focus(),30)
 }
 async function syncQueue(){const queue=getQueue();if(!queue.length)return notify('ไม่มีรายการค้างซิงก์','info');setBusy(true);const remain:QueuedScan[]=[];let rejected=0;for(const item of queue){const{error}=await s.rpc('record_scan',rpcPayload(item));if(error){remain.push({...item,last_error:error.message});if(!isNetworkError(error))rejected++}}saveQueue(remain);setPending(remain.length);notify(remain.length?`ยังซิงก์ไม่ได้ ${remain.length} รายการ${rejected?` · ถูกปฏิเสธ ${rejected} รายการ กรุณาตรวจรอบและโลเคชั่น`:''}`:'ซิงก์รายการค้างครบแล้ว',remain.length?'error':'success');setBusy(false);loadRoundData()}
 function clearQueue(){if(!getQueue().length)return;if(window.confirm('ล้างรายการสแกนที่ค้างในเครื่องนี้ทั้งหมดหรือไม่? ควรทำเมื่อแน่ใจว่าไม่ต้องการส่งข้อมูลเหล่านี้แล้ว')){saveQueue([]);setPending(0);notify('ล้างรายการค้างในเครื่องแล้ว','success')}}
 async function undo(row:Recent){const reason=window.prompt('เหตุผลที่ย้อนรายการ','ยิงผิดรายการ');if(!reason)return;const{error}=await s.rpc('undo_scan',{p_scan_event_id:row.id,p_reason:reason,p_client_event_id:crypto.randomUUID()});notify(error?`ย้อนรายการไม่สำเร็จ: ${error.message}`:'ย้อนรายการแล้ว',error?'error':'success');loadRoundData()}
 async function editTotal(row:TotalRow){const value=window.prompt(`จำนวนใหม่ของ ${row.products?.sku} ณ ${row.locations?.code}`,String(row.quantity));if(value===null)return;const n=Number(value);if(!Number.isInteger(n)||n<0)return notify('จำนวนต้องเป็นเลขจำนวนเต็มตั้งแต่ 0 ขึ้นไป','error');const reason=window.prompt('เหตุผลในการแก้ไขจำนวน','ตรวจนับและแก้ไขยอด');if(!reason)return;const{error}=await s.rpc('set_count_quantity',{p_round_id:roundId,p_product_id:row.product_id,p_location_id:row.location_id,p_condition:row.condition,p_quantity:n,p_reason:reason,p_client_event_id:crypto.randomUUID()});notify(error?error.message:'แก้ไขจำนวนเรียบร้อย',error?'error':'success');loadRoundData()}
 async function quickAdjust(delta:number){const row=totals.find(x=>x.product_id===last?.productId&&x.location_id===locationId&&x.condition===condition);if(!row)return notify('ยังไม่มีสินค้าล่าสุดในโลเคชั่นและสภาพนี้','error');const next=Math.max(0,Number(row.quantity)+delta);const{error}=await s.rpc('set_count_quantity',{p_round_id:roundId,p_product_id:row.product_id,p_location_id:row.location_id,p_condition:row.condition,p_quantity:next,p_reason:delta>0?'เพิ่มจำนวนจากปุ่มลัด':'ลดจำนวนจากปุ่มลัด',p_client_event_id:crypto.randomUUID()});notify(error?error.message:`ปรับจำนวนเป็น ${next} แล้ว`,error?'error':'success');loadRoundData()}
 const areaRows=totals.filter(x=>x.location_id===locationId&&x.condition===condition)
 return <Protected>
  <div className="page-head"><div><h1>ตรวจนับด้วยบาร์โค้ด</h1><p>เลือกคลัง โลเคชั่น และสภาพสินค้าให้ถูกต้องก่อนยิงบาร์โค้ด</p></div><div className="actions"><button className="btn outline" onClick={syncQueue} disabled={busy}><WifiOff size={16}/>รอซิงก์ {pending}</button>{pending>0&&<button className="btn danger" onClick={clearQueue} disabled={busy}>ล้างค้าง</button>}<a className="btn primary" href="/rounds"><Send size={16}/>จัดการรอบนับ</a></div></div>
  {!rounds.length&&<div className="notice" style={{marginBottom:14}}>ยังไม่มีรอบตรวจนับสถานะ “กำลังตรวจนับ” กรุณาเปิดรอบจากเมนูรอบตรวจนับก่อน</div>}
  <div className="filters">
   <div className="field"><label>รอบตรวจนับ</label><select value={roundId} onChange={e=>setRoundId(e.target.value)}><option value="">เลือกรอบ</option>{rounds.map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></div>
   <div className="field"><label>คลังสินค้า</label><input value={round?.warehouses?.name||'-'} disabled/></div>
   <div className="field"><label>โลเคชั่น</label><select value={locationId} onChange={e=>setLocationId(e.target.value)}><option value="">เลือกโลเคชั่น</option>{locations.map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></div>
   <div className="field"><label>สภาพสินค้า</label><select value={condition} onChange={e=>setCondition(e.target.value as StockCondition)}>{conditionOptions.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
   <div className="field"><label>จำนวนต่อการยิง</label><input type="number" min={1} max={10000} value={qty} onChange={e=>setQty(Math.max(1,Number(e.target.value)||1))}/></div>
  </div>
  <div className="scan-layout">
   <div>
    <div className="scan-panel"><div className="scan-context"><div className="context-box"><small>รอบ</small><strong>{round?.code||'-'}</strong></div><div className="context-box"><small>คลัง</small><strong>{round?.warehouses?.name||'-'}</strong></div><div className="context-box"><small>โลเคชั่น</small><strong>{location?`${location.code} ${location.name}`:'-'}</strong></div><div className="context-box"><small>จำนวนในรอบ</small><strong>{activityTotal().toLocaleString()} ชิ้น</strong></div></div>
     <form className="barcode-box" onSubmit={submit}><ScanBarcode size={25}/><input ref={input} autoFocus autoComplete="off" value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="คลิกตรงนี้แล้วใช้ปืนยิงบาร์โค้ด" disabled={!roundId||!locationId||busy}/><button className="btn primary" disabled={!barcode.trim()||busy}>บันทึก</button></form>
     <div className="scan-hint">รองรับปืน USB / Bluetooth แบบ Keyboard Input และ QR โลเคชั่นรูปแบบ LOC:...</div>
     <div className="last-scan"><div className="product-thumb">{last?.photo?<img src={last.photo} alt=""/>:(last?.brand||last?.sku||'SKU').slice(0,3).toUpperCase()}</div><div><h3>{last?.name||'ยังไม่มีรายการสแกน'}</h3><p>{last?`${last.sku}${last.brand?` · ${last.brand}`:''}`:'เริ่มยิงบาร์โค้ดเพื่อแสดงข้อมูลสินค้า'}</p></div><div className="last-qty">{last?.quantity||0}<small>จำนวนในพื้นที่นี้</small></div></div>
     <div className="quick-grid"><button onClick={()=>quickAdjust(1)}><Plus size={15}/> เพิ่ม 1</button><button onClick={()=>quickAdjust(-1)}><Minus size={15}/> ลด 1</button><button onClick={()=>{const row=areaRows.find(x=>x.product_id===last?.productId);if(row)editTotal(row);else notify('ยังไม่มีสินค้าล่าสุดในพื้นที่นี้','error')}}><Edit3 size={15}/> กรอกจำนวน</button><button onClick={()=>input.current?.focus()}><ScanBarcode size={15}/> พร้อมยิงต่อ</button></div>
    </div>
    {msg&&<div className={msgType==='success'?'success-box':msgType==='error'?'error-box':'notice'} style={{marginTop:12}}>{msg}</div>}
    <div className="card" style={{marginTop:16}}><div className="card-title"><h2>รายการในโลเคชั่นและสภาพปัจจุบัน</h2><span className="badge">{areaRows.length} SKU</span></div><div className="table-wrap"><table className="table"><thead><tr><th>SKU</th><th>สินค้า</th><th>แบรนด์</th><th>สภาพ</th><th>จำนวน</th><th></th></tr></thead><tbody>{areaRows.length?areaRows.map(row=><tr key={`${row.product_id}-${row.location_id}-${row.condition}`}><td><strong>{row.products?.sku}</strong></td><td className="wrap">{row.products?.name}</td><td>{row.products?.brand||'-'}</td><td><span className="badge dark">{conditionLabel(row.condition)}</span></td><td><strong>{Number(row.quantity).toLocaleString()}</strong></td><td><button className="btn small secondary" onClick={()=>editTotal(row)}><Edit3 size={13}/>แก้จำนวน</button></td></tr>):<tr><td colSpan={6} className="empty">ยังไม่มีรายการในพื้นที่นี้</td></tr>}</tbody></table></div></div>
   </div>
   <aside><div className="card"><div className="card-title"><h2>พื้นที่ปัจจุบัน</h2><MapPin size={17} className="muted"/></div><div className="location-hero">{round?.warehouses?.name||'-'}<br/><span style={{fontSize:13,fontWeight:650}}>{location?`${location.code} · ${location.name}`:'ยังไม่เลือกโลเคชั่น'}</span></div><div className="stat-strip"><div className="stat-pill">สภาพ <strong>{conditionLabel(condition)}</strong></div><div className="stat-pill">SKU <strong>{areaRows.length}</strong></div></div><div className="card-title" style={{marginTop:18}}><h3>กิจกรรมล่าสุด</h3><RotateCcw size={15} className="muted"/></div><div className="activity-list">{recent.length?recent.slice(0,12).map(row=><div className="activity-item" key={row.id}><span className="activity-dot" style={{background:row.quantity_delta<0?'var(--orange)':'var(--green)'}}/><div style={{flex:1}}><strong>{row.products?.sku||row.barcode} {row.quantity_delta>0?'+':''}{row.quantity_delta}</strong><span>{new Date(row.created_at).toLocaleTimeString('th-TH')} · {row.locations?.code} · {conditionLabel(row.condition)}</span></div>{row.quantity_delta>0&&<button className="icon-button" title="ย้อนรายการ" onClick={()=>undo(row)}><Undo2 size={14}/></button>}</div>):<div className="empty">ยังไม่มีกิจกรรม</div>}</div></div></aside>
  </div>
 </Protected>
}

function rpcPayload(item:QueuedScan){return {p_round_id:item.p_round_id,p_location_id:item.p_location_id,p_condition:item.p_condition,p_barcode:item.p_barcode,p_quantity:item.p_quantity,p_client_event_id:item.p_client_event_id,p_device_id:item.p_device_id}}

function isNetworkError(error:{message?:string}){return typeof navigator!=='undefined'&&!navigator.onLine||/failed to fetch|fetch failed|network|connection|timeout/i.test(error.message||'')}

function getDeviceId(){let id=localStorage.getItem('mbc_device_id');if(!id){id=crypto.randomUUID();localStorage.setItem('mbc_device_id',id)}return id}
