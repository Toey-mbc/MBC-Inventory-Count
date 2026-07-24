export type AppRole='admin'|'warehouse_manager'|'sale_support'|'counter'|'viewer'
export type StockCondition='good'|'damaged'|'demo'|'box_damaged'|'defective'|'pending_inspection'|'customer_claim'|'supplier_claim'|'repaired'|'scrap'|'accessory'
export type RoundStatus='draft'|'active'|'review'|'approved'|'cancelled'
export type Profile={id:string;email:string;full_name:string;role:AppRole;must_change_password:boolean;active:boolean}
export type Warehouse={id:string;code:string;name:string;description:string;address:string;active:boolean;created_at:string;updated_at:string}
export type Location={id:string;code:string;name:string;warehouse_id:string;zone:string;default_condition:StockCondition;scan_code:string|null;notes:string;active:boolean;warehouses?:{code:string;name:string}}
export type Product={id:string;sku:string;name:string;brand:string;category:string;unit:string;cost:number;photo_url:string|null;notes:string;active:boolean;product_barcodes?:{id?:string;barcode:string;is_primary:boolean}[]}
export type CountRound={id:string;code:string;name:string;status:RoundStatus;warehouse_id:string;environment:'test'|'production';planned_start:string|null;notes:string;blind_count:boolean;created_at:string;started_at:string|null;submitted_at:string|null;approved_at:string|null;adjustments_applied_at:string|null;warehouses?:{code:string;name:string}}
