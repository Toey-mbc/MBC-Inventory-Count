import type {StockCondition} from './types'

export const conditionOptions:{value:StockCondition;label:string;short:string;ready:boolean}[]=[
 {value:'good',label:'ของปกติ / พร้อมขาย',short:'ปกติ',ready:true},
 {value:'box_damaged',label:'กล่องบุบ',short:'กล่องบุบ',ready:false},
 {value:'defective',label:'สินค้ามีตำหนิ',short:'มีตำหนิ',ready:false},
 {value:'pending_inspection',label:'รอตรวจสอบ',short:'รอตรวจ',ready:false},
 {value:'customer_claim',label:'เคลมจากลูกค้า',short:'เคลมลูกค้า',ready:false},
 {value:'supplier_claim',label:'รอเคลมผู้จำหน่าย',short:'เคลมผู้จำหน่าย',ready:false},
 {value:'repaired',label:'ซ่อมแล้ว',short:'ซ่อมแล้ว',ready:false},
 {value:'accessory',label:'ของแถม / อะไหล่',short:'ของแถม',ready:false},
 {value:'scrap',label:'เสีย / ตัดจำหน่าย',short:'ตัดจำหน่าย',ready:false},
 {value:'damaged',label:'เสียหาย (ข้อมูลเดิม)',short:'เสียหาย',ready:false},
 {value:'demo',label:'สินค้าทดลอง / DEMO',short:'DEMO',ready:false},
]

export const roleLabels:Record<string,string>={
 admin:'ผู้ดูแลระบบ',warehouse_manager:'หัวหน้าคลัง',sale_support:'Sale Support',counter:'ผู้ตรวจนับ',viewer:'ดูข้อมูลอย่างเดียว'
}

export const statusLabels:Record<string,string>={
 draft:'แบบร่าง',active:'กำลังตรวจนับ',review:'รอตรวจสอบ',approved:'อนุมัติแล้ว',cancelled:'ยกเลิก'
}

export function conditionLabel(value:string){return conditionOptions.find(x=>x.value===value)?.short||value}
export function statusLabel(value:string){return statusLabels[value]||value}
