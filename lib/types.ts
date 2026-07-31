export type AppRole = 'admin' | 'warehouse_manager' | 'sale_support' | 'counter' | 'viewer'

export type StockCondition =
  | 'good'
  | 'box_damaged'
  | 'defective'
  | 'pending_inspection'
  | 'customer_claim'
  | 'supplier_claim'
  | 'repaired'
  | 'accessory'
  | 'scrap'
  | 'damaged'
  | 'demo'

export type Profile = {
  id: string
  email: string
  full_name: string
  role: AppRole
  active: boolean
  created_at?: string
  updated_at?: string
}

export type Warehouse = {
  id: string
  code: string
  name: string
  description?: string | null
  address?: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export type CountRound = {
  id: string
  code: string
  name: string
  status: 'draft' | 'active' | 'review' | 'approved' | 'cancelled'
  warehouse_id: string
  created_at: string
  updated_at?: string
  warehouses?: { code?: string | null; name?: string | null } | null
}

export type ProductBarcode = {
  id?: string
  product_id?: string
  barcode: string
  is_primary?: boolean
  created_at?: string
}

export type Product = {
  id: string
  sku: string
  name: string
  brand?: string | null
  category?: string | null
  unit?: string | null
  cost?: number | null
  photo_url?: string | null
  notes?: string | null
  active: boolean
  created_at?: string
  updated_at?: string
  product_barcodes?: ProductBarcode[] | null
}

export type Location = {
  id: string
  code: string
  name: string
  warehouse_id: string
  zone: string | null
  default_condition: StockCondition
  active: boolean
  description?: string | null
  notes?: string | null
  scan_code?: string | null
  created_at?: string
  updated_at?: string
  warehouses?: { code?: string | null; name?: string | null } | null
}
