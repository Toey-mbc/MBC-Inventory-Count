export type AppRole = 'admin'|'warehouse_manager'|'sale_support'|'counter'|'viewer'
export type Profile = { id:string; email:string; full_name:string; role:AppRole; must_change_password:boolean; active:boolean }
export type CountRound = { id:string; code:string; name:string; status:'draft'|'active'|'review'|'approved'; warehouse_id:string; created_at:string }
export type Location = { id:string; code:string; name:string; warehouse_id:string }
