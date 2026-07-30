export type QueuedScan = {
  p_round_id:string; p_location_id:string; p_condition:string; p_barcode:string;
  p_quantity:number; p_client_event_id:string; p_device_id:string|null; queued_at:string
}
const KEY='mbc_scan_queue_v1'
export function getQueue():QueuedScan[]{
  if(typeof window==='undefined') return []
  try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}
}
export function enqueueScan(item:QueuedScan){
  const q=getQueue(); q.push(item); localStorage.setItem(KEY,JSON.stringify(q))
}
export function saveQueue(q:QueuedScan[]){localStorage.setItem(KEY,JSON.stringify(q))}
